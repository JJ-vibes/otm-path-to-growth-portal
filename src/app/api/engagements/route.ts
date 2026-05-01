import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

// Standard Stage 1 node templates (7-node cascade)
const STAGE_1_NODES = [
  { nodeKey: "key-business-info", displayName: "Key Business Information", sortOrder: 1, isGate: false, isConditional: false, dependsOn: [] as string[] },
  { nodeKey: "ideal-client-profile", displayName: "Ideal Client Profile", sortOrder: 2, isGate: false, isConditional: false, dependsOn: ["key-business-info"] },
  { nodeKey: "competitive-analysis", displayName: "Competitive & Market Analysis", sortOrder: 3, isGate: false, isConditional: false, dependsOn: ["key-business-info"] },
  { nodeKey: "positioning", displayName: "Positioning", sortOrder: 4, isGate: true, isConditional: false, dependsOn: ["key-business-info", "ideal-client-profile", "competitive-analysis"] },
  { nodeKey: "what-are-we-selling", displayName: "What Are We Selling", sortOrder: 5, isGate: false, isConditional: true, dependsOn: ["positioning", "ideal-client-profile"] },
  { nodeKey: "messaging-playbook", displayName: "Messaging Playbook", sortOrder: 6, isGate: false, isConditional: false, dependsOn: ["positioning"] },
  { nodeKey: "gtm-plan", displayName: "Go-to-Market Plan", sortOrder: 7, isGate: false, isConditional: false, dependsOn: ["messaging-playbook", "what-are-we-selling"] },
];

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { clientName } = await req.json();
    if (!clientName?.trim()) {
      return NextResponse.json({ error: "Client name is required" }, { status: 400 });
    }

    // Wrap the entire setup in a transaction so a partial failure rolls
    // back cleanly — otherwise the client sees an error while a half-built
    // engagement is left in the database.
    const engagement = await prisma.$transaction(async (tx) => {
      const eng = await tx.engagement.create({
        data: {
          clientName: clientName.trim(),
          lifecycleStage: "Traction",
        },
      });

      await tx.engagementUser.create({
        data: { userId: user.id, engagementId: eng.id },
      });

      const nodeMap = new Map<string, string>();
      for (const template of STAGE_1_NODES) {
        const node = await tx.node.create({
          data: {
            engagementId: eng.id,
            nodeKey: template.nodeKey,
            displayName: template.displayName,
            sortOrder: template.sortOrder,
            isGate: template.isGate,
            isConditional: template.isConditional,
            // KBI starts active; everything else locked.
            status: template.nodeKey === "key-business-info" ? "active" : "locked",
          },
        });
        nodeMap.set(template.nodeKey, node.id);
      }

      for (const template of STAGE_1_NODES) {
        const nodeId = nodeMap.get(template.nodeKey)!;
        for (const depKey of template.dependsOn) {
          const depId = nodeMap.get(depKey)!;
          await tx.nodeDependency.create({
            data: { nodeId, dependsOnNodeId: depId },
          });
        }
      }

      return eng;
    });

    return NextResponse.json({ engagement });
  } catch (error) {
    console.error("Create engagement error:", error);
    return NextResponse.json({ error: "Failed to create engagement" }, { status: 500 });
  }
}
