"use client";

import { useSession } from "next-auth/react";
import { useTranslation } from "@/components/layout/LanguageContext";
import { useState, useEffect } from "react";

export default function FantasyDraftPage() {
  const { data: session } = useSession();
  const { t, formatK } = useTranslation();
  const [team, setTeam] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [budgetUsed, setBudgetUsed] = useState(0);
  const BUDGET_CAP = 100000;

  useEffect(() => {
    if (session?.user) {
      fetch("/api/fantasy/draft").then(r => r.json()).then(d => {
        if (d.ok && d.team) {
          setTeam(d.team);
          setBudgetUsed(d.team.budgetUsed);
        }
      });
    }
  }, [session]);

  const slots = team?.roster || [];
  const emptySlots = Math.max(0, 5 - slots.length);
  const budgetRatio = budgetUsed / BUDGET_CAP;

  if (!session) return <div className="text-center py-20 text-[var(--vp-text-muted)]">{t("common.loading")}</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <h1 className="font-title text-3xl font-bold uppercase text-white">{t("fantasy.myTeam")}</h1>
        <div className="vp-card px-4 py-2 flex items-center gap-4">
          <div className="text-sm text-[var(--vp-text-muted)] font-bold">{t("fantasy.budget")}</div>
          <div className="k-price text-xl">{formatK(BUDGET_CAP - budgetUsed)}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="vp-card p-6">
            <h2 className="font-title text-xl font-bold text-white mb-4">Roster (5/5)</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {slots.map((s: any, i: number) => (
                <div key={i} className="vp-card bg-[rgba(255,255,255,0.02)] p-4 flex flex-col items-center gap-2 border-[var(--vp-accent)] border-opacity-30">
                   <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[var(--vp-accent)] to-orange-500 flex items-center justify-center font-bold text-xl text-white shadow-lg">
                      {s.player.handle.charAt(0)}
                   </div>
                   <div className="text-center">
                     <div className="font-bold text-white text-lg">{s.player.handle}</div>
                     <div className="text-xs text-[var(--vp-text-muted)]">{s.player.role}</div>
                   </div>
                   <div className="mt-2 k-price">{formatK(s.player.price)}</div>
                   <button className="vp-btn vp-btn-ghost text-xs text-red-400 mt-2 hover:bg-red-500/10 w-full justify-center">{t("fantasy.removePlayer")}</button>
                </div>
              ))}
              {Array.from({ length: emptySlots }).map((_, i) => (
                <div key={`empty-${i}`} className="roster-slot-empty flex-col gap-2">
                  <svg className="w-6 h-6 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>{t("fantasy.emptySlot")}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-end gap-3 border-t border-[var(--vp-border)] pt-4">
               <button className="vp-btn vp-btn-secondary">{t("fantasy.autoPick")}</button>
               <button className="vp-btn vp-btn-primary">{t("fantasy.saveRoster")}</button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="vp-card p-6">
            <h2 className="font-title text-xl font-bold text-white mb-4">Draft Market</h2>
            <div className="relative mb-4">
               <input type="text" placeholder={t("common.search")} className="vp-input pl-10" />
               <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--vp-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
               </svg>
            </div>
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
              {[
                { id: "1", handle: "Demon1", price: 23500, role: "Duelist" },
                { id: "2", handle: "Chronicle", price: 22000, role: "Initiator" },
                { id: "3", handle: "Alfajer", price: 21500, role: "Sentinel" },
                { id: "4", handle: "Leo", price: 21000, role: "Initiator" },
                { id: "5", handle: "Mako", price: 20000, role: "Controller" },
              ].map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] hover:border-[var(--vp-accent)] transition-colors cursor-pointer">
                  <div>
                    <div className="font-bold text-white text-sm">{p.handle}</div>
                    <div className="text-xs text-[var(--vp-text-muted)]">{p.role}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="k-price">{formatK(p.price)}</span>
                    <button className="w-6 h-6 rounded bg-[var(--vp-accent)] text-white flex items-center justify-center hover:bg-white hover:text-[var(--vp-accent)] transition-colors">+</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
