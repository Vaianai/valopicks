"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { Lang } from "@/lib/i18n";
import { t as tFn, formatK as formatKFn } from "@/lib/i18n";

type LanguageCtx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
  formatK: (n: number) => string;
};

const Ctx = createContext<LanguageCtx>({
  lang: "en",
  setLang: () => {},
  t: (k) => k,
  formatK: formatKFn,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const stored = localStorage.getItem("vp-lang") as Lang | null;
    if (stored && ["en", "it", "es", "pt"].includes(stored)) setLangState(stored);
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem("vp-lang", l);
  };

  return (
    <Ctx.Provider value={{ lang, setLang, t: (k) => tFn(k, lang), formatK: formatKFn }}>
      {children}
    </Ctx.Provider>
  );
}

export function useTranslation() {
  return useContext(Ctx);
}
