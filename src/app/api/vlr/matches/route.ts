import { NextRequest, NextResponse } from "next/server";
import { fetchVlrMatchesLive } from "@/lib/vlr-scraper";
import { fetchLiquipediaMatchesLive } from "@/lib/liquipedia-scraper";

const TO = 8000;

function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve(fallback), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }).catch(() => { clearTimeout(t); resolve(fallback); });
  });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tier = searchParams.get("tier");

  const [vlr, lp] = await Promise.all([
    withTimeout(fetchVlrMatchesLive(), TO, []),
    withTimeout(fetchLiquipediaMatchesLive(), TO, []),
  ]);

  const seen = new Set<string>();
  const merged: typeof vlr = [];
  for (const m of [...vlr, ...lp]) {
    const key = `${m.team1.shortName}|${m.team2.shortName}|${new Date(m.startTime).toISOString().slice(0, 13)}`;
    if (!seen.has(key)) { seen.add(key); merged.push(m as typeof vlr[0]); }
  }

  const filtered = tier === "t1"
    ? merged.filter((m) => ["vct", "champions", "masters", "lock//in"].some((kw) => (m.event ?? "").toLowerCase().includes(kw)))
    : merged;

  return NextResponse.json({ ok: true, matches: filtered.slice(0, 80) });
}
