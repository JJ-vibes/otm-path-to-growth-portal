import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, getUserEngagementId } from "@/lib/session";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ nodeKey: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const engagementId = await getUserEngagementId();
    if (!engagementId) {
      return NextResponse.json({ error: "No engagement found" }, { status: 404 });
    }

    const { nodeKey } = await params;
    const node = await prisma.node.findFirst({ where: { engagementId, nodeKey } });
    if (!node) {
      return NextResponse.json({ error: "Node not found" }, { status: 404 });
    }
    if (node.status !== "complete") {
      return NextResponse.json(
        { error: "Node must be complete to lock in" },
        { status: 400 }
      );
    }

    const now = new Date();
    const updated = await prisma.node.update({
      where: { id: node.id },
      data: { lockedIn: true, lockedInAt: now, lockedInBy: user.id },
      select: { id: true, lockedIn: true, lockedInAt: true, lockedInBy: true },
    });

    return NextResponse.json({ node: updated });
  } catch (error) {
    console.error("Lock-in error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
