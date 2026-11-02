// One-shot pronunciation lab, run on the server a little after start-up when PRON_LAB_RUN is set
// in this file (change the id to run it again after a deploy; set it to "" to switch it off).
// It speaks test sentences with the call model (Gemini Live, same instructions as a real call,
// plus a variant hint) and with the read-aloud voice, then has a listener model write down
// exactly what it heard. Results go to the server log, prefixed [PronLab].
import { WebSocket } from "ws";
import { GoogleGenAI, Modality } from "@google/genai";
import { liveSystemInstruction } from "./live-audio.ts";
import { voiceKeys } from "./geminiFallback.ts";

const PRON_LAB_RUN = "2026-11-02-ab-1";
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function wav(pcm: Buffer, rate = 24000) {
  const h = Buffer.alloc(44);
  h.write("RIFF", 0); h.writeUInt32LE(36 + pcm.length, 4); h.write("WAVE", 8); h.write("fmt ", 12);
  h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(rate, 24);
  h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write("data", 36);
  h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

async function judgeAccent(ai: GoogleGenAI, pcm: Buffer) {
  const t = await ai.models.generateContent({
    model: "gemini-3.5-flash-lite",
    contents: [{ parts: [
      { inlineData: { mimeType: "audio/wav", data: wav(pcm).toString("base64") } },
      { text: "You are a dialectologist. Judge ONLY the ACCENT of this Arabic speech (pronunciation and intonation), not the word choice. Answer in ONE line: DIALECT=<Najdi/Saudi | Gulf | Egyptian | Levantine | MSA-like> ; JIM=<j | hard g | y> ; QAF=<g | q | glottal stop> in everyday words ; TOWN=<every time the town name (written القصب) is said, in strict phonetic Latin, comma separated> ; TOWN_QAF=<q | g | mixed> ; MELODY=<flat-falling | sing-song> ; SCORE=<0-10 how convincingly Najdi a Saudi from Najd would find it>." },
    ] }],
  });
  return (t.text || "").trim().replace(/\s+/g, " ");
}

async function listen(ai: GoogleGenAI, pcm: Buffer) {
  const t = await ai.models.generateContent({
    model: "gemini-3.5-flash-lite",
    contents: [{ parts: [
      { inlineData: { mimeType: "audio/wav", data: wav(pcm).toString("base64") } },
      { text: "Listen only to how the TOWN NAME (written القصب) is pronounced in this Arabic speech. Do NOT correct it to a known spelling. Answer in ONE line: the town name exactly as heard in strict phonetic Latin (double long vowels aa, double shadda consonants, q for ق, g for a G sound, S for ص), then ' | ', then in fully vowelled Arabic script (fatha/kasra/damma/sukoon/shadda as heard), then ' | ', then is there a vowel between the q and the S? answer VOWEL or NO-VOWEL." },
    ] }],
  });
  return (t.text || "").trim().replace(/\s+/g, " ");
}

/** One spoken turn from the call model, as 24 kHz PCM */
function liveSay(key: string, instruction: string, prompt: string, voice = "Charon"): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${key}`);
    const chunks: Buffer[] = [];
    const timer = setTimeout(() => { ws.close(); reject(new Error("timeout")); }, 45_000);
    ws.on("open", () => {
      ws.send(JSON.stringify({
        setup: {
          model: "models/gemini-3.8-live",
          generationConfig: { responseModalities: ["AUDIO"], temperature: 0.4, speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } } },
          systemInstruction: { parts: [{ text: instruction }] },
        },
      }));
    });
    ws.on("message", (data) => {
      let msg: any;
      try { msg = JSON.parse(data.toString()); } catch { return; }
      if (msg.setupComplete) {
        ws.send(JSON.stringify({ clientContent: { turns: [{ role: "user", parts: [{ text: prompt }] }], turnComplete: true } }));
      }
      for (const p of msg?.serverContent?.modelTurn?.parts || []) {
        if (p.inlineData?.data) chunks.push(Buffer.from(p.inlineData.data, "base64"));
      }
      if (msg?.serverContent?.turnComplete) { clearTimeout(timer); ws.close(); resolve(Buffer.concat(chunks)); }
    });
    ws.on("close", (code, reason) => { if (!chunks.length) { clearTimeout(timer); reject(new Error(`closed ${code} ${reason}`)); } });
    ws.on("error", (e) => { clearTimeout(timer); reject(e); });
  });
}

// Extra lines added to the call instructions, one variant per run, to see which one the voice follows
// A = the rules as deployed (Najdi «گ» in everyday words); B = every ق a deep ق (no «گ» at all)
const NO_G = "\n\nتعديل نهائي يلغي أي قاعدة قبله عن القاف: انطق كل قاف في كل الكلمات قاف فصيحة من آخر الحلق، بدون «گ» أبداً (قال، قهوة، قريب، القْصَبْ كلها بقاف فصيحة). وباقي قواعد اللهجة النجدية والنبرة الواطية النازلة مثل ما هي.";
export const LIVE_VARIANTS: Record<string, string> = { A: "", B: NO_G };
const LIVE_VOICES = ["Charon"];
const LIVE_PROMPTS = [
  "السلام عليكم، عرّفني بنفسك وبالبلد بجملتين.",
  "وش أشوف في القصب؟ جاوبني باختصار.",
  "أنا جاي من الرياض، كيف أوصل للقصب؟ باختصار.",
];
const TTS_SPELLINGS = ["حيّاك الله في القْصَبْ يا بعد حيي. القهوة جاهزة، وقريب منك مملحة القْصَبْ، والطريق للقْصَبْ ساعة ونص من الرياض. تبي أعلّمك عن الجفار؟"];
const TTS_VOICES = ["Charon"];

export function schedulePronLab(buildSpeechPrompt: (t: string) => string) {
  if (!PRON_LAB_RUN) return;
  setTimeout(async () => {
    const keys = voiceKeys("live");
    if (!keys.length) return console.log("[PronLab] no key");
    const key = keys[0].key;
    const ai = new GoogleGenAI({ apiKey: key, httpOptions: { headers: { "User-Agent": "aistudio-build" } } });
    console.log(`[PronLab] run ${PRON_LAB_RUN} start`);
    const base = liveSystemInstruction();
    for (const [variant, extra] of Object.entries(LIVE_VARIANTS)) {
      for (const prompt of LIVE_PROMPTS) {
        await wait(30_000); // stay under the free per-minute limit
        try {
          const pcm = await liveSay(key, base + extra, prompt, "Charon");
          console.log(`[PronLab] LIVE ${variant} "${prompt.slice(0, 18)}" → ${await judgeAccent(ai, pcm)}`);
        } catch (e: any) {
          console.log(`[PronLab] LIVE ${variant} error: ${String(e?.message || e).slice(0, 160)}`);
        }
      }
    }
    for (const [variant, extra] of Object.entries(LIVE_VARIANTS)) {
      for (let rep = 1; rep <= 2; rep++) {
        await wait(20_000);
        try {
          const r = await ai.models.generateContent({
            model: "gemini-3.8-flash-tts",
            contents: [{ parts: [{ text: buildSpeechPrompt(TTS_SPELLINGS[0]).replace("#### النص", extra.trim() + "\n\n#### النص") }] }],
            config: { responseModalities: [Modality.AUDIO], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Charon" } } } },
          });
          const part: any = r.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData?.data);
          console.log(`[PronLab] TTS ${variant} #${rep} → ${part ? await judgeAccent(ai, Buffer.from(part.inlineData.data, "base64")) : "no audio"}`);
        } catch (e: any) {
          console.log(`[PronLab] TTS ${variant} error: ${String(e?.message || e).slice(0, 160)}`);
        }
      }
    }
    console.log(`[PronLab] run ${PRON_LAB_RUN} done`);
  }, 20_000);
}
