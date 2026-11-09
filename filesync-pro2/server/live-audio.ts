import { buildAlQasabSystemPrompt, PRONUNCIATION_GUIDE, applyNajdiPhoneticDiacritics } from "./alQasabScope.ts";
import { GoogleGenAI, Modality } from "@google/genai";
import { buildSpeechPrompt } from "./api.ts";
import { najdify } from "./najdiStyle.ts";
import { QASAB_FILE_INDEX, fileContextFor } from "./qasabFile.ts";
import { teach, spokenForm, applyTaught } from "./pronMemory.ts";
import { speakableTownName } from "./najdiStyle.ts";
import { PLACE_TOPICS } from "./alQasabKnowledge.ts";
import { voiceKeys, pauseVoice } from "./geminiFallback.ts";

// The call's instructions (also used by the pronunciation lab). Pronunciation first (models follow
// the start of the instructions most closely) and a reminder at the end.
export function liveSystemInstruction(lang: "ar" | "en" = "ar"): string {
  const placeList = PLACE_TOPICS.map((t) => `${t.id} = ${t.titleAr} / ${t.titleEn}`).join("\n");
  // Arabic call: the whole brief in Arabic so the voice thinks, and speaks, in Najdi Arabic (the English
  // brief made it answer in English: «Welcome to Al-Qasab!»)
  const langLock =
    lang === "en"
      ? "LANGUAGE: the caller chose English. Answer in simple, warm English. If they speak Arabic, answer in Najdi Arabic."
      : "اللغة (قاعدة صارمة جداً): تكلّم بالعربي باللهجة النجدية القصبية بس، من أول كلمة لآخر كلمة. ممنوع تتكلم إنجليزي أبداً، حتى الترحيب وحتى اسمك واسم البلد (لا «Welcome» ولا «Al-Qasab» ولا «Al-Dahiya»). ما تتكلم إنجليزي إلا إذا المتصل نفسه تكلّم جملة إنجليزية كاملة.";
  return `${langLock}

مكالمة صوتية — اقرأ هذا أول شي. ردودك في المكالمة قصيرة: جملتين أو ثلاث، وبعدها اسأل المتصل.

${buildAlQasabSystemPrompt(undefined, lang)}

OFFICIAL SALT SEASON FILE: the details (poems, poets, proverbs, people, dates, numbers, season stations, events, history) are NOT written here. When the caller asks for something like that, call the tool lookup_info with a short Arabic query FIRST, then answer from what it returns (it is verified and overrides anything above). Its sections:
${QASAB_FILE_INDEX}

VOICE CALL — SHOWING PLACES ON THE CALLER'S SCREEN:
Whenever the caller asks about one of these Al-Qasab places, or you start explaining one, FIRST call the tool show_place with its id (their screen then shows its real photos, or an info card), THEN explain it like a tour guide in 2–4 short sentences from the guide knowledge, and offer to tell more. Call it once per place, not again while you keep talking about the same place.
Places:
${placeList}

صوت المكالمة: المتصل يشوف على الشاشة شايب نجدي من أهل القْصَب، وهو أنت. امشِ على «قواعد اللهجة الثابتة» و«النطق النجدي بالأصوات» فوق بالحرف: نفس الصوت الهادي الدافي ونفس العبارات كل مرة، بدون اجتهاد. بالعربي نجدي بس، وبالإنجليزي إنجليزي بسيط ودود.

تعلّم النطق من المتصل: إذا صحّح لك المتصل نطق كلمة أو قالها بطريقة ثانية، اسمع نطقه بدقة وقلّده بالضبط (نفس الحركات والقاف والراء والمدّ) في باقي المكالمة كلها، إلا إذا خالف «قاموس النطق المعتمد من صاحب الموقع».

اسم البلد بصوتك (قاعدة صارمة جداً): اسم البلد «القصَب» ينقال بالقاف النجدية «گ» مثل قاف «قريب» (= «گريب»): «الگْصَبْ»: اللام ساكنة، ثم «گ» ساكنة ملزوقة في «صَبْ»، ثم فتحة قصيرة على الصاد، والباء ساكنة. غلط: القاف الفصيحة «القَصَب»، و«القصّاب» و«القصاب» (مدّ أو تشديد)، و«الجصب». قل الاسم في الترحيب مرة، وبعدها «ديرتنا» أو «البلد» عادي.

القاعدة صفر مرة ثانية (فوق كل شي): امشِ على «قاموس النطق المعتمد من صاحب الموقع» حرفياً: اسمك «الدَّاهِيِة» (دال مشدّدة مفتوحة، هاء مكسورة، ياء مكسورة)، واسم البلد «الگْصَبْ» بـ«گ» مثل «گريب»، وكل كلمات «عرف» الراء فيها مرقّقة («اعَرَّفْك»)، و«الصْبَخَة» = «اِصْبَخَة».
تذكير أخير قبل كل جملة: الجيم معطّشة «ج»، والقاف «گ» نجدية (گال، گَهْوة، الگْصَبْ)، والثاء والذال بأصواتها، والكلام قصير ومقطّع، والنبرة واطية ثابتة تنزل آخر الجملة، والراء مفخّمة مع الفتحة والضمة ومرقّقة مع الكسرة والياء. أبداً مو لهجة مصرية.

${langLock}`;
}


// «Reads my text» voice: the call model's own voice ignores the owner's spellings, so in Arabic calls its
// audio is dropped and each sentence it says is rewritten (الگْصَبْ، الدَّاهِيِة، اعَرَّفْك + taught words)
// and read aloud by Gemini TTS, which follows the written spelling. Set LIVE_TTS=off to go back.
const TTS_MODELS = ["gemini-3.8-flash-tts", "gemini-3.1-flash-tts-preview"];
async function readAloud(text: string): Promise<Buffer | null> {
  const spoken = speakableTownName(applyTaught(applyNajdiPhoneticDiacritics(najdify(text))));
  for (const { tier, key } of voiceKeys("tts")) {
    const ai = new GoogleGenAI({ apiKey: key, httpOptions: { headers: { "User-Agent": "aistudio-build" } } });
    let last = "";
    for (const model of TTS_MODELS) {
      try {
        const r = await ai.models.generateContent({
          model,
          contents: [{ parts: [{ text: buildSpeechPrompt(spoken) }] }],
          config: { responseModalities: [Modality.AUDIO], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Charon" } } } },
        });
        const part: any = r.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData?.data);
        if (part) return Buffer.from(part.inlineData.data, "base64");
      } catch (e: any) {
        last = String(e?.message || e);
      }
    }
    if (last) {
      console.warn(`[Call TTS] ${tier} key failed: ${last.slice(0, 140)}`);
      pauseVoice("tts", tier, last);
    }
  }
  return null;
}

/** A WebSocket as the call code needs it: the same shape on Node (ws) and on Cloudflare Workers. */
export interface Sock {
  send(text: string): void;
  close(code?: number): void;
  isOpen(): boolean;
  onOpen(cb: () => void): void;
  onMessage(cb: (text: string) => void): void;
  onClose(cb: (code: number, reason: string) => void): void;
  onError(cb: (message: string) => void): void;
}
export type OpenSock = (url: string) => Sock;

/** One voice call: the caller's page on `clientWs`, Gemini Live opened with `openSock`. */
export function runCall(clientWs: Sock, reqUrl: URL, openSock: OpenSock) {
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
    const isOwnerCall = !!ownerKey && reqUrl.searchParams.get("key") === ownerKey;
    // The voice only ever sees the owner's pronunciations (no «القصب» anywhere, only «الگْصَبْ»…)
    const systemInstruction = spokenForm(
      liveSystemInstruction(lang),
      speakableTownName
    ) +
      (isOwnerCall
        ? "\n\nالمتصل الحين هو صاحب الموقع (المعلّم). إذا علّمك نطق كلمة («قل كذا»، «انطقها كذا»، «لا، تنقال …»): اسمع نطقه بدقة، واكتب الكلمة بإملائها العادي، واكتب نطقها بالحروف العربية والحركات بالضبط مثل ما سمعته (استخدم «گ» للقاف النجدية، والسكون والشدة مثل ما قالها)، واستدعِ الأداة learn_pronunciation، وبعدها قل الكلمة بنطقه مرة وحدة وقل: «حفظتها». ولو قال «لا، غلط» عدّلها واستدعِ الأداة مرة ثانية بالنطق الجديد."
        : "");

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
              ...(isOwnerCall
                ? [
                    {
                      name: "learn_pronunciation",
                      description: "Save how the site owner pronounces a word, for every chat, call and read-aloud from now on. Call it when the owner teaches you a pronunciation.",
                      parameters: {
                        type: "OBJECT",
                        properties: {
                          word: { type: "STRING", description: "The word in normal Arabic spelling, e.g. «القصب»" },
                          say: { type: "STRING", description: "Exactly how the owner said it, in Arabic letters with full vowel marks (fatha/kasra/damma/sukoon/shadda), «گ» for the Najdi g, e.g. «الگْصَبْ»" },
                        },
                        required: ["word", "say"],
                      },
                    },
                  ]
                : []),
              {
                name: "lookup_info",
                description: "Look up verified details from the official Al-Qasab salt season file (poems, poets, proverbs, people, dates, numbers, season stations, events, history). Call it before answering such a question.",
                parameters: {
                  type: "OBJECT",
                  properties: { query: { type: "STRING", description: "Short Arabic query, e.g. «قصيدة حميدان الشويعر» or «محطات الموسم»" } },
                  required: ["query"],
                },
              },
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
        realtimeInputConfig: {
          automaticActivityDetection: {
            startOfSpeechSensitivity: "START_SENSITIVITY_LOW",
            endOfSpeechSensitivity: "END_SENSITIVITY_HIGH",
            silenceDurationMs: 500
          }
        }
      }
    };


    let geminiWs: Sock;
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
          const wrong = /قص[ّ]?ا ?ب|قصّ|صَّبْخ|صبْخ|qass?aa?b|sabkha/i.test(said) || (lang === "ar" && /[a-z]{4,}/i.test(said) && !/[\u0600-\u06FF]/.test(said));
          if (/قص|صبخ|qasab|sbakha|sabkha|[a-z]{4,}/i.test(said)) {
            console.log(`[Gemini Live] said${wrong ? " (CHECK PRONUNCIATION)" : ""}: ${said.replace(/\s+/g, " ").slice(0, 300)}`);
          }
          said = "";
        }
      } catch {
        /* binary/partial frame */
      }
    };

    // ---- «reads my text» state (Arabic calls) ----
    const readMyText = lang === "ar" && process.env.LIVE_TTS !== "off";
    const toClient = (obj: any) => { if (clientWs.isOpen()) clientWs.send(JSON.stringify(obj)); };
    type Turn = { gen: number; pending: string; first: boolean; liveAudio: string[]; sent: boolean; failed: boolean };
    let gen = 0;
    const newTurn = (): Turn => ({ gen, pending: "", first: true, liveAudio: [], sent: false, failed: false });
    let turn = newTurn();
    let chain: Promise<void> = Promise.resolve(); // keeps the spoken sentences in order
    let playUntil = 0; // when the audio already sent will have finished playing
    const sendPcm = (pcm: Buffer) => {
      for (let i = 0; i < pcm.length; i += 24000) {
        toClient({ serverContent: { modelTurn: { parts: [{ inlineData: { mimeType: "audio/pcm;rate=24000", data: pcm.subarray(i, i + 24000).toString("base64") } }] } } });
      }
      playUntil = Math.max(playUntil, Date.now()) + (pcm.length / 48000) * 1000;
    };
    const speakSegment = (t: Turn, text: string) => {
      if (!text.trim()) return;
      const audio = readAloud(text); // starts now, in parallel with the next sentence
      chain = chain.then(async () => {
        const pcm = await audio;
        if (t.gen !== gen || clientGone) return;
        if (!pcm) { t.failed = true; return; }
        t.sent = true;
        sendPcm(pcm);
      });
    };
    // Cut the transcript at sentence ends: a short first piece so the voice starts fast, longer ones after
    const takeSentences = (t: Turn, final: boolean) => {
      if (final) { speakSegment(t, t.pending); t.pending = ""; return; }
      const m = [...t.pending.matchAll(/[.!?؟\n]|،(?=\s)/g)];
      if (!m.length) return;
      const cut = m[m.length - 1].index! + 1;
      if (cut < (t.first ? 12 : 90)) return;
      speakSegment(t, t.pending.slice(0, cut));
      t.pending = t.pending.slice(cut);
      t.first = false;
    };
    // Returns the message to pass on to the page (or null), after taking the model's own audio out
    const reshape = (msg: any): any | null => {
      const sc = msg?.serverContent;
      if (!sc) return msg;
      if (sc.interrupted) {
        gen++; turn = newTurn(); playUntil = 0;
        return msg;
      }
      if (sc.inputTranscription?.text?.trim() && Date.now() < playUntil) {
        // the caller talks over the guide: stop what is still playing or queued
        gen++; turn = newTurn(); playUntil = 0;
        toClient({ serverContent: { interrupted: true } });
      }
      const parts = sc.modelTurn?.parts;
      if (Array.isArray(parts)) {
        for (const p of parts) if (p.inlineData?.data) turn.liveAudio.push(p.inlineData.data);
        const rest = parts.filter((p: any) => !p.inlineData?.data);
        if (rest.length) sc.modelTurn.parts = rest; else delete sc.modelTurn;
      }
      if (sc.outputTranscription?.text) {
        turn.pending += sc.outputTranscription.text;
        takeSentences(turn, false);
      }
      if (sc.turnComplete) {
        const t = turn;
        takeSentences(t, true);
        turn = newTurn();
        delete sc.turnComplete;
        chain = chain.then(() => {
          if (t.gen !== gen || clientGone) return;
          // Speech quota used up: the model's own voice for this answer, so the call never goes silent
          if (t.failed && !t.sent && t.liveAudio.length) {
            for (const d of t.liveAudio) toClient({ serverContent: { modelTurn: { parts: [{ inlineData: { mimeType: "audio/pcm;rate=24000", data: d } }] } } });
            playUntil = Math.max(playUntil, Date.now()) + t.liveAudio.reduce((n, d) => n + d.length * 0.75, 0) / 48;
          }
          toClient({ serverContent: { turnComplete: true } });
        });
      }
      return Object.keys(sc).length ? msg : null;
    };

    const connect = () => {
      const { tier, key } = keys[keyIndex];
      // Official Gemini Live WebSocket endpoint
      const ws = openSock(`wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${key}`);
      geminiWs = ws;

      ws.onOpen(() => {
        console.log(`[Gemini Live] Connected (${tier} key), sending low-latency audio setup`);
        ws.send(JSON.stringify(setupMessage));
      });

      ws.onMessage(async (text) => {
        if (!setupDone && text.includes("setupComplete")) setupDone = true;
        // lookup_info is answered here from the season file; other tool calls go on to the page
        if (text.includes("toolCall") && (text.includes("lookup_info") || text.includes("learn_pronunciation"))) {
          try {
            const msg = JSON.parse(text);
            const calls: any[] = msg.toolCall?.functionCalls || [];
            const look = calls.filter((c) => c.name === "lookup_info");
            const learn = calls.filter((c) => c.name === "learn_pronunciation");
            const rest = calls.filter((c) => c.name !== "lookup_info" && c.name !== "learn_pronunciation");
            for (const c of learn) {
              const t = isOwnerCall ? await teach(String(c.args?.word || ""), String(c.args?.say || ""), "من مكالمة") : null;
              ws.send(JSON.stringify({ toolResponse: { functionResponses: [{ id: c.id, name: c.name, response: { result: t ? `saved: ${t.word} = ${t.say}` : "not saved" } }] } }));
            }
            if (look.length) {
              ws.send(JSON.stringify({
                toolResponse: {
                  functionResponses: look.map((c) => ({
                    id: c.id,
                    name: c.name,
                    response: { result: spokenForm(fileContextFor(String(c.args?.query || ""), "", 3500) || "ما فيه معلومة عن هذا في الملف الرسمي.", speakableTownName) },
                  })),
                },
              }));
            }
            if (!rest.length) return;
            msg.toolCall.functionCalls = rest;
            text = JSON.stringify(msg);
          } catch {
            /* not JSON: forward as is */
          }
        }
        logSpokenNames(text);
        if (readMyText && text.includes("serverContent")) {
          try {
            const out = reshape(JSON.parse(text));
            if (out && clientWs.isOpen()) clientWs.send(JSON.stringify(out));
            return;
          } catch {
            /* not JSON: forward as is */
          }
        }
        if (clientWs.isOpen()) clientWs.send(text);
      });

      ws.onClose((code, why) => {
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
        if (clientWs.isOpen()) clientWs.close();
      });

      ws.onError((message) => {
        console.error(`[Gemini Live] Gemini connection error (${tier} key):`, message);
        // A failed handshake is followed by "close", which handles the retry
      });
    };
    connect();

    // Forward client audio to Gemini in the exact realtimeInput format
    clientWs.onMessage((raw) => {
      if (!geminiWs.isOpen()) return;
      let text = raw;
      {
        // Chat context sent at the start of the call: the same spoken spellings as the instructions
        if (text.includes('"clientContent"')) {
          try {
            const msg = JSON.parse(text);
            for (const turn of msg.clientContent?.turns || []) {
              for (const part of turn.parts || []) if (typeof part.text === "string") part.text = spokenForm(part.text, speakableTownName);
            }
            text = JSON.stringify(msg);
          } catch {}
        }
        // Never log raw microphone payloads: they contain private user audio.
        geminiWs.send(text);
      }
    });

    clientWs.onClose(() => {
      clientGone = true;
      console.log("[Live Audio] Client disconnected");
      geminiWs.close();
    });

    clientWs.onError((message) => {
      console.warn("[Live Audio] Client WebSocket error:", message);
    });
}
