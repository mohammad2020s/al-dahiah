import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import "dotenv/config";
import { buildAlQasabSystemPrompt } from "./alQasabScope.ts";
import { PLACE_TOPICS } from "./alQasabKnowledge.ts";
import { createLimiter, clientIp } from "./rateLimit.ts";
import { voiceKeys, pauseVoice } from "./geminiFallback.ts";

export function setupLiveAudio(server: Server) {
  const wss = new WebSocketServer({ noServer: true });

  // Voice calls cost the most: at most 6 new calls per 10 minutes and 2 at once per visitor
  const callStartLimit = createLimiter({ windowMs: 10 * 60_000, max: 6 });
  const openCalls = new Map<string, number>();

  server.on("upgrade", (request, socket, head) => {
    socket.on("error", (err) => {
      console.warn("Socket error during upgrade:", err);
    });

    const pathname = new URL(request.url || "", `http://${request.headers.host || "localhost"}`).pathname;
    if (pathname === "/live") {
      const ip = clientIp(request);
      if ((openCalls.get(ip) || 0) >= 2 || !callStartLimit(ip).ok) {
        console.warn(`[Live Audio] Rate limited ${ip}`);
        socket.write("HTTP/1.1 429 Too Many Requests\r\nConnection: close\r\n\r\n");
        socket.destroy();
        return;
      }
      wss.handleUpgrade(request, socket, head, (ws) => {
        openCalls.set(ip, (openCalls.get(ip) || 0) + 1);
        ws.on("close", () => {
          const n = (openCalls.get(ip) || 1) - 1;
          if (n <= 0) openCalls.delete(ip);
          else openCalls.set(ip, n);
        });
        wss.emit("connection", ws, request);
      });
    }
  });

  wss.on("connection", async (clientWs: WebSocket, request: any) => {
    const reqUrl = new URL(request?.url || "", `http://${request?.headers?.host || "localhost"}`);
    const lang = reqUrl.searchParams.get("lang") === "en" ? "en" : "ar";
    console.log(`[Live Audio] Client connected (language: ${lang})`);

    // Free key first; the paid key (GEMINI_PAID_API_KEY) only if the free one is refused
    const keys = voiceKeys("live");
    if (keys.length === 0) {
      console.error("[Live Audio] No usable Gemini key (missing or quota used up)");
      clientWs.send(JSON.stringify({ error: lang === "en" ? "Voice calls are busy right now, please try again later or type your question." : "المكالمات الصوتية مشغولة الحين، جرّب بعد شوي أو اكتب سؤالك بالدردشة." }));
      clientWs.close();
      return;
    }

    // Bilingual prompt: the caller may switch language mid-call (English → English, Arabic → Najdi only)
    // In a call he can put a place on the caller's screen: show it first, then explain
    const placeList = PLACE_TOPICS.map((t) => `${t.id} = ${t.titleAr} / ${t.titleEn}`).join("\n");
    const systemInstruction = `${buildAlQasabSystemPrompt(undefined, "auto")}

VOICE CALL — PRONUNCIATION (critical — enforce on every word you say):
- «القَصَب»: القاف مفتوحة وزن فَعَل (fatha on ق then fatha on ص then sukoon on ب). Say "al-QA-sab" — never "al-qasab" with a neutral schwa or a kasra.
- «الجِفار»: ⚠️ تبدأ بحرف الجيم (J) لا القاف (Q/K). جِيم مكسورة ثم فاء ثم ألف ثم راء. Say "al-JI-far" — NEVER say "القفار" or "al-qafar". This word begins with ج not ق.
- «الصْبَخَة»: الصاد ساكنة (sukoon), الباء مفتوحة, الخاء مفتوحة. Say "aṣ-BAK-ha".
- «الوَشْم»: الواو مفتوحة, الشين ساكنة. Say "al-WASM" — short 'a' on the waaw, no kasra.
- «المَمْلَحَة»: مَمْلَحَة — فتحة على الميم الأولى, سكون على الميم الثانية, فتحة على اللام, فتحة على الحاء. Say "al-MAM-la-ḥa" (four syllables: MAM·la·ḥa). NEVER "المملِحة" or "المملُحة".

VOICE CALL — SHOWING PLACES ON THE CALLER'S SCREEN:
Whenever the caller asks about one of these Al-Qasab places, or you start explaining one, FIRST call the tool show_place with its id (their screen then shows its real photos, or an info card), THEN explain it like a tour guide in 2–4 short sentences from the guide knowledge, and offer to tell more. Call it once per place, not again while you keep talking about the same place.
Places:
${placeList}`;

    // Built once; sent on every connection attempt
    const setupMessage = {
      setup: {
        model: "models/gemini-3.8-live",
        // Text of what both sides say, so the call screen can show photos of the place being discussed
        inputAudioTranscription: {},
        outputAudioTranscription: {},
        tools: [
          {
            functionDeclarations: [
              {
                name: "show_place",
                description: "Show the caller photos or an info card of an Al-Qasab place on their call screen. Call it right before explaining that place.",
                parameters: {
                  type: "OBJECT",
                  properties: {
                    place_id: {
                      type: "STRING",
                      enum: PLACE_TOPICS.map((t) => t.id),
                      description: "Id of the place being discussed",
                    },
                  },
                  required: ["place_id"],
                },
              },
            ],
          },
        ],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: "Puck"
              }
            }
          }
        },
        systemInstruction: {
          parts: [{ text: systemInstruction }]
        },
        realtimeInputConfig: {
          automaticActivityDetection: {
            startOfSpeechSensitivity: "START_SENSITIVITY_LOW",
            endOfSpeechSensitivity: "END_SENSITIVITY_HIGH",
            silenceDurationMs: 500
          }
        }
      }
    };


    let geminiWs: WebSocket;
    let keyIndex = 0;
    let setupDone = false;
    let clientGone = false;

    const connect = () => {
      const { tier, key } = keys[keyIndex];
      // Official Gemini Live WebSocket endpoint
      const ws = new WebSocket(`wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${key}`);
      geminiWs = ws;

      ws.on("open", () => {
        console.log(`[Gemini Live] Connected (${tier} key), sending low-latency audio setup`);
        ws.send(JSON.stringify(setupMessage));
      });

      ws.on("message", (data) => {
        const text = data.toString();
        if (!setupDone && text.includes("setupComplete")) setupDone = true;
        if (clientWs.readyState === WebSocket.OPEN) clientWs.send(text);
      });

      ws.on("close", (code, reason) => {
        const why = reason.toString();
        console.log(`[Gemini Live] Gemini connection closed (${code}, ${tier} key):`, why);
        if (clientGone || ws !== geminiWs) return;
        // Refused before the call started (quota / key): pause this key and try the next one
        if (!setupDone && code !== 1000) {
          pauseVoice("live", tier, `${code} ${why}`);
          if (keyIndex + 1 < keys.length) {
            keyIndex++;
            console.warn(`[Gemini Live] Retrying the call with the ${keys[keyIndex].tier} key`);
            connect();
            return;
          }
        }
        if (clientWs.readyState === WebSocket.OPEN) clientWs.close();
      });

      ws.on("error", (err) => {
        console.error(`[Gemini Live] Gemini connection error (${tier} key):`, err.message);
        // A failed handshake is followed by "close", which handles the retry
      });
    };
    connect();

    // Forward client audio to Gemini in the exact realtimeInput format
    clientWs.on("message", (data) => {
      if (geminiWs.readyState !== WebSocket.OPEN) return;
      try {
        const text = data.toString();
        // Never log raw microphone payloads: they contain private user audio.
        geminiWs.send(text);
      } catch {
        geminiWs.send(data);
      }
    });

    clientWs.on("close", () => {
      clientGone = true;
      console.log("[Live Audio] Client disconnected");
      if (geminiWs.readyState === WebSocket.OPEN || geminiWs.readyState === WebSocket.CONNECTING) {
        geminiWs.close();
      }
    });

    clientWs.on("error", (err) => {
      console.warn("[Live Audio] Client WebSocket error:", err.message);
    });
  });
}
