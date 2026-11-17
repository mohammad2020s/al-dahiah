import React from "react";
import { Globe, Check } from "lucide-react";
import { Language } from "../i18n";
import { AlQasabLogo } from "./AlQasabLogo";

interface LanguageModalProps {
  isOpen: boolean;
  onSelectLanguage: (lang: Language) => void;
  isFirstVisit?: boolean;
  onClose?: () => void;
  currentLanguage: Language;
}

export const LanguageModal: React.FC<LanguageModalProps> = ({
  isOpen,
  onSelectLanguage,
  isFirstVisit = false,
  onClose,
  currentLanguage,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-[#e2d5c6] bg-gradient-to-b from-white to-[#f7f0e7] p-6 shadow-2xl sm:p-8">
        <div className="pointer-events-none absolute -left-16 -top-16 size-48 rounded-full bg-amber-200/40 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-16 -right-16 size-48 rounded-full bg-orange-300/20 blur-2xl" />

        <div className="relative flex flex-col items-center text-center">
          <div className="relative mb-4">
            <AlQasabLogo size="large" />
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#a5492a]/10 px-3 py-1 text-[11px] font-bold text-[#a5492a]">
            <Globe className="size-3.5" /> Language / اللغة
          </span>

          <h2 className="mt-3 font-['IBM_Plex_Sans_Arabic'] text-xl font-bold text-[#3f2a22] sm:text-2xl">
            {isFirstVisit ? "مرحباً بك في الداهية" : "تغيير اللغة • Language"}
          </h2>
          <p className="mt-2 text-xs leading-5 text-[#85695a] sm:text-sm">
            {isFirstVisit
              ? "يرجى اختيار لغة الاستخدام للمتابعة • Please select your language to start"
              : "اختر اللغة المناسبة لتجربة تفاعلية مميزة"}
          </p>

          <div className="mt-6 flex w-full flex-col gap-3">
            <button
              onClick={() => onSelectLanguage("ar")}
              className={`group flex w-full items-center justify-between rounded-2xl border p-4 text-right transition-all duration-200 active:scale-[0.98] ${
                currentLanguage === "ar"
                  ? "border-[#a5492a] bg-[#a5492a] text-white shadow-md shadow-[#a5492a]/20"
                  : "border-[#e2d5c6] bg-white text-[#3f2a22] hover:border-[#a5492a] hover:bg-[#fbf6ee]"
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`grid size-10 place-items-center rounded-xl font-bold text-sm ${
                    currentLanguage === "ar" ? "bg-white/20 text-white" : "bg-[#f4eadf] text-[#a5492a]"
                  }`}
                >
                  ض
                </span>
                <div className="text-right">
                  <p className="font-['IBM_Plex_Sans_Arabic'] text-sm font-bold">العربية (Arabic)</p>
                  <p className={`text-[11px] ${currentLanguage === "ar" ? "text-amber-100" : "text-[#85695a]"}`}>
                    الواجهة والإجابات باللغة العربية
                  </p>
                </div>
              </div>
              {currentLanguage === "ar" && (
                <div className="grid size-6 place-items-center rounded-full bg-white text-[#a5492a]">
                  <Check className="size-4 stroke-[3]" />
                </div>
              )}
            </button>

            <button
              onClick={() => onSelectLanguage("en")}
              className={`group flex w-full items-center justify-between rounded-2xl border p-4 text-left transition-all duration-200 active:scale-[0.98] ${
                currentLanguage === "en"
                  ? "border-[#a5492a] bg-[#a5492a] text-white shadow-md shadow-[#a5492a]/20"
                  : "border-[#e2d5c6] bg-white text-[#3f2a22] hover:border-[#a5492a] hover:bg-[#fbf6ee]"
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`grid size-10 place-items-center rounded-xl font-bold text-sm ${
                    currentLanguage === "en" ? "bg-white/20 text-white" : "bg-[#f4eadf] text-[#a5492a]"
                  }`}
                >
                  EN
                </span>
                <div>
                  <p className="font-['IBM_Plex_Sans_Arabic'] text-sm font-bold">English</p>
                  <p className={`text-[11px] ${currentLanguage === "en" ? "text-amber-100" : "text-[#85695a]"}`}>
                    Interface & responses in English
                  </p>
                </div>
              </div>
              {currentLanguage === "en" && (
                <div className="grid size-6 place-items-center rounded-full bg-white text-[#a5492a]">
                  <Check className="size-4 stroke-[3]" />
                </div>
              )}
            </button>
          </div>

          {!isFirstVisit && onClose && (
            <button
              onClick={onClose}
              className="mt-5 text-xs font-semibold text-[#8a6866] hover:text-[#a5492a] hover:underline"
            >
              إلغاء / Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
