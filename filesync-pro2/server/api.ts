import { Router, type Request, type Response } from "express";
import { GoogleGenAI, Modality } from "@google/genai";
import {
  buildAlQasabSystemPrompt,
  getOutOfScopeMessage,
  isAlQasabTopic,
  isLocationQuestion,
  isCafeQuestion,
  isDirectionsQuestion,
  isSmallTalk,
  isWeatherQuestion,
  getLocationForQuery,
  FESTIVAL_LOCATION,
  SALT_FLAT_LOCATION,
  SABKHA_LOCATION,
  HERITAGE_VILLAGE_LOCATION,
  IBN_ZAHIM_LOCATION,
  AL_MARQAB_LOCATION,
  CAFES_LOCATION,
  BDOR_COFFEE_LOCATION,
  SHAHI_NAGEA_LOCATION,
  ART_COFFEE_LOCATION,
  DIWANIYAT_AL_MANIE_LOCATION,
  AL_QASAB_LANDMARKS,
  AL_QASAB_ROUTES,
  applyNajdiPhoneticDiacritics,
  normalizeCityName,
  cleanText,
  isPureSalamGreeting,
  isSalamMessage,
  getInstantSalamReply,
  generateLocalKnowledgeFallback,
  isFamilyOrTribalQuestion,
  FORBIDDEN_FAMILY_REPLY_AR,
  FORBIDDEN_FAMILY_REPLY_EN,
} from "./alQasabScope.ts";
import { fetchAlQasabWeather } from "./weather.ts";

export const apiRouter = Router();

apiRouter.get("/maps/config", (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.json({ apiKey: process.env.GOOGLE_MAPS_API_KEY?.trim() || null });
});

apiRouter.get("/weather", async (_req, res) => {
  try {
    const weather = await fetchAlQasabWeather();
    res.json(weather);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.get("/location", (req, res) => {
  const type = req.query.type as string;
  if (type === "bdor_coffee") return res.json(BDOR_COFFEE_LOCATION);
  if (type === "shahi_nagea") return res.json(SHAHI_NAGEA_LOCATION);
  if (type === "art_coffee") return res.json(ART_COFFEE_LOCATION);
  if (type === "diwaniyat_al_manie") return res.json(DIWANIYAT_AL_MANIE_LOCATION);
  if (type === "cafes") return res.json(CAFES_LOCATION);
  if (type === "salt_flat") return res.json(SALT_FLAT_LOCATION);
  if (type === "sabkha") return res.json(SABKHA_LOCATION);
  if (type === "heritage_village") return res.json(HERITAGE_VILLAGE_LOCATION);
  if (type === "ibn_zahim") return res.json(IBN_ZAHIM_LOCATION);
  if (type === "al_marqab") return res.json(AL_MARQAB_LOCATION);
  return res.json(FESTIVAL_LOCATION);
});

apiRouter.get("/landmarks", (_req, res) => {
  res.json(AL_QASAB_LANDMARKS);
});

apiRouter.get("/routes", (_req, res) => {
  res.json(AL_QASAB_ROUTES);
});

apiRouter.post("/chat/stream", async (req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  let clientDisconnected = false;
  res.on("close", () => {
    if (!res.writableEnded) {
      clientDisconnected = true;
    }
  });

  const sendEvent = (data: Record<string, unknown>) => {
    if (res.writableEnded || res.destroyed) return;
    try {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
      if (typeof (res as any).flush === "function") {
        (res as any).flush();
      }
    } catch {
      // stream closed
    }
  };

  const requestStartTime = Date.now();
  try {
    // Correct «القصيب» → «القَصَب» before anything (guards, Gemini) sees the message
    const userPrompt = normalizeCityName((req.body?.message || "").trim());
    const rawHistory = Array.isArray(req.body?.history) ? req.body.history : [];
    const requestedLang = req.body?.language || "ar";

    if (!userPrompt) {
      sendEvent({ type: "error", message: "Message is required" });
      res.end();
      return;
    }

    const hasArabic = /[\u0600-\u06FF]/.test(userPrompt);
    const hasEnglish = /[A-Za-z]/.test(userPrompt);
    const lang: "ar" | "en" = hasArabic ? "ar" : hasEnglish ? "en" : requestedLang;

    // Fast-path: Instant Salam greeting
    if (isPureSalamGreeting(userPrompt, lang)) {
      const instantAnswer = getInstantSalamReply(lang);
      sendEvent({ type: "chunk", content: instantAnswer });
      sendEvent({
        type: "done",
        answer: instantAnswer,
        guarded: false,
        showMap: false,
        locationData: null,
        weather: null,
      });
      res.end();
      return;
    }

    // Strict Red Line: حظر ذكر العوائل والقبائل نهائياً
    if (isFamilyOrTribalQuestion(userPrompt)) {
      const familyAnswer = lang === "en" ? FORBIDDEN_FAMILY_REPLY_EN : FORBIDDEN_FAMILY_REPLY_AR;
      sendEvent({ type: "chunk", content: familyAnswer });
      sendEvent({
        type: "done",
        answer: familyAnswer,
        guarded: true,
        showMap: false,
        locationData: null,
        weather: null,
      });
      res.end();
      return;
    }

    // Out-of-scope check
    const recentMessages = rawHistory
      .filter((turn: { content?: string }) => turn?.content && typeof turn.content === "string")
      .slice(-8)
      .map((turn: { content: string }) => turn.content);

    if (!isSmallTalk(userPrompt) && !isAlQasabTopic(userPrompt, recentMessages)) {
      const outOfScopeAnswer = getOutOfScopeMessage(lang);
      sendEvent({ type: "chunk", content: outOfScopeAnswer });
      sendEvent({
        type: "done",
        answer: outOfScopeAnswer,
        guarded: true,
        showMap: false,
        locationData: null,
        weather: null,
      });
      res.end();
      return;
    }

    // Fast-path: Weather question
    const isWeather = isWeatherQuestion(userPrompt);
    if (isWeather) {
      const weatherData = await fetchAlQasabWeather();
      const weatherText = generateLocalKnowledgeFallback(userPrompt, lang, weatherData?.summaryText);
      let finalAnswer = lang === "ar" ? applyNajdiPhoneticDiacritics(weatherText) : weatherText;
      finalAnswer = cleanText(finalAnswer);
      const words = finalAnswer.split(" ");
      for (let i = 0; i < words.length; i += 3) {
        if (clientDisconnected) break;
        const piece = words.slice(i, i + 3).join(" ") + (i + 3 < words.length ? " " : "");
        sendEvent({ type: "chunk", content: piece });
        await new Promise(resolve => setTimeout(resolve, 20));
      }
      if (!res.writableEnded && !res.destroyed) {
        sendEvent({
          type: "done",
          answer: finalAnswer,
          guarded: false,
          showMap: false,
          locationData: null,
          weather: weatherData,
        });
        res.end();
      }
      return;
    }

    // Stream from Gemini
    const apiKey = process.env.GEMINI_API_KEY;
    let rawAnswer = "";
    if (apiKey) {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
      const systemPrompt = buildAlQasabSystemPrompt(undefined, lang);
      const contents: any[] = [];
      for (const turn of rawHistory.slice(-4)) {
        if (turn?.content) {
          contents.push({
            role: turn.role === "assistant" ? "model" : "user",
            parts: [{ text: normalizeCityName(turn.content) }],
          });
        }
      }
      contents.push({
        role: "user",
        parts: [{ text: userPrompt }],
      });

      try {
        const stream = await ai.models.generateContentStream({
          model: "gemini-3.8-flash",
          contents,
          config: {
            systemInstruction: systemPrompt,
            maxOutputTokens: 400,
          },
        });

        for await (const chunk of stream) {
          if (clientDisconnected) break;
          const chunkText = chunk.text;
          if (chunkText) {
            rawAnswer += chunkText;
            sendEvent({ type: "chunk", content: chunkText });
          }
        }
      } catch (err: any) {
        console.warn("[Chat Stream] Gemini call failed, using fallback:", err?.message || err);
      }
    }

    if (!rawAnswer || rawAnswer.trim().length === 0) {
      const fallbackText = generateLocalKnowledgeFallback(userPrompt, lang);
      rawAnswer = fallbackText;
      const words = fallbackText.split(" ");
      for (let i = 0; i < words.length; i += 3) {
        if (clientDisconnected) break;
        const piece = words.slice(i, i + 3).join(" ") + (i + 3 < words.length ? " " : "");
        sendEvent({ type: "chunk", content: piece });
        await new Promise(resolve => setTimeout(resolve, 15));
      }
    }

    let finalAnswer = lang === "ar" ? applyNajdiPhoneticDiacritics(rawAnswer) : normalizeCityName(rawAnswer);
    finalAnswer = cleanText(finalAnswer);

    if (isSalamMessage(userPrompt)) {
      if (lang === "ar") {
        if (!finalAnswer.startsWith("وعليكم السلام") && !finalAnswer.includes("السلام عليكم")) {
          finalAnswer = `وعليكم السلام ورحمة الله وبركاته.. ${finalAnswer}`;
        }
      }
    }

    const showMap =
      isLocationQuestion(userPrompt) ||
      isCafeQuestion(userPrompt) ||
      isDirectionsQuestion(userPrompt) ||
      isLocationQuestion(finalAnswer) ||
      isCafeQuestion(finalAnswer);

    const locationData = showMap ? getLocationForQuery(userPrompt, finalAnswer) : null;
    const totalResponseTimeMs = Date.now() - requestStartTime;

    if (!res.writableEnded && !res.destroyed) {
      sendEvent({
        type: "done",
        answer: finalAnswer,
        guarded: false,
        showMap,
        locationData,
        weather: null,
        responseTimeMs: totalResponseTimeMs,
      });
      res.end();
    }
  } catch (err: any) {
    console.error("[Chat Stream] Error:", err?.message || err);
    if (!res.writableEnded && !res.destroyed) {
      sendEvent({ type: "error", message: "حدث خطأ غير متوقع." });
      res.end();
    }
  }
});

apiRouter.post("/speak", async (req: Request, res: Response) => {
  const text = req.body?.text;
  if (!text) return res.status(400).json({ error: "Text is required" });
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "GEMINI_API_KEY is missing" });

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      // Same Najdi corrections as the chat («القَصَب», «الصْبخة») so the voice says them right
      contents: [{ parts: [{ text: applyNajdiPhoneticDiacritics(String(text)).slice(0, 400) }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: "Charon" },
          },
        },
      },
    });

    const audioPart = response.candidates?.[0]?.content?.parts?.find(
      (p: any) => p.inlineData?.mimeType?.startsWith("audio/")
    );

    if (audioPart?.inlineData?.data) {
      return res.json({
        audio: audioPart.inlineData.data,
        mimeType: audioPart.inlineData.mimeType,
      });
    }

    return res.status(500).json({ error: "Failed to generate audio" });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "TTS error" });
  }
});
