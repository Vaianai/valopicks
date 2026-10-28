import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const leagueId = searchParams.get("leagueId");
  const teams = await prisma.fantasyTeam.findMany({
    where: leagueId ? { leagueId } : {},
    orderBy: { totalPoints: "desc" },
    take: 100,
    include: {
      user: { select: { id: true, name: true, image: true } },
      roster: { include: { player: { select: { handle: true, price: true } } } },
    },
  });
  return NextResponse.json({
    ok: true,
    leaderboard: teams.map((t, i) => ({
      rank: i + 1,
      fantasyTeamId: t.id,
      teamName: t.name,
      user: t.user,
      totalPoints: t.totalPoints,
      weeklyPoints: t.weeklyPoints,
      budgetUsed: t.budgetUsed,
    })),
  });
}
