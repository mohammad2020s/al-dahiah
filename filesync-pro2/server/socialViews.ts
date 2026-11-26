// Views of videos about the 4th Al-Qasab Salt Season on social media, for the owner's /visitors page.
// Counted by hand (Claude in the owner's browser, one video at a time) and written here; each count
// says when it was made. A platform that could not be read says why instead of a number.
export type SocialCount = { id: "tiktok" | "x" | "snapchat"; name: string; views: number | null; videos: number; how: string };
export const SOCIAL_VIEWS: { updatedAt: string; platforms: SocialCount[] } = {
  updatedAt: "2026-11-26T18:52:19Z",
  platforms: [
    { id: "tiktok", name: "تيك توك", views: 4574831, videos: 305, how: "كل فيديوهات وسم #موسم_ملح_القصب و#موسم_ملح_القصب_4 (من ١٣ نوفمبر ٢٠٢٦)" },
    { id: "x", name: "إكس (تويتر)", views: null, videos: 0, how: "ما انحسب: البحث في إكس يطلب تسجيل دخول" },
    { id: "snapchat", name: "سناب شات", views: null, videos: 0, how: "ما انحسب: سناب ما يعرض مشاهدات سنابات الناس" },
  ],
};
