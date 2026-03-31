import { NextRequest, NextResponse } from "next/server";
import { updateEngagementData } from "@/lib/data-store";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ nodeKey: string }> }
) {
  try {
    const { nodeKey } = await params;

    const result = updateEngagementData((data) => {
      // Mark flag as resolved
      const flag = data.flags.find(
        (f) => f.flaggedNodeKey === nodeKey && !f.resolved
      );
      if (flag) {
        flag.resolved = true;
      }

      // Set node back to complete
      const node = data.nodes.find((n) => n.nodeKey === nodeKey);
      if (node) {
        node.status = "complete";
      }

      // Check cascading nodes: if all their upstream flags are resolved,
      // return them to locked (their natural state based on dependencies)
      for (const n of data.nodes) {
        if (n.status !== "cascading") continue;

        // Check if all flags targeting this node are resolved
        const unresolvedFlags = data.flags.filter(
          (f) => f.flaggedNodeKey === n.nodeKey && !f.resolved
        );
        if (unresolvedFlags.length === 0) {
          // Check if all upstream dependencies are complete
          const allUpstreamComplete = n.dependsOn.every((depKey) => {
            const dep = data.nodes.find((d) => d.nodeKey === depKey);
            return dep && dep.status === "complete";
          });
          n.status = allUpstreamComplete ? "locked" : "locked";
        }
      }
    });

    return NextResponse.json({ success: true, engagement: result });
  } catch (error) {
    console.error("Resolve flag error:", error);
    return NextResponse.json(
      { error: "Failed to resolve flag" },
      { status: 500 }
    );
  }
}
