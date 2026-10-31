// «شارك هالمكان»: the phone's share sheet when there is one, WhatsApp otherwise.
// The photo itself is attached when the browser can share files.
export async function sharePlace({ title, image, en }: { title: string; image?: string; en: boolean }) {
  const url = "https://al-dahiah.onrender.com";
  const text = en
    ? `${title} — discover Al-Qasab and its salt season with Al-Dahiya, the smart guide:`
    : `${title} — اكتشف القَصَب وموسم الملح مع «الداهية» الدليل الذكي:`;
  try {
    if (image && navigator.canShare) {
      const blob = await fetch(image).then((r) => r.blob());
      const file = new File([blob], image.split("/").pop() || "qasab.jpg", { type: blob.type || "image/jpeg" });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ title, text: `${text} ${url}`, files: [file] });
        return;
      }
    }
    if (navigator.share) {
      await navigator.share({ title, text, url });
      return;
    }
  } catch (e: any) {
    if (e?.name === "AbortError") return;
  }
  window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`, "_blank", "noopener");
}
