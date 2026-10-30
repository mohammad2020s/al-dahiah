// The three paintings of «الداهية» for the call (kept apart from GrandpaCall so the home
// page can preload them without pulling in three.js).
export const GRANDPA_FRAMES = ["/images/shayeb/base.jpg", "/images/shayeb/mouth.jpg", "/images/shayeb/eyes.jpg"];

/** Starts downloading the paintings, called before the call screen opens. */
export function preloadGrandpa() {
  for (const src of GRANDPA_FRAMES) {
    const img = new Image();
    img.src = src;
  }
}
