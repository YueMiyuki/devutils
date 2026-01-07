import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import en from "@/messages/en.json";
import zh from "@/messages/zh.json";
import zhTW from "@/messages/zh-TW.json";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: en,
      },
      zh: {
        translation: zh,
      },
      "zh-TW": {
        translation: zhTW,
      },
    },
    fallbackLng: "en",
    supportedLngs: ["en", "zh", "zh-TW"],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
    },
  });
