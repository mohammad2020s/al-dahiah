import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import "dotenv/config";
import { buildAlQasabSystemPrompt, PRONUNCIATION_GUIDE } from "./alQasabScope.ts";
import { QASAB_FILE_FULL } from "./qasabFile.ts";
import { PLACE_TOPICS } from "./alQasabKnowledge.ts";
import { createLimiter, clientIp } from "./rateLimit.ts";
import { voiceKeys, pauseVoice } from "./geminiFallback.ts";

// The call's instructions (also used by the pronunciation lab). Pronunciation first (models follow
// the start of the instructions most closely) and a reminder at the end.
export function liveSystemInstruction(): string {
  const placeList = PLACE_TOPICS.map((t) => `${t.id} = ${t.titleAr} / ${t.titleEn}`).join("\n");
  return `مكالمة صوتية — اقرأ هذا أول شي.
${PRONUNCIATION_GUIDE}

${buildAlQasabSystemPrompt(undefined, "auto")}

OFFICIAL SALT SEASON FILE (verified; it overrides anything above that disagrees). Use its facts, names, dates, numbers, poems and proverbs exactly as written when the caller asks; keep spoken answers short and offer more:
${QASAB_FILE_FULL}

VOICE CALL — SHOWING PLACES ON THE CALLER'S SCREEN:
Whenever the caller asks about one of these Al-Qasab places, or you start explaining one, FIRST call the tool show_place with its id (their screen then shows its real photos, or an info card), THEN explain it like a tour guide in 2–4 short sentences from the guide knowledge, and offer to tell more. Call it once per place, not again while you keep talking about the same place.
Places:
${placeList}

صوت المكالمة: المتصل يشوف على الشاشة شايب نجدي من أهل القْصَب، وهو أنت. امشِ على «قواعد اللهجة الثابتة» و«النطق النجدي بالأصوات» فوق بالحرف: نفس الصوت الهادي الدافي ونفس العبارات كل مرة، بدون اجتهاد. بالعربي نجدي بس، وبالإنجليزي إنجليزي بسيط ودود.

اسم البلد بصوتك (قاعدة صارمة): لا تنطق اسم البلد بصوتك أبداً في المكالمة، لأن الصوت ما يطلع صح. بداله قل «ديرتنا» أو «البلد» أو «هالديرة» دايماً: «حيّاك الله في ديرتنا»، «مملحة ديرتنا»، «موسم ملح ديرتنا». ولو سألك المتصل وش اسمها، قل: «ديرتنا مكتوب اسمها عندك فوق الشاشة، وهي في الوشم».

القاعدة صفر مرة ثانية (فوق كل شي): لا تقول اسم البلد بصوتك أبداً، قل «ديرتنا» أو «البلد». و«الصْبَخَة» = «اِصْبَخَة»؛ غلط: «الصَّبْخة».
تذكير أخير قبل كل جملة: الجيم معطّشة «ج»، والقاف في الكلام العادي «گ» نجدية (گال، گَهْوة) إلا «القْصَب» بقاف فصيحة، والثاء والذال بأصواتها، والكلام قصير ومقطّع، والنبرة واطية ثابتة تنزل آخر الجملة، والراء مفخّمة مع الفتحة والضمة ومرقّقة مع الكسرة والياء. أبداً مو لهجة مصرية.`;
}

// Variants tried by the owner from the browser before one is made the default
const LAB_VARIANTS: Record<string, string> = {
  li: "\n\nاسم البلد بصوتك: انطقه كأنه مكتوب «إلْقِصْبْ» بسرعة: لام ساكنة ثم قاف بدون أي فتحة بعدها، وتلتصق القاف بالصاد، والفتحة الوحيدة قصيرة على الصاد: «اِلْ-قْصَبْ». أبداً لا تقول «قَـ» بعد اللام.",
  sbakha: "\n\nاسم البلد بصوتك يجي على نفس وزن «الصْبَخَة» و«الجْمَل» و«الكْتاب» في نطق أهل نجد: الحرف الأول ساكن ملزوق بالثاني. «القْصَبْ» = «اِلقْصَبْ»، مثل ما تقول «اِلصْبَخَة».",
  never: "\n\nقاعدة صوتية للاسم: بين القاف والصاد في «القْصَبْ» ما فيه أي صوت حركة أبداً، لا فتحة ولا كسرة ولا ضمة. لو حسّيت إنك بتقول «قَصَب» وقف وقلها «قْصَب».",
};

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
    // Owner-only voice test (?voice=…&key=STATS_KEY); visitors always get the default voice
    const ownerKey = process.env.STATS_KEY || "";
    const testVoice =
      ownerKey && reqUrl.searchParams.get("key") === ownerKey && /^[A-Z][a-z]{2,15}$/.test(reqUrl.searchParams.get("voice") || "")
        ? String(reqUrl.searchParams.get("voice"))
        : "";
    // Charon: in recorded tests it said «القْصَب» with two short syllables, where Puck often stretched it to «القصّاب»
    const voiceName = testVoice || process.env.LIVE_VOICE || "Charon";
    // Owner-only pronunciation variants (?variant=…&key=STATS_KEY): extra lines appended to the instructions
    const variantId = ownerKey && reqUrl.searchParams.get("key") === ownerKey ? reqUrl.searchParams.get("variant") || "" : "";

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
    const systemInstruction = liveSystemInstruction() + (LAB_VARIANTS[variantId] || "");

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
          // Calmer sampling: names come out the same way every time
          // Low: the same words and the same accent every call
          temperature: 0.2,
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName
              }
            }
          }
        },
        systemInstruction: {
          parts: [{ text: systemInstruction }]
        },
        // A text transcript of what the guide says, so the logs show how it said the place names
        outputAudioTranscription: {},
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

    // Collects the transcript of each spoken answer; logs it, flagging the known wrong forms
    let said = "";
    const logSpokenNames = (raw: string) => {
      if (!raw.includes("outputTranscription") && !raw.includes("turnComplete")) return;
      try {
        const msg = JSON.parse(raw);
        const piece = msg?.serverContent?.outputTranscription?.text;
        if (piece) said += piece;
        if (msg?.serverContent?.turnComplete && said.trim()) {
          const wrong = /قص[ّ]?ا ?ب|قصّ|صَّبْخ|صبْخ|qass?aa?b|sabkha/i.test(said);
          if (/قص|صبخ|qasab|sbakha|sabkha/i.test(said)) {
            console.log(`[Gemini Live] said${wrong ? " (CHECK PRONUNCIATION)" : ""}: ${said.replace(/\s+/g, " ").slice(0, 300)}`);
          }
          said = "";
        }
      } catch {
        /* binary/partial frame */
      }
    };

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
        logSpokenNames(text);
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
