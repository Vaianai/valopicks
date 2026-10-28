import { formatK } from "@/lib/i18n";

export type CareerStats = {
  rating: number;
  acs: number;
  kdRatio: number;
  tier: "T1" | "T2";
  placements?: number;
};

export function computePlayerPrice(stats: CareerStats): number {
  const BASE = 5000;
  const MAX = 25000;
  const MIN = 3000;
  const ratingScore = (stats.rating - 1.0) * 16000;
  const acsScore = Math.max(0, stats.acs - 150) * 30;
  const kdScore = (stats.kdRatio - 1.0) * 5000;
  const tierMult = stats.tier === "T1" ? 1.3 : 1.0;
  const placementsBonus = (stats.placements ?? 0) * 500;
  const raw = (BASE + ratingScore + acsScore + kdScore + placementsBonus) * tierMult;
  const clamped = Math.max(MIN, Math.min(MAX, raw));
  return Math.round(clamped / 500) * 500;
}

export type PricedPlayer = { price: number; displayPrice: string };

export function pricePlayer(stats: CareerStats): PricedPlayer {
  const price = computePlayerPrice(stats);
  return { price, displayPrice: formatK(price) };
}

export function priceFromVlrStats(opts: {
  rating: string | number;
  acs: string | number;
  kd?: string | number;
  org?: string;
  event?: string;
}): PricedPlayer {
  const rating = parseFloat(String(opts.rating)) || 1.0;
  const acs = parseFloat(String(opts.acs)) || 200;
  const kd = parseFloat(String(opts.kd ?? "1.0")) || 1.0;
  const t1Keywords = ["vct", "champions", "masters", "lock//in"];
  const eventLower = (opts.event ?? "").toLowerCase();
  const tier: "T1" | "T2" = t1Keywords.some((kw) => eventLower.includes(kw)) ? "T1" : "T2";
  return pricePlayer({ rating, acs, kdRatio: kd, tier });
}
