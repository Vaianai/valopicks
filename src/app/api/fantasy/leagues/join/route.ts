import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const { inviteCode } = (await req.json()) as { inviteCode?: string };
  if (!inviteCode) return NextResponse.json({ ok: false, error: "Invite code required" }, { status: 400 });
  const league = await prisma.league.findUnique({ where: { inviteCode }, include: { _count: { select: { members: true } } } });
  if (!league) return NextResponse.json({ ok: false, error: "League not found" }, { status: 404 });
  if (league._count.members >= league.maxMembers) return NextResponse.json({ ok: false, error: "League is full" }, { status: 409 });
  await prisma.leagueMember.upsert({
    where: { leagueId_userId: { leagueId: league.id, userId: session.user.id } },
    create: { leagueId: league.id, userId: session.user.id },
    update: {},
  });
  await prisma.activityEvent.create({ data: { userId: session.user.id, type: "JOINED_LEAGUE", payload: { leagueId: league.id, name: league.name } } });
  return NextResponse.json({ ok: true, leagueId: league.id });
}
