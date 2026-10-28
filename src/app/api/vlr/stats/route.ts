import { NextRequest, NextResponse } from "next/server";
import { fetchVlrStats } from "@/lib/vlr-scraper";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const region = searchParams.get("region") ?? "all";
  const timespan = searchParams.get("timespan") ?? "60";
  try {
    const data = await fetchVlrStats(region, timespan);
    return NextResponse.json({ ok: true, stats: data });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
