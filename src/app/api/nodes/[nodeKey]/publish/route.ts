import { NextRequest, NextResponse } from "next/server";
import { updateNode, updateEngagementData } from "@/lib/data-store";
import { propagateFlags } from "@/lib/cascade";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ nodeKey: string }> }
) {
  try {
    const { nodeKey } = await params;
    const { execSummary, status, triggerCascade } = await req.json();

    if (!execSummary) {
      return NextResponse.json(
        { error: "Missing exec summary" },
        { status: 400 }
      );
    }

    // Update the node itself
    const updated = updateNode(nodeKey, {
      execSummary,
      status: status || "complete",
    });

    if (!updated) {
      return NextResponse.json(
        { error: "Node not found" },
        { status: 404 }
      );
    }

    // If cascade triggered, propagate flags to downstream nodes
    let flagCount = 0;
    if (triggerCascade) {
      updateEngagementData((data) => {
        const { updatedNodes, newFlags } = propagateFlags(
          nodeKey,
          data.nodes,
          data.flags
        );
        data.nodes = updatedNodes;
        data.flags = [...data.flags, ...newFlags];
        flagCount = newFlags.length;
      });
    }

    return NextResponse.json({ node: updated, flagCount });
  } catch (error) {
    console.error("Publish error:", error);
    return NextResponse.json(
      { error: "Failed to publish" },
      { status: 500 }
    );
  }
}
