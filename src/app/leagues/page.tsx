"use client";

import { useSession } from "next-auth/react";
import { useTranslation } from "@/components/layout/LanguageContext";
import { useState, useEffect } from "react";

export default function LeaguesPage() {
  const { data: session } = useSession();
  const { t } = useTranslation();
  const [leagues, setLeagues] = useState<any[]>([]);

  useEffect(() => {
    if (session?.user) {
      fetch("/api/fantasy/leagues").then(r => r.json()).then(d => {
        if (d.ok) setLeagues(d.leagues);
      });
    }
  }, [session]);

  if (!session) return <div className="text-center py-20 text-[var(--vp-text-muted)]">{t("common.loading")}</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="font-title text-3xl font-bold uppercase text-white">{t("nav.leagues")}</h1>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <input type="text" placeholder={t("leagues.inviteCode")} className="vp-input w-full sm:w-48" />
          <button className="vp-btn vp-btn-secondary">{t("leagues.join")}</button>
          <button className="vp-btn vp-btn-primary">{t("leagues.create")}</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {leagues.length > 0 ? leagues.map(l => (
          <div key={l.id} className="vp-card p-6 flex flex-col gap-4 group">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-title text-xl font-bold text-white group-hover:text-[var(--vp-accent)] transition-colors">{l.name}</h3>
                <span className={l.scope === "GLOBAL" ? "badge-global" : "badge-regional"}>{l.scope}</span>
              </div>
              <div className="w-10 h-10 rounded-full bg-[var(--vp-border)] overflow-hidden">
                 {l.owner?.image && <img src={l.owner.image} alt="" className="w-full h-full object-cover" />}
              </div>
            </div>
            
            <div className="flex flex-col gap-2 border-t border-[var(--vp-border)] pt-4">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--vp-text-muted)]">{t("leagues.members")}</span>
                <span className="font-bold text-white">{l._count?.members || 1} / {l.maxMembers}</span>
              </div>
              <div className="flex justify-between text-sm">
                 <span className="text-[var(--vp-text-muted)]">{t("leagues.yourRank")}</span>
                 <span className="font-bold text-[var(--vp-gold)]">#1</span>
              </div>
            </div>

            <button className="vp-btn vp-btn-secondary w-full justify-center mt-2 group-hover:bg-[var(--vp-accent)] group-hover:text-white group-hover:border-[var(--vp-accent)]">
              View Leaderboard
            </button>
          </div>
        )) : (
          <div className="col-span-full vp-card p-12 flex flex-col items-center justify-center text-center border-dashed gap-4">
            <div className="w-16 h-16 rounded-full bg-[rgba(255,255,255,0.02)] flex items-center justify-center text-3xl">🏆</div>
            <div>
              <h3 className="font-title text-xl font-bold text-white mb-2">No Leagues Yet</h3>
              <p className="text-[var(--vp-text-muted)] max-w-sm">Join an existing league using an invite code or create your own to compete with friends.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
