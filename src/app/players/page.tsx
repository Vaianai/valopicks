"use client";

import { useTranslation } from "@/components/layout/LanguageContext";

export default function PlayersPage() {
  const { t } = useTranslation();
  
  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in-up">
      <h1 className="font-title text-3xl font-bold uppercase text-white">{t("nav.players")}</h1>
      <div className="vp-card p-12 text-center text-[var(--vp-text-muted)] border-dashed">
        Coming soon...
      </div>
    </div>
  );
}
