import { NextRequest, NextResponse } from "next/server";
import { load } from "cheerio";

const VLR_BASE = "https://www.vlr.gg";
const CACHE_TTL = 10 * 60 * 1000;
let cache: { at: number; data: unknown[] } | null = null;

async function fetchEvents() {
  if (cache && Date.now() - cache.at < CACHE_TTL) return cache.data;
  const res = await fetch(`${VLR_BASE}/events`, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; ValoPicks/1.0)" },
    signal: AbortSignal.timeout(10000),
  });
  const html = await res.text();
  const $ = load(html);
  const events: unknown[] = [];

  $(".event-item").each((_, el) => {
    const $el = $(el);
    const name = $el.find(".event-item-title").text().trim();
    const dates = $el.find(".event-item-desc-item-main").first().text().trim();
    const prize = $el.find(".event-item-desc-item-main").eq(1).text().trim();
    const region = $el.find(".event-item-desc-item-main").eq(2).text().trim();
    const img = $el.find("img").attr("src") ?? "";
    const href = $el.closest("a").attr("href") ?? "";
    const id = href.split("/")[2] ?? "";
    const status = href.includes("/ongoing/") ? "live" : href.includes("/upcoming/") ? "upcoming" : "completed";
    if (name) events.push({ id, name, dates, prizePool: prize, region, iconUrl: img ? `https:${img}` : null, status });
  });

  cache = { at: Date.now(), data: events };
  return events;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  const tier = searchParams.get("tier");
  try {
    let ev = await fetchEvents() as { status: string; name: string }[];
    if (q) ev = ev.filter((e) => e.status === q);
    if (tier === "t1") ev = ev.filter((e) => ["vct", "champions", "masters", "lock//in"].some((kw) => e.name.toLowerCase().includes(kw)));
    return NextResponse.json({ ok: true, events: ev });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
