import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import "dotenv/config";
import { buildAlQasabSystemPrompt } from "./alQasabScope.ts";

export function setupLiveAudio(server: Server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request, socket, head) => {
    socket.on("error", (err) => {
      console.warn("Socket error during upgrade:", err);
    });

    const pathname = new URL(request.url || "", `http://${request.headers.host || "localhost"}`).pathname;
    if (pathname === "/live") {
      wss.handleUpgrade(request, socket, head, (ws) => {
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

    const systemInstruction = buildAlQasabSystemPrompt(undefined, lang);

    // Official Gemini Live WebSocket endpoint
    const geminiWsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${apiKey}`;
    const geminiWs = new WebSocket(geminiWsUrl);


    geminiWs.on("open", () => {
      console.log("[Gemini Live] Connected to Gemini Live WebSocket API endpoint");

      const setupMessage = {
        setup: {
          model: "models/gemini-3.8-live",
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
