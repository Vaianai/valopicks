import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const uid = session.user.id;
  const friendships = await prisma.friendship.findMany({
    where: { OR: [{ requesterId: uid }, { addresseeId: uid }], status: "ACCEPTED" },
  });
  const friendIds = friendships.map((f) => (f.requesterId === uid ? f.addresseeId : f.requesterId));
  const activity = await prisma.activityEvent.findMany({
    where: { userId: { in: [...friendIds, uid] } },
    include: { user: { select: { id: true, name: true, image: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({ ok: true, activity });
}
