import { NextRequest, NextResponse } from "next/server";
import { updateNode, getNodesForEngagement, applyCascadeResults } from "@/lib/data-store";
import { propagateFlags } from "@/lib/cascade";
import { getUserEngagementId, getSessionUser } from "@/lib/session";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ nodeKey: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const engagementId = await getUserEngagementId();
    if (!engagementId) {
      return NextResponse.json({ error: "No engagement found" }, { status: 404 });
    }

    const { nodeKey } = await params;
    const { execSummary, status, triggerCascade } = await req.json();

    if (!execSummary) {
      return NextResponse.json({ error: "Missing exec summary" }, { status: 400 });
    }

    const updated = await updateNode(nodeKey, {
      execSummary,
      status: status || "complete",
    }, engagementId);

    if (!updated) {
      return NextResponse.json({ error: "Node not found" }, { status: 404 });
    }

    let flagCount = 0;
    if (triggerCascade) {
      const nodes = await getNodesForEngagement(engagementId);
      const { updatedNodes, newFlags } = propagateFlags(nodeKey, nodes, []);
      flagCount = await applyCascadeResults(engagementId, nodeKey, updatedNodes, newFlags);
    }

    return NextResponse.json({ node: updated, flagCount });
  } catch (error) {
    console.error("Publish error:", error);
    return NextResponse.json({ error: "Failed to publish" }, { status: 500 });
  }
}
