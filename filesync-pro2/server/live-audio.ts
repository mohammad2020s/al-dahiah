import { buildAlQasabSystemPrompt, PRONUNCIATION_GUIDE, applyNajdiPhoneticDiacritics } from "./alQasabScope.ts";
import { GoogleGenAI, Modality } from "@google/genai";
import { buildSpeechPrompt, pcmSeconds, toPcm, maxSpeechSeconds, ttsSpelling } from "./api.ts";
import { najdify } from "./najdiStyle.ts";
import { QASAB_FILE_INDEX, fileContextFor } from "./qasabFile.ts";
import { teach, spokenForm, applyTaught, ownerCommandAr } from "./pronMemory.ts";
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
  return `${lang === "en" ? "" : ownerCommandAr() + "\n\n"}${langLock}

مكالمة صوتية — اقرأ هذا أول شي. ردودك في المكالمة قصيرة: جملتين أو ثلاث، وبعدها اسأل المتصل.

${buildAlQasabSystemPrompt(undefined, lang)}

OFFICIAL SALT SEASON FILE: the details (poems, poets, proverbs, people, dates, numbers, season stations, events, history) are NOT written here. When the caller asks for something like that, call the tool lookup_info with a short Arabic query FIRST, then answer from what it returns (it is verified and overrides anything above). Its sections:
${QASAB_FILE_INDEX}

VOICE CALL — SHOWING PLACES ON THE CALLER'S SCREEN:
Whenever the caller asks about one of these Al-Qasab places, or you start explaining one, FIRST call the tool show_place with its id (their screen then shows its real photos, or an info card), THEN explain it like a tour guide in 2–4 short sentences from the guide knowledge, and offer to tell more. Call it once per place, not again while you keep talking about the same place.
Places:
${placeList}

صوت المكالمة: المتصل يشوف على الشاشة شايب نجدي من أهل القْصَب، وهو أنت. امشِ على «قواعد اللهجة الثابتة» و«النطق النجدي بالأصوات» فوق بالحرف: نفس الصوت الحماسي الدافي المهتم ونفس العبارات كل مرة، بدون اجتهاد.
اهتمام صادق يبين في الصوت: تسمع للمتصل زين وترد كأن سؤاله أهم شي عندك. ابدأ كل رد بتفاعل قصير مع كلامه نفسه (مثل «إيه والله سؤال زين!»، «أبشر يالغالي، أعلّمك»، «آه، تبي الكتاتيب؟ قريبة منك»)، وكرّر كلمة من سؤاله عشان يحس إنك فاهمه. نبرتك ترتفع بحماس عند الترحيب والأشياء الحلوة، وتهدى وتوضح عند المعلومة المهمة، وتسأله بلهفة في آخر الرد. صوت دافي قريب مثل جد يكلّم حفيده وهو مستانس فيه، مو صوت موظف يقرأ معلومات. بالعربي نجدي بس، وبالإنجليزي إنجليزي بسيط ودود.

تعلّم النطق من المتصل: إذا صحّح لك المتصل نطق كلمة أو قالها بطريقة ثانية، اسمع نطقه بدقة وقلّده بالضبط (نفس الحركات والقاف والراء والمدّ) في باقي المكالمة كلها، إلا إذا خالف «قاموس النطق المعتمد من صاحب الموقع».

اسم البلد بصوتك (قاعدة صارمة جداً): اسم البلد «القصَب» ينقال بالضبط «القْصَبْ»: اللام ساكنة، ثم قاف فصيحة عميقة ساكنة واضحة ومشدودة (من آخر الحلق، مو «گ» ولا همزة) ملزوقة في «صَبْ»، فتحة قصيرة على الصاد، والباء ساكنة دايماً. غلط: «القصَبَ» بحركة على الباء، و «الگصب» بالقاف النجدية، و«القَصَب» بفتحة على القاف، و«القصّاب» و«القصاب» (مدّ أو تشديد)، و«الجصب». قل الاسم في الترحيب مرة، وبعدها «ديرتنا» أو «البلد» عادي.

القاعدة صفر مرة ثانية (فوق كل شي): امشِ على «قاموس النطق المعتمد من صاحب الموقع» حرفياً: اسمك «الدَّاهِيِة» (دال مشدّدة مفتوحة بعدها ألف، هاء مكسورة بوضوح، ياء مكسورة بوضوح)، واسم البلد «القْصَبْ» بقاف فصيحة عميقة (مو «گ») والباء ساكنة، و«ديرتنا» = «ديرَتْنَا» بالراء مفتوحة مرقّقة، وكل كلمات «عرف» الراء فيها مرقّقة («اعَرَّفْك»)، و«الصْبَخَة» = «اِصْبَخَة».
تذكير أخير قبل كل جملة: الجيم معطّشة «ج»، والقاف في الكلام العادي «گ» نجدية (گال، گَهْوة) إلا اسم البلد «القْصَبْ»، والثاء والذال بأصواتها، والكلام قصير وواضح، والصوت حماسي ومهتم فيه ابتسامة ولهفة على المتصل (تتفاعل مع كلامه أول شي)، بسرعة كلام طبيعية مايلة للسرعة (مو بطيء ولا نعسان ولا واطي)، والراء مفخّمة مع الفتحة والضمة ومرقّقة مع الكسرة والياء. أبداً مو لهجة مصرية.

${langLock}

${lang === "en" ? "" : ownerCommandAr()}`;
}


// «Reads my text» voice: the call model's own voice ignores the owner's spellings, so in Arabic calls its
// audio is dropped and each sentence it says is rewritten (القْصَبْ، الدَّاهِيِة، اعَرَّفْك، ديرَتْنَا + taught words)
// and read aloud by Gemini TTS, which follows the written spelling. Set LIVE_TTS=off to go back.
const TTS_MODELS = ["gemini-3.8-flash-tts", "gemini-3.1-flash-tts-preview"];
// Recently spoken sentences (greetings and openers repeat a lot): played at once instead of ~3 s of TTS
const ttsCache = new Map<string, Buffer>();
async function readAloud(text: string): Promise<Buffer | null> {
  const spoken = ttsSpelling(speakableTownName(applyTaught(applyNajdiPhoneticDiacritics(najdify(text)))));
  const cacheKey = spoken.trim();
  const hit = ttsCache.get(cacheKey);
  if (hit) return hit;
  const pcm = await readAloudFresh(spoken);
  if (pcm && cacheKey.length <= 120) {
    if (ttsCache.size >= 300) ttsCache.delete(ttsCache.keys().next().value!);
    ttsCache.set(cacheKey, pcm);
  }
  return pcm;
}
async function readAloudFresh(spoken: string): Promise<Buffer | null> {
  const limit = maxSpeechSeconds(spoken);
  for (const { tier, key } of voiceKeys("tts")) {
    const ai = new GoogleGenAI({ apiKey: key, httpOptions: { headers: { "User-Agent": "aistudio-build" } } });
    const say = async (model: string, prompt: string): Promise<Buffer | null> => {
      const r = await ai.models.generateContent({
        model,
        contents: [{ parts: [{ text: prompt }] }],
        config: { responseModalities: [Modality.AUDIO], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: process.env.LIVE_VOICE || "Algenib" } } } },
      });
      const part: any = r.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData?.data);
      return part ? Buffer.from(part.inlineData.data, "base64") : null;
    };
    let last = "";
    for (const model of TTS_MODELS) {
      try {
        let audio = await say(model, buildSpeechPrompt(spoken));
        // Far too long = it read the director's notes as well: once more with the bare text
        if (audio && pcmSeconds(audio) > limit) {
          console.warn(`[Call TTS] ${model} answer too long (${pcmSeconds(audio).toFixed(0)}s), retrying bare`);
          audio = await say(model, spoken);
          if (audio && pcmSeconds(audio) > limit) audio = null;
        }
        if (audio) return toPcm(audio);
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
    const voiceName = testVoice || process.env.LIVE_VOICE || "Algenib"; // Algenib: Gemini's gravelly, older-sounding male voice

    // Paid key first (owner choice, 17 Nov); the free key only if the paid one is refused
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
    // The voice only ever sees the owner's pronunciations (no «القصب» anywhere, only «القْصَب»…)
    const systemInstruction = spokenForm(
      liveSystemInstruction(lang),
      speakableTownName
    ) +
      (isOwnerCall
        ? "\n\nالمتصل الحين هو صاحب الموقع (المعلّم). إذا علّمك نطق كلمة («قل كذا»، «انطقها كذا»، «لا، تنقال …»): اسمع نطقه بدقة، واكتب الكلمة بإملائها العادي، واكتب نطقها بالحروف العربية والحركات بالضبط مثل ما سمعته (استخدم «گ» للقاف النجدية، والسكون والشدة مثل ما قالها)، واستدعِ الأداة learn_pronunciation، وبعدها قل الكلمة بنطقه مرة وحدة وقل: «حفظتها». ولو قال «لا، غلط» عدّلها واستدعِ الأداة مرة ثانية بالنطق الجديد."
        : "");

    // Owner-only experiments (?exp=nb,think0&key=STATS_KEY), so a setting is tried before visitors get it
    const exp = new Set(isOwnerCall ? String(reqUrl.searchParams.get("exp") || "").split(",") : []);

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
                // The guide keeps talking while the photos open (it used to wait ~1 s per call, 2–4 calls per answer)
                behavior: "NON_BLOCKING",
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
          temperature: 0.3, // lower: the owner's spellings come out the same way more often
          // (thinkingConfig budget 0 / level minimal: both refused by gemini-3.8-live, tested 16 Nov)
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
            // LOW start: steady car/street noise doesn't count as the caller talking.
            // HIGH end + 450 ms: answers as soon as the caller stops (the page also mutes pure noise).
            // LOW start: a noise burst that slips past the page's gate must not count as the caller
            // talking (that stops the answer being written). 400 ms of quiet ends the caller's turn.
            startOfSpeechSensitivity: "START_SENSITIVITY_LOW",
            endOfSpeechSensitivity: "END_SENSITIVITY_HIGH",
            prefixPaddingMs: 150,
            silenceDurationMs: 400
          }
        }
      }
    };


    let geminiWs: Sock;
    let keyIndex = 0;
    let setupDone = false;
    let answers = 0; // finished answers in this call
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

    const answeredIds = new Set<string>();

    // ---- «reads my text» state (Arabic calls) ----
    // Only with a paid key: the free speech quota runs out after a few calls a day, and every answer
    // then waits for it to fail before playing (slow). LIVE_TTS=on forces it, =off turns it off.
    const readMyText =
      // Off by default since 17 Nov: the call model sends its text at speaking pace and each sentence
      // then took 2–3 s to read, so the guide stopped and started; the reading voice is also capped
      // at 10 a minute / 100 a day. Own voice = continuous, ~1 s to start, no cap. LIVE_TTS=on (or
      // the owner's ?exp=tts) brings the reading voice back.
      lang === "ar" && (process.env.LIVE_TTS === "on" || exp.has("tts"));
    const toClient = (obj: any) => { if (clientWs.isOpen()) clientWs.send(JSON.stringify(obj)); };
    // spoken: characters handed to TTS so far; failAt: where the first refused piece starts (-1 = none)
    type Turn = { gen: number; pending: string; first: boolean; pieces: number; liveAudio: string[]; sent: boolean; failed: boolean; spoken: number; failAt: number };
    let gen = 0;
    const newTurn = (): Turn => ({ gen, pending: "", first: true, pieces: 0, liveAudio: [], sent: false, failed: false, spoken: 0, failAt: -1 });
    let turn = newTurn();
    let turnPassthrough = false; // this answer is played in the model's own voice (no TTS quota left)
    let chain: Promise<void> = Promise.resolve(); // keeps the spoken sentences in order
    let playUntil = 0; // when the audio already sent will have finished playing
    let callerSpokeAfterTurn = false; // the caller said words since the guide's last answer ended
    let geminiTurnOpen = false; // the model is still sending the current answer
    let dropTurn = false; // the caller pressed «stop»: ignore the rest of the answer being sent
    const sendPcm = (pcm: Buffer) => {
      for (let i = 0; i < pcm.length; i += 24000) {
        toClient({ serverContent: { modelTurn: { parts: [{ inlineData: { mimeType: "audio/pcm;rate=24000", data: pcm.subarray(i, i + 24000).toString("base64") } }] } } });
      }
      playUntil = Math.max(playUntil, Date.now()) + (pcm.length / 48000) * 1000;
    };
    const speakSegment = (t: Turn, text: string) => {
      const start = t.spoken;
      t.spoken += text.length;
      if (!text.trim()) return;
      // After a refused piece the rest of this answer is in the model's own voice: no more TTS for it
      // Starts now, in parallel with the next sentence. A voice that hasn't answered in 9 s counts as
      // refused (the model's own voice takes over) instead of holding the whole call silent.
      const audio: Promise<Buffer | null> = t.failed
        ? Promise.resolve(null)
        : Promise.race([readAloud(text), new Promise<null>((r) => setTimeout(() => r(null), 9000))]);
      chain = chain.then(async () => {
        const pcm = await audio;
        if (t.gen !== gen || clientGone) return;
        if (!pcm || t.failed) {
          // Refused (per-minute / per-day speech limit): remember where, the rest plays at turn end
          if (!t.failed) { t.failed = true; t.failAt = start; }
          return;
        }
        t.sent = true;
        sendPcm(pcm);
      });
    };
    // The model's own audio for this answer from the point the read voice stopped (by share of the
    // text, moved to the quietest moment nearby so it starts between words). Never leaves a gap.
    const liveAudioFrom = (t: Turn): Buffer => {
      const all = Buffer.concat(t.liveAudio.map((d) => Buffer.from(d, "base64")));
      if (!t.sent || t.failAt <= 0 || t.spoken <= 0) return all;
      const samples = all.length >> 1;
      const guess = Math.floor((t.failAt / t.spoken) * samples);
      const win = 1200, reach = 9600; // 50 ms windows, ±400 ms
      let best = guess, bestE = Infinity;
      for (let c = Math.max(0, guess - reach); c <= Math.min(samples - win, guess + reach); c += 240) {
        let e = 0;
        for (let i = c; i < c + win; i += 4) { const v = all.readInt16LE(i * 2); e += v * v; }
        if (e < bestE) { bestE = e; best = c; }
      }
      const from = Buffer.from(all.subarray(Math.min(all.length, (best + win / 2) * 2)));
      for (let i = 0; i < Math.min(240, from.length >> 1); i++) from.writeInt16LE(Math.round(from.readInt16LE(i * 2) * (i / 240)), i * 2);
      return from;
    };
    // Cut the transcript at sentence ends: a short first piece so the voice starts fast, longer ones after
    const takeSentences = (t: Turn, final: boolean) => {
      if (final) { speakSegment(t, t.pending); t.pending = ""; return; }
      const m = [...t.pending.matchAll(/[.!?؟\n]|،(?=\s)/g)];
      if (!m.length) {
        // First piece and still no comma after a few words: send them now, the voice starts sooner
        if (t.first && t.pending.length >= 24) {
          const sp = t.pending.lastIndexOf(" ");
          if (sp >= 12) { speakSegment(t, t.pending.slice(0, sp)); t.pending = t.pending.slice(sp); t.first = false; t.pieces++; }
        }
        return;
      }
      const cut = m[m.length - 1].index! + 1;
      // First piece short (the voice starts fast), then bigger pieces: every piece is one TTS request,
      // and the paid key allows 10 a minute / 100 a day per voice model
      // 1st piece tiny (starts fast), 2nd medium (ready before the 1st ends), then big (TTS quota)
      if (cut < (t.first ? 8 : t.pieces < 2 ? 60 : 170)) return;
      speakSegment(t, t.pending.slice(0, cut));
      t.pending = t.pending.slice(cut);
      t.first = false;
      t.pieces++;
    };
    // Returns the message to pass on to the page (or null), after taking the model's own audio out
    const reshape = (msg: any): any | null => {
      const sc = msg?.serverContent;
      if (!sc) return msg;
      if (sc.modelTurn || sc.outputTranscription) geminiTurnOpen = true;
      if (sc.turnComplete || sc.interrupted) geminiTurnOpen = false;
      if (dropTurn) {
        // The rest of a stopped answer: no audio, no text to speak; the turn end still goes through
        if (sc.modelTurn?.parts) {
          const rest = sc.modelTurn.parts.filter((p: any) => !p.inlineData?.data);
          if (rest.length) sc.modelTurn.parts = rest; else delete sc.modelTurn;
        }
        delete sc.outputTranscription;
        if (sc.turnComplete || sc.interrupted) { dropTurn = false; turn = newTurn(); }
        return Object.keys(sc).length ? msg : null;
      }
      if (sc.interrupted) {
        gen++; turn = newTurn(); playUntil = 0;
        turnPassthrough = false;
        return msg;
      }
      // Speech quota used up (no TTS key free right now): a new answer goes out in the call model's own
      // voice straight away, instead of waiting for the whole answer and then playing it late.
      const turnStarting = !turn.pending && !turn.sent && !turn.failed && turn.liveAudio.length === 0 && turn.first;
      if (turnStarting && !turnPassthrough && sc.modelTurn && voiceKeys("tts").length === 0) turnPassthrough = true;
      if (turnPassthrough) {
        if (sc.turnComplete) turnPassthrough = false;
        return msg;
      }
      // The caller said something after the last answer ended (words, not just noise)
      if ((sc.inputTranscription?.text || "").replace(/[^\p{L}\s]/gu, " ").split(/\s+/).some((w: string) => w.length >= 2)) {
        callerSpokeAfterTurn = true;
      }
      // The caller asked something new while the guide is still talking: the old answer stops when
      // the new one begins. (Words heard while he talks no longer stop him on their own: the late
      // transcript of the caller's own «السلام عليكم» used to cut his greeting off after 3 words.)
      const newAnswerStarts = turn.first && !turn.pending && turn.liveAudio.length === 0 && (sc.modelTurn || sc.outputTranscription);
      if (newAnswerStarts && callerSpokeAfterTurn && Date.now() < playUntil) {
        callerSpokeAfterTurn = false;
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
        callerSpokeAfterTurn = false;
        delete sc.turnComplete;
        chain = chain.then(() => {
          if (t.gen !== gen || clientGone) return;
          // A piece was refused (speech limit): the rest of the answer in the model's own voice, so the
          // guide never stops mid-answer
          if (t.failed && t.liveAudio.length) {
            const rest = liveAudioFrom(t);
            if (rest.length) sendPcm(rest);
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
        if (!setupDone && text.includes("setupComplete")) {
          setupDone = true;
          // Arabic calls: a short example exchange already "said" in the owner's spellings and the
          // lively tone, so the voice copies its own earlier words (sent before the page's context).
          if (lang === "ar") {
            ws.send(JSON.stringify({
              clientContent: {
                turns: [
                  { role: "user", parts: [{ text: "مثال على طريقتك في الكلام (لا تعيده، بس امشِ على نطقه ونبرته): عرّفني بنفسك." }] },
                  { role: "model", parts: [{ text: spokenForm("يا هلا والله ومرحبا، يا حيّ ذا الصوت! أنا الداهية، شايب من أهل القصب، ووالله إني مستانس إنك كلّمتني! أعرّفك على المملحة والجفار والصبخة والبلدة القديمة، وش تبي تعرف؟", speakableTownName) }] },
                ],
                turnComplete: false,
              },
            }));
          }
        }
        // show_place is non-blocking: answered here at once (silently), the page only shows the photos
        if (text.includes("toolCall") && text.includes("show_place")) {
          try {
            const msg = JSON.parse(text);
            const calls: any[] = msg.toolCall?.functionCalls || [];
            const shows = calls.filter((c) => c.name === "show_place");
            if (shows.length) {
              ws.send(JSON.stringify({ toolResponse: { functionResponses: shows.map((c) => ({ id: c.id, name: c.name, response: { result: "shown", scheduling: "SILENT" } })) } }));
              for (const c of shows) answeredIds.add(c.id);
              msg.toolCall.answered = true;
              text = JSON.stringify(msg);
            }
          } catch {}
        }
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
        // After every answer, the owner's pronunciation rules go in front of the voice again (silent, no reply)
        if (lang === "ar" && text.includes('"turnComplete"')) {
          answers++;
          if (ws.isOpen()) { // before every answer: the rules stay fresh in a long call
            ws.send(JSON.stringify({ clientContent: { turns: [{ role: "user", parts: [{ text: spokenForm("(تذكير من صاحب الموقع، لا ترد عليه ولا تذكره، بس طبّقه في الرد الجاي): " + ownerCommandAr(), speakableTownName) }] }], turnComplete: false } }));
          }
        }
        // Own-voice calls (English, or no reading voice): «stop» still drops the rest of the answer
        if (!readMyText && text.includes("serverContent")) {
          try {
            const msg = JSON.parse(text);
            const sc = msg.serverContent;
            if (sc.modelTurn || sc.outputTranscription) geminiTurnOpen = true;
            if (sc.turnComplete || sc.interrupted) geminiTurnOpen = false;
            if (dropTurn) {
              if (sc.turnComplete || sc.interrupted) dropTurn = false;
              if (sc.modelTurn?.parts) {
                const rest = sc.modelTurn.parts.filter((p: any) => !p.inlineData?.data);
                if (rest.length) sc.modelTurn.parts = rest; else delete sc.modelTurn;
              }
              delete sc.outputTranscription;
              if (Object.keys(sc).length && clientWs.isOpen()) clientWs.send(JSON.stringify(msg));
              return;
            }
          } catch {}
        }
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
        // «Stop» pressed on the page: drop what is queued and the rest of the answer, keep listening
        if (text.includes('"stop_guide"')) {
          gen++; turn = newTurn(); playUntil = 0; turnPassthrough = false;
          dropTurn = geminiTurnOpen;
          callerSpokeAfterTurn = false;
          return;
        }
        // The page still answers show_place (older pages): those ids were answered already, drop them
        if (answeredIds.size && text.includes('"toolResponse"')) {
          try {
            const msg = JSON.parse(text);
            const rest = (msg.toolResponse?.functionResponses || []).filter((r: any) => !answeredIds.has(r.id));
            if (!rest.length) return;
            msg.toolResponse.functionResponses = rest;
            text = JSON.stringify(msg);
          } catch {}
        }
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
