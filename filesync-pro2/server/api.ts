import { Router, type Request, type Response } from "express";
import { GoogleGenAI, Modality } from "@google/genai";
import { fileContextFor } from "./qasabFile.ts";
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
  ALL_PLACES_LOCATION,
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
import { fetchAlQasabWeather, weatherSummaryEn } from "./weather.ts";
import { rateLimitMiddleware } from "./rateLimit.ts";
import { getPlaceImages, getPlaceLocation, getPlaceMapsUrl, matchPlaceTopic, GREETING_OPTIONS, SALAM_PREFIX_AR, SALAM_PREFIX_EN } from "./alQasabKnowledge.ts";
import { recordQuestion, getQuestionStats } from "./questionStats.ts";
import { getFollowUps, followUpTopic } from "./followUps.ts";
import { stopForCode, stopsWithCodes } from "./passportCodes.ts";
import { availableChatEngines, streamChatWithFallback, voiceKeys, pauseVoice, type Engine } from "./geminiFallback.ts";
import { timingSafeEqual } from "node:crypto";

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

/** Owner pages (stats, stamp signs): the request must carry STATS_KEY. Answers itself when it doesn't. */
function ownerOnly(req: Request, res: Response): boolean {
  const expected = process.env.STATS_KEY || "";
  const given = String(req.query.key || req.headers["x-stats-key"] || "");
  const ok =
    expected.length > 0 &&
    given.length === expected.length &&
    timingSafeEqual(Buffer.from(given), Buffer.from(expected));
  if (!ok) res.status(expected ? 401 : 404).json({ error: expected ? "Wrong key" : "Owner pages are disabled" });
  return ok;
}

// «جواز الملح»: a scanned QR code → which stop it stamps (codes never reach the page's JS)
const stampLimit = rateLimitMiddleware({
  windowMs: 60_000,
  max: 20,
  messageAr: "محاولات كثيرة، انتظر دقيقة.",
  messageEn: "Too many tries, please wait a minute.",
});
apiRouter.get("/passport/stamp", stampLimit, (req, res) => {
  const stop = stopForCode(String(req.query.code || ""));
  if (!stop) return res.status(404).json({ error: "Unknown code" });
  res.json({ id: stop.id });
});

// Owner: codes for the printable QR signs at /stamps
apiRouter.get("/passport/codes", (req, res) => {
  if (!ownerOnly(req, res)) return;
  res.setHeader("Cache-Control", "no-store");
  res.json({ stops: stopsWithCodes() });
});

// Owner-only question stats. Disabled unless STATS_KEY is set on the server.
apiRouter.get("/stats", async (req, res) => {
  if (!ownerOnly(req, res)) return;
  res.setHeader("Cache-Control", "no-store");
  res.json(await getQuestionStats(Math.min(Number(req.query.limit) || 50, 200)));
});

apiRouter.get("/landmarks", (_req, res) => {
  res.json(AL_QASAB_LANDMARKS);
});

apiRouter.get("/routes", (_req, res) => {
  res.json(AL_QASAB_ROUTES);
});

// Per-visitor limits so a script can't drain the Gemini key
const chatLimit = rateLimitMiddleware({
  windowMs: 60_000,
  max: 30,
  messageAr: "شوي شوي علينا يا الغالي 😅 أرسلت رسايل كثير، انتظر دقيقة وكمّل سوالفك.",
  messageEn: "You're sending messages too quickly. Please wait a minute and try again.",
});
const speakLimit = rateLimitMiddleware({
  windowMs: 60_000,
  max: 20,
  messageAr: "طلبات الاستماع كثيرة، انتظر دقيقة.",
  messageEn: "Too many listen requests. Please wait a minute.",
});

apiRouter.post("/chat/stream", chatLimit, async (req: Request, res: Response) => {
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
    // «صوّر واسأل»: an optional photo (JPEG/PNG/WebP, base64) sent with the question
    const rawImage = req.body?.image;
    const photo =
      rawImage &&
      typeof rawImage.data === "string" &&
      /^image\/(jpeg|png|webp)$/.test(String(rawImage.mimeType)) &&
      rawImage.data.length < 6_000_000 &&
      /^[A-Za-z0-9+/=]+$/.test(rawImage.data.slice(0, 200))
        ? { mimeType: String(rawImage.mimeType), data: rawImage.data as string }
        : null;
    const requestedLang = req.body?.language || "ar";
    const userPrompt = normalizeCityName(
      (req.body?.message || "").trim() || (photo ? (requestedLang === "en" ? "What is this place?" : "وش هذا المكان؟") : "")
    );
    const rawHistory = Array.isArray(req.body?.history) ? req.body.history : [];

    if (!userPrompt) {
      sendEvent({ type: "error", message: "Message is required" });
      res.end();
      return;
    }

    const hasArabic = /[\u0600-\u06FF]/.test(userPrompt);
    const hasEnglish = /[A-Za-z]/.test(userPrompt);
    const lang: "ar" | "en" = hasArabic ? "ar" : hasEnglish ? "en" : requestedLang;

    // Fast-path: Instant Salam greeting
    if (!photo && isPureSalamGreeting(userPrompt, lang)) {
      const instantAnswer = getInstantSalamReply(lang, userPrompt);
      recordQuestion(userPrompt, "greeting", null, lang);
      sendEvent({ type: "chunk", content: instantAnswer });
      sendEvent({
        type: "done",
        answer: instantAnswer,
        guarded: false,
        showMap: false,
        locationData: null,
        weather: null,
        // The three options from the greeting, as buttons
        followUps: GREETING_OPTIONS[lang],
      });
      res.end();
      return;
    }

    // Strict Red Line: حظر ذكر العوائل والقبائل نهائياً
    if (isFamilyOrTribalQuestion(userPrompt)) {
      const familyAnswer = lang === "en" ? FORBIDDEN_FAMILY_REPLY_EN : FORBIDDEN_FAMILY_REPLY_AR;
      recordQuestion(userPrompt, "family", null, lang);
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

    if (!photo && !isSmallTalk(userPrompt) && !isAlQasabTopic(userPrompt, recentMessages)) {
      const outOfScopeAnswer = getOutOfScopeMessage(lang);
      recordQuestion(userPrompt, "out_of_scope", null, lang);
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
    const isWeather = !photo && isWeatherQuestion(userPrompt);
    if (isWeather) {
      recordQuestion(userPrompt, "weather", "weather", lang);
      const weatherData = await fetchAlQasabWeather();
      const weatherText = generateLocalKnowledgeFallback(
        userPrompt,
        lang,
        lang === "en" ? weatherSummaryEn(weatherData) : weatherData?.summaryText
      );
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
          followUps: getFollowUps(userPrompt, lang, "weather"),
        });
        res.end();
      }
      return;
    }

    // Stream from Gemini: free models first, then the paid key (see geminiFallback.ts)
    let rawAnswer = "";
    let usedFallback = false;
    let answeredBy: Engine | null = null;
    if (availableChatEngines().length > 0) {
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
        parts: photo
          ? [
              { inlineData: { mimeType: photo.mimeType, data: photo.data } },
              {
                text:
                  (lang === "en"
                    ? "[The visitor sent this photo from Al-Qasab. Use the visual guide to Al-Qasab; name a landmark only if the signs are clear, otherwise say what you see and that you are not sure.] "
                    : "[الزائر أرسل هذي الصورة. استخدم دليل التعرف على معالم القَصَب، ولا تسمّي معلَم إلا إذا العلامات واضحة، وإذا مو متأكد قلها بصراحة.] ") + userPrompt,
              },
            ]
          : [{ text: userPrompt }],
      });

      const result = await streamChatWithFallback({
        contents,
        systemInstruction: withFileContext(buildAlQasabSystemPrompt(undefined, lang), userPrompt, rawHistory),
        // A poem or a list from the season file (teachers, stations) needs more room than a short answer
        maxOutputTokens: /قصيد|قصايد|قصائد|ابيات|أبيات|شعر|poem|معلم|محطات|امثال|أمثال/i.test(userPrompt) ? 900 : 400,
        // Never leave the visitor waiting longer than this. Each model gets 7 s to start
        // (a photo takes the models longer to look at: 15 s each, 35 s in all)
        budgetMs: photo ? 35_000 : 20_000,
        firstWordMs: photo ? 15_000 : undefined,
        onChunk: (t) => sendEvent({ type: "chunk", content: t }),
        isCancelled: () => clientDisconnected,
      });
      rawAnswer = result.text;
      answeredBy = result.engine;
    }

    if (!rawAnswer || rawAnswer.trim().length === 0) {
      usedFallback = true;
      const fallbackText = photo
        ? lang === "en"
          ? "I couldn't look at the photo right now. Tell me the name of the place, or ask me about the salt pans, Al-Sabkha, Al-Zahim palace or the old town."
          : "اعذرني يا الغالي، ما قدرت أشوف الصورة الحين. قل لي وش اسم المكان، أو اسألني عن الممالح أو الصْبَخَة أو قصر الزاحم أو البلدة القديمة وأبشر."
        : generateLocalKnowledgeFallback(userPrompt, lang);
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

    // Opened with «السلام عليكم»: answer the greeting first, like a host welcoming a guest
    if (isSalamMessage(userPrompt) && !/^\s*(وعليكم السلام|wa alaykum|wa alaikum)/i.test(finalAnswer)) {
      finalAnswer = `${lang === "en" ? SALAM_PREFIX_EN : SALAM_PREFIX_AR} ${finalAnswer}`;
    }

    // Stats: a local answer that fell through to the generic welcome means we had no answer
    const isGenericWelcome =
      usedFallback && /مرشدك السياحي في ديرتنا|^Welcome to Al-Qasab! I am/.test(rawAnswer);
    recordQuestion(
      photo ? `(صورة) ${userPrompt}` : userPrompt,
      isGenericWelcome ? "unanswered" : usedFallback ? "local" : "gemini",
      matchPlaceTopic(userPrompt)?.id || (isCafeQuestion(userPrompt) ? "cafes" : null),
      lang,
      answeredBy ? `${answeredBy.tier}:${answeredBy.model}` : usedFallback ? "local" : null
    );

    // Real photos of the place being asked about (e.g. the salt pans), shown as a gallery under the answer.
    // For a visitor's photo the place comes from what the guide recognised in it.
    const placeText = photo ? (usedFallback ? "" : finalAnswer) : userPrompt;
    const images = getPlaceImages(placeText, lang);
    const mapsUrl = getPlaceMapsUrl(placeText);

    const topicId = photo ? null : matchPlaceTopic(userPrompt)?.id;
    const allPlacesMap =
      topicId === "tourist_places" || (topicId === "heritage_places" && isLocationQuestion(userPrompt));
    const showMap = allPlacesMap || !photo && (
      isLocationQuestion(userPrompt) ||
      isCafeQuestion(userPrompt) ||
      isDirectionsQuestion(userPrompt) ||
      // Look at the answer text only for real Gemini answers (the canned welcome mentions cafes)
      (!usedFallback && (isLocationQuestion(finalAnswer) || isCafeQuestion(finalAnswer))));

    const locationData = allPlacesMap
      ? ALL_PLACES_LOCATION
      : showMap
        ? getPlaceLocation(userPrompt, lang) || getLocationForQuery(userPrompt, finalAnswer)
        : null;
    const totalResponseTimeMs = Date.now() - requestStartTime;

    if (!res.writableEnded && !res.destroyed) {
      sendEvent({
        type: "done",
        answer: finalAnswer,
        guarded: false,
        showMap,
        locationData,
        weather: null,
        images,
        mapsUrl,
        followUps: getFollowUps(
          userPrompt,
          lang,
          photo ? (placeText && followUpTopic(placeText) !== "other" ? followUpTopic(placeText) : "photo") : undefined
        ),
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

/** Adds the official season-file sections this question (or the previous one) is about. */
function withFileContext(system: string, question: string, history: any[]): string {
  const previous = [...history].reverse().find((t: any) => t?.role !== "assistant" && t?.content)?.content || "";
  const context = fileContextFor(question, String(previous));
  if (!context) return system;
  return `${system}

OFFICIAL SALT SEASON FILE — sections relevant to this question (from the season's verified information file; this overrides anything above that disagrees). Answer from it: use its facts, names, dates, numbers, poems and proverbs exactly as written (poems word for word), in the visitor's language/dialect. When the visitor asks for a poem, verses, a list of names or the season stations, give it in full even if longer than the usual 1–3 sentences:
${context}`;
}

/**
 * Gemini TTS takes "director's notes" before the transcript. Only the notes for words that are
 * in the text are added, so a short answer stays a short prompt. The notes are not read aloud.
 */
export function buildSpeechPrompt(transcript: string): string {
  const plain = transcript.replace(/[ً-ٰٟ]/g, "");
  const notes: string[] = [];
  if (/قصب/.test(plain)) {
    notes.push(
      `«القَصَب» is "al-qasab": two short syllables qa·sab, like «ذَهَب» (dha·hab), with a deep Arabic ق. Never «القصّاب» / "al-qassab" / "al-qasaab".`
    );
  }
  if (/صبخ/.test(plain)) {
    notes.push(
      `«الصْبَخَة» is "aṣ-ṣbakha" (iṣ·ba·kha): no vowel on ص, the vowel comes after ب. Never «الصَّبْخة» / "aṣ-ṣabkha".`
    );
  }
  if (/جفار/.test(plain)) notes.push(`«الجِفار» is "al-jifar" with ج.`);
  if (/مملح/.test(plain)) notes.push(`«المَمْلَحَة» is "al-mamlaha".`);
  if (!notes.length) return transcript;
  return [
    "Read the transcript aloud in a warm, calm Saudi Najdi voice. Pronunciation of place names:",
    ...notes.map((n) => `- ${n}`),
    "",
    "#### TRANSCRIPT",
    transcript,
  ].join("\n");
}

apiRouter.post("/speak", speakLimit, async (req: Request, res: Response) => {
  const text = req.body?.text;
  if (!text) return res.status(400).json({ error: "Text is required" });
  const keys = voiceKeys("tts");
  if (keys.length === 0) return res.status(503).json({ error: "Speech is unavailable right now" });

  let lastError = "TTS error";
  // Free key first; if its speech quota is used up, the paid key (when set)
  for (const { tier, key } of keys) {
    try {
      const ai = new GoogleGenAI({ apiKey: key, httpOptions: { headers: { "User-Agent": "aistudio-build" } } });
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-tts-preview",
        // Same Najdi corrections as the chat («القَصَب», «الصْبَخَة», «المَمْلَحَة») so the voice says them right
        contents: [{ parts: [{ text: buildSpeechPrompt(applyNajdiPhoneticDiacritics(String(text)).slice(0, 400)) }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Charon" } } },
        },
      });
      const audioPart = response.candidates?.[0]?.content?.parts?.find(
        (p: any) => p.inlineData?.mimeType?.startsWith("audio/")
      );
      if (audioPart?.inlineData?.data) {
        return res.json({ audio: audioPart.inlineData.data, mimeType: audioPart.inlineData.mimeType });
      }
      lastError = "Failed to generate audio";
    } catch (err: any) {
      lastError = String(err?.message || err);
      pauseVoice("tts", tier, lastError);
    }
  }
  return res.status(500).json({ error: lastError.slice(0, 200) });
});
