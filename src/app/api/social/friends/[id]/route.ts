import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { action } = (await req.json()) as { action: "accept" | "decline" | "block" };
  const statusMap = { accept: "ACCEPTED", decline: "BLOCKED", block: "BLOCKED" } as const;
  const updated = await prisma.friendship.update({ where: { id }, data: { status: statusMap[action] ?? "BLOCKED" } });
  return NextResponse.json({ ok: true, friendship: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await prisma.friendship.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
