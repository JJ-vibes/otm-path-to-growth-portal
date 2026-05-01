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

    const updated = await prisma.node.update({
      where: { id: node.id },
      data: { lockedIn: false, lockedInAt: null, lockedInBy: null },
      select: { id: true, lockedIn: true },
    });

    return NextResponse.json({ node: updated });
  } catch (error) {
    console.error("Unlock error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
