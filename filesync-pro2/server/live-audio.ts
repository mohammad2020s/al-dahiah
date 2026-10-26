import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import "dotenv/config";
import { buildAlQasabSystemPrompt } from "./alQasabScope.ts";
import { createLimiter, clientIp } from "./rateLimit.ts";

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

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("[Live Audio] GEMINI_API_KEY is missing");
      clientWs.send(JSON.stringify({ error: lang === "en" ? "API key not available." : "مفتاح API غير متوفر." }));
      clientWs.close();
      return;
    }

    // Bilingual prompt: the caller may switch language mid-call (English → English, Arabic → Najdi only)
    const systemInstruction = buildAlQasabSystemPrompt(undefined, "auto");

    // Official Gemini Live WebSocket endpoint
    const geminiWsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${apiKey}`;
    const geminiWs = new WebSocket(geminiWsUrl);


    geminiWs.on("open", () => {
      console.log("[Gemini Live] Connected to Gemini Live WebSocket API endpoint");

      const setupMessage = {
        setup: {
          model: "models/gemini-3.8-live",
          // Text of what both sides say, so the call screen can show photos of the place being discussed
          inputAudioTranscription: {},
          outputAudioTranscription: {},
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

      console.log("[Gemini Live] Sending low-latency audio setup");
      geminiWs.send(JSON.stringify(setupMessage));
    });

    geminiWs.on("message", (data) => {
      const text = data.toString();
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(text);
      }
    });

    geminiWs.on("close", (code, reason) => {
      console.log(`[Gemini Live] Gemini connection closed (${code}):`, reason.toString());
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.close();
      }
    });

    geminiWs.on("error", (err) => {
      console.error("[Gemini Live] Gemini connection error:", err.message);
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify({ error: "Gemini connection error: " + err.message }));
      }
    });

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
