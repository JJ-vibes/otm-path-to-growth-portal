import { NextRequest, NextResponse } from "next/server";
import { getEngagementFresh, getFlagForNode } from "@/lib/data-store";
import { getUserEngagementId } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ nodeKey: string }> }
) {
  const engagementId = await getUserEngagementId();
  if (!engagementId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { nodeKey } = await params;
  const engagement = await getEngagementFresh(engagementId);
  const node = engagement.nodes.find((n) => n.nodeKey === nodeKey);

  if (!node) {
    return NextResponse.json({ error: "Node not found" }, { status: 404 });
  }

  const flag = await getFlagForNode(nodeKey, engagementId);

  return NextResponse.json({ node, flag: flag || null });
}
