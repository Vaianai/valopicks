import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const league = await prisma.league.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true, image: true } },
      members: { include: { user: { select: { id: true, name: true, image: true } } } },
      fantasyTeams: {
        include: { user: { select: { id: true, name: true, image: true } }, roster: { include: { player: { select: { id: true, handle: true, price: true } } } } },
        orderBy: { totalPoints: "desc" },
      },
    },
  });
  if (!league) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true, league });
}
