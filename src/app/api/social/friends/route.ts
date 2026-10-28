import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const uid = session.user.id;
  const friendships = await prisma.friendship.findMany({
    where: { OR: [{ requesterId: uid }, { addresseeId: uid }], status: { in: ["PENDING", "ACCEPTED"] } },
    include: { requester: { select: { id: true, name: true, image: true } }, addressee: { select: { id: true, name: true, image: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ ok: true, friendships });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const { targetUserId } = (await req.json()) as { targetUserId?: string };
  if (!targetUserId) return NextResponse.json({ ok: false, error: "targetUserId required" }, { status: 400 });
  if (targetUserId === session.user.id) return NextResponse.json({ ok: false, error: "Cannot friend yourself" }, { status: 400 });
  const friendship = await prisma.friendship.upsert({
    where: { requesterId_addresseeId: { requesterId: session.user.id, addresseeId: targetUserId } },
    create: { requesterId: session.user.id, addresseeId: targetUserId, status: "PENDING" },
    update: {},
  });
  await prisma.activityEvent.create({ data: { userId: session.user.id, type: "SENT_FRIEND_REQUEST", payload: { targetUserId } } });
  return NextResponse.json({ ok: true, friendship });
}
