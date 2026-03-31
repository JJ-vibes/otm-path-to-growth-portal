import { NextRequest, NextResponse } from "next/server";
import { getEngagementFresh, getFlagForNode } from "@/lib/data-store";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ nodeKey: string }> }
) {
  const { nodeKey } = await params;
  const engagement = getEngagementFresh();
  const node = engagement.nodes.find((n) => n.nodeKey === nodeKey);

  if (!node) {
    return NextResponse.json({ error: "Node not found" }, { status: 404 });
  }

  const flag = getFlagForNode(nodeKey);

  return NextResponse.json({ node, flag: flag || null });
}
