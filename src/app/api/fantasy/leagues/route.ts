import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const scope = searchParams.get("scope");
  const memberships = await prisma.leagueMember.findMany({
    where: { userId: session.user.id },
    include: { league: { include: { _count: { select: { members: true } }, owner: { select: { id: true, name: true, image: true } } } } },
  });
  let leagues = memberships.map((m) => m.league);
  if (scope) leagues = leagues.filter((l) => l.scope === scope);
  return NextResponse.json({ ok: true, leagues });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const { name, scope, allowedRegions, isPrivate, maxMembers, prizeDescription } = (await req.json()) as {
    name: string; scope: "REGIONAL" | "GLOBAL"; allowedRegions?: string[]; isPrivate?: boolean; maxMembers?: number; prizeDescription?: string;
  };
  if (!name) return NextResponse.json({ ok: false, error: "Name required" }, { status: 400 });
  const inviteCode = randomBytes(4).toString("hex").toUpperCase();
  const league = await prisma.league.create({
    data: { name, type: "FANTASY", scope: scope ?? "GLOBAL", allowedRegions: allowedRegions ?? [], isPrivate: isPrivate ?? false, inviteCode, ownerId: session.user.id, maxMembers: maxMembers ?? 20, prizeDescription },
  });
  await prisma.leagueMember.create({ data: { leagueId: league.id, userId: session.user.id } });
  return NextResponse.json({ ok: true, league });
}
