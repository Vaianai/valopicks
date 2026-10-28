"use client";

import { useSession } from "next-auth/react";
import { useTranslation } from "@/components/layout/LanguageContext";
import { useState, useEffect } from "react";

export default function TournamentsPage() {
  const { data: session } = useSession();
  const { t } = useTranslation();
  const [tournaments, setTournaments] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/tournaments").then(r => r.json()).then(d => {
      if (d.ok) setTournaments(d.tournaments);
    });
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="font-title text-3xl font-bold uppercase text-white">{t("nav.tournaments")}</h1>
        {session?.user && (
          <button className="vp-btn vp-btn-primary">{t("tournaments.create")}</button>
        )}
      </div>

      <div className="vp-tabs max-w-md">
        <button className="vp-tab active">{t("tournaments.discover")}</button>
        {session?.user && <button className="vp-tab">{t("tournaments.myTournaments")}</button>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tournaments.length > 0 ? tournaments.map(tData => (
          <div key={tData.id} className="vp-card p-6 flex flex-col gap-4">
             <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-widest text-[var(--vp-accent)] mb-1 block">{tData.type}</span>
                  <h3 className="font-title text-xl font-bold text-white leading-tight">{tData.name}</h3>
                </div>
                <div className="px-2 py-1 bg-[rgba(255,255,255,0.05)] rounded text-xs font-bold text-[var(--vp-text-muted)]">
                  {tData._count?.members || 0}/{tData.maxParticipants}
                </div>
             </div>
             
             <div className="text-sm text-[var(--vp-text-muted)] border-t border-[var(--vp-border)] pt-4 mt-2">
               Organized by <span className="font-bold text-white">{tData.owner?.name}</span>
             </div>

             <button className="vp-btn vp-btn-primary w-full justify-center">{t("tournaments.join")}</button>
          </div>
        )) : (
          <div className="col-span-full vp-card p-12 text-center text-[var(--vp-text-muted)] border-dashed">
            {t("common.noData")}
          </div>
        )}
      </div>
    </div>
  );
}
