import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const leagueId = searchParams.get("leagueId") ?? undefined;
  const team = await prisma.fantasyTeam.findFirst({
    where: { userId: session.user.id, leagueId: leagueId ?? null },
    include: { roster: { include: { player: { include: { team: true } } } } },
  });
  return NextResponse.json({ ok: true, team });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const { teamName, playerIds, leagueId } = (await req.json()) as { teamName?: string; playerIds: string[]; leagueId?: string };
  if (!playerIds || playerIds.length > 5) return NextResponse.json({ ok: false, error: "Max 5 players" }, { status: 400 });

  const players = await prisma.player.findMany({ where: { id: { in: playerIds } } });
  const total = players.reduce((s, p) => s + p.price, 0);
  if (total > 100000) return NextResponse.json({ ok: false, error: "Budget exceeded (max 100k)" }, { status: 400 });

  const existing = await prisma.fantasyTeam.findFirst({ where: { userId: session.user.id, leagueId: leagueId ?? null } });
  let team;
  if (existing) {
    await prisma.fantasyRoster.deleteMany({ where: { fantasyTeamId: existing.id } });
    team = await prisma.fantasyTeam.update({ where: { id: existing.id }, data: { name: teamName ?? existing.name, budgetUsed: total } });
  } else {
    team = await prisma.fantasyTeam.create({ data: { name: teamName ?? `${session.user.name}'s Team`, userId: session.user.id, leagueId: leagueId ?? null, budgetCap: 100000, budgetUsed: total } });
  }
  await prisma.fantasyRoster.createMany({ data: playerIds.map((playerId) => ({ fantasyTeamId: team.id, playerId })) });
  await prisma.activityEvent.create({ data: { userId: session.user.id, type: "DRAFTED", payload: { playerIds, teamName: team.name } } });
  return NextResponse.json({ ok: true, teamId: team.id });
}
