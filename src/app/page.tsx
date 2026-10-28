"use client";

import { useTranslation } from "@/components/layout/LanguageContext";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function Home() {
  const { t } = useTranslation();
  const [liveMatches, setLiveMatches] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/vlr/matches?tier=t1")
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) setLiveMatches(data.matches.filter((m: any) => m.status === "LIVE").slice(0, 3));
      })
      .catch(console.error);
  }, []);

  return (
    <div className="space-y-12 animate-fade-in">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl vp-card border border-[var(--vp-border)] bg-gradient-to-br from-[#0a1018] to-[#111c27]">
        <div className="absolute inset-0 bg-[url('https://images.contentstack.io/v3/assets/bltb6530b271fddd0b1/blt7fbbbc03f56d9539/64db696eb600021c70e28e3b/1691515286207.jpg')] bg-cover bg-center opacity-20 mix-blend-overlay"></div>
        <div className="relative z-10 px-6 py-20 sm:px-12 lg:px-24 text-center sm:text-left flex flex-col justify-center min-h-[400px]">
          <span className="inline-block px-3 py-1 mb-4 text-xs font-bold uppercase tracking-widest text-[var(--vp-accent)] bg-[var(--vp-accent-dim)] rounded-full border border-red-500/20 w-fit">
            Next.js + Discord Auth
          </span>
          <h1 className="font-title text-5xl sm:text-7xl font-black text-white leading-tight uppercase tracking-wide mb-6">
            {t("home.hero.title")}
          </h1>
          <p className="text-xl sm:text-2xl text-[var(--vp-text-muted)] max-w-2xl mb-10 font-medium">
            {t("home.hero.sub")}
          </p>
          <div className="flex flex-wrap items-center gap-4 justify-center sm:justify-start">
            <Link href="/fantasy" className="vp-btn vp-btn-primary px-8 py-4 text-lg uppercase tracking-wider font-bold">
              {t("nav.draft")}
            </Link>
            <Link href="/leagues" className="vp-btn vp-btn-secondary px-8 py-4 text-lg uppercase tracking-wider font-bold">
              {t("leagues.join")}
            </Link>
          </div>
        </div>
      </section>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-title text-2xl font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              {t("home.liveMatches")}
            </h2>
            <Link href="/matches" className="text-sm font-semibold text-[var(--vp-text-muted)] hover:text-[var(--vp-accent)] transition-colors">
              {t("common.viewAll")} &rarr;
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {liveMatches.length > 0 ? (
              liveMatches.map((m, i) => (
                <div key={i} className="vp-card p-4 flex flex-col justify-center items-center gap-3 relative overflow-hidden group">
                  <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-red-500 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span className="badge-live absolute top-3 left-3">{t("events.live")}</span>
                  <div className="text-xs text-[var(--vp-text-muted)] font-semibold truncate max-w-[70%]">{m.event}</div>
                  <div className="flex items-center justify-between w-full mt-2">
                    <div className="flex flex-col items-center gap-1 w-1/3">
                      <div className="font-title font-bold text-lg text-white">{m.team1.shortName}</div>
                    </div>
                    <div className="flex flex-col items-center justify-center w-1/3">
                      <div className="text-sm font-bold text-[var(--vp-text-muted)] bg-[rgba(255,255,255,0.05)] px-3 py-1 rounded">VS</div>
                    </div>
                    <div className="flex flex-col items-center gap-1 w-1/3">
                      <div className="font-title font-bold text-lg text-white">{m.team2.shortName}</div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full vp-card p-8 flex items-center justify-center text-[var(--vp-text-muted)] border-dashed">
                {t("common.noData")}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
           <h2 className="font-title text-2xl font-bold uppercase tracking-wider text-white">
            {t("home.topPicks")}
          </h2>
          <div className="vp-card p-4 space-y-3">
             <div className="flex items-center justify-between p-3 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center font-bold text-white shadow-lg">T</div>
                  <div>
                    <div className="font-bold text-white">TenZ</div>
                    <div className="text-xs text-[var(--vp-text-muted)]">SEN • Duelist</div>
                  </div>
                </div>
                <div className="k-price text-lg">21.5k</div>
             </div>
             <div className="flex items-center justify-between p-3 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center font-bold text-white shadow-lg">A</div>
                  <div>
                    <div className="font-bold text-white">Aspas</div>
                    <div className="text-xs text-[var(--vp-text-muted)]">LEV • Duelist</div>
                  </div>
                </div>
                <div className="k-price text-lg">24.5k</div>
             </div>
             <div className="flex items-center justify-between p-3 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center font-bold text-white shadow-lg">B</div>
                  <div>
                    <div className="font-bold text-white">Boaster</div>
                    <div className="text-xs text-[var(--vp-text-muted)]">FNC • Controller</div>
                  </div>
                </div>
                <div className="k-price text-lg">9.5k</div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
