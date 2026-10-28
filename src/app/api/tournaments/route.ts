import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const filter = searchParams.get("filter");
  const session = await getServerSession(authOptions);
  let where: Record<string, unknown> = { isPublic: true };
  if (filter === "mine" && session?.user?.id) {
    where = { ownerId: session.user.id };
  } else if (filter === "friends" && session?.user?.id) {
    const friendships = await prisma.friendship.findMany({
      where: { OR: [{ requesterId: session.user.id }, { addresseeId: session.user.id }], status: "ACCEPTED" },
    });
    const friendIds = friendships.map((f) => (f.requesterId === session.user.id ? f.addresseeId : f.requesterId));
    where = { ownerId: { in: friendIds }, isPublic: true };
  }
  const tournaments = await prisma.communityTournament.findMany({
    where,
    include: { owner: { select: { id: true, name: true, image: true } }, _count: { select: { members: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({ ok: true, tournaments });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const body = (await req.json()) as { name: string; type?: "FANTASY" | "BRACKET" | "PICKEM"; isPublic?: boolean; maxParticipants?: number; prizeDescription?: string; rules?: unknown; startsAt?: string; endsAt?: string };
  if (!body.name) return NextResponse.json({ ok: false, error: "Name required" }, { status: 400 });
  const inviteCode = randomBytes(4).toString("hex").toUpperCase();
  const tournament = await prisma.communityTournament.create({
    data: {
      name: body.name, ownerId: session.user.id, type: body.type ?? "FANTASY", isPublic: body.isPublic ?? true, inviteCode,
      maxParticipants: body.maxParticipants ?? 32, prizeDescription: body.prizeDescription, rules: (body.rules ?? {}) as object,
      startsAt: body.startsAt ? new Date(body.startsAt) : null, endsAt: body.endsAt ? new Date(body.endsAt) : null,
    },
  });
  await prisma.communityTournamentMember.create({ data: { tournamentId: tournament.id, userId: session.user.id } });
  await prisma.activityEvent.create({ data: { userId: session.user.id, type: "CREATED_TOURNAMENT", payload: { tournamentId: tournament.id, name: tournament.name } } });
  return NextResponse.json({ ok: true, tournament });
}
