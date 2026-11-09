// Cloudflare Workers: iconv-lite (used by Express's body-parser / raw-body) does not bundle there.
// Text decoding in Workers is built in, so this stand-in covers what those packages call.
function getDecoder(encoding) {
  const d = new TextDecoder(encoding || "utf-8");
  return { write: (buf) => d.decode(buf, { stream: true }), end: () => d.decode() };
}
module.exports = {
  encodingExists: (enc) => {
    try { new TextDecoder(enc); return true; } catch { return false; }
  },
  getDecoder,
  decode: (buf, enc) => new TextDecoder(enc || "utf-8").decode(buf),
  encode: (str) => Buffer.from(String(str), "utf8"),
};
