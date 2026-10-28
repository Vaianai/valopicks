import { NextRequest, NextResponse } from "next/server";
import { fetchVlrRankings } from "@/lib/vlr-scraper";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const region = searchParams.get("region") ?? "na";
  try {
    const data = await fetchVlrRankings(region);
    return NextResponse.json({ ok: true, rankings: data });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
