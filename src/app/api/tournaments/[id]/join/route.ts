import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { inviteCode } = (await req.json()) as { inviteCode?: string };

  const tournament = await prisma.communityTournament.findUnique({ where: { id }, include: { _count: { select: { members: true } } } });
  if (!tournament) return NextResponse.json({ ok: false, error: "Tournament not found" }, { status: 404 });
  if (!tournament.isPublic && tournament.inviteCode !== inviteCode) return NextResponse.json({ ok: false, error: "Invalid invite code" }, { status: 403 });
  if (tournament._count.members >= tournament.maxParticipants) return NextResponse.json({ ok: false, error: "Tournament is full" }, { status: 409 });

  await prisma.communityTournamentMember.upsert({
    where: { tournamentId_userId: { tournamentId: id, userId: session.user.id } },
    create: { tournamentId: id, userId: session.user.id },
    update: {},
  });
  await prisma.activityEvent.create({ data: { userId: session.user.id, type: "JOINED_TOURNAMENT", payload: { tournamentId: id, name: tournament.name } } });
  return NextResponse.json({ ok: true, tournamentId: id });
}
