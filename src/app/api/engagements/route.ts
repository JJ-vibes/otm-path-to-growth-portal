import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

// Standard Stage 1 node templates
const STAGE_1_NODES = [
  { nodeKey: "kbi", displayName: "Key Business Information", sortOrder: 1, isGate: false, isConditional: false, dependsOn: [] as string[] },
  { nodeKey: "icp_alignment", displayName: "ICP Alignment", sortOrder: 2, isGate: false, isConditional: true, dependsOn: ["kbi"] },
  { nodeKey: "comp_analysis", displayName: "Competitive Analysis", sortOrder: 3, isGate: false, isConditional: false, dependsOn: ["kbi"] },
  { nodeKey: "positioning_options", displayName: "Positioning Options", sortOrder: 4, isGate: false, isConditional: false, dependsOn: ["kbi", "icp_alignment", "comp_analysis"] },
  { nodeKey: "positioning_guide", displayName: "Positioning Guide", sortOrder: 5, isGate: true, isConditional: false, dependsOn: ["positioning_options"] },
  { nodeKey: "target_personas", displayName: "Target Personas", sortOrder: 6, isGate: false, isConditional: false, dependsOn: ["positioning_guide", "icp_alignment"] },
  { nodeKey: "offer_architecture", displayName: "Offer Architecture", sortOrder: 7, isGate: false, isConditional: true, dependsOn: ["positioning_guide", "target_personas"] },
  { nodeKey: "brand_story", displayName: "Brand Story", sortOrder: 8, isGate: false, isConditional: false, dependsOn: ["positioning_guide", "target_personas"] },
  { nodeKey: "messaging_playbook", displayName: "Messaging Playbook", sortOrder: 9, isGate: false, isConditional: false, dependsOn: ["brand_story"] },
  { nodeKey: "gtm_plan", displayName: "GTM Plan", sortOrder: 10, isGate: false, isConditional: false, dependsOn: ["messaging_playbook", "offer_architecture"] },
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

    // Create engagement
    const engagement = await prisma.engagement.create({
      data: {
        clientName: clientName.trim(),
        lifecycleStage: "Traction",
      },
    });

    // Link admin to engagement
    await prisma.engagementUser.create({
      data: { userId: user.id, engagementId: engagement.id },
    });

    // Create all 10 nodes
    const nodeMap = new Map<string, string>();
    for (const template of STAGE_1_NODES) {
      const node = await prisma.node.create({
        data: {
          engagementId: engagement.id,
          nodeKey: template.nodeKey,
          displayName: template.displayName,
          sortOrder: template.sortOrder,
          isGate: template.isGate,
          isConditional: template.isConditional,
          status: "locked",
        },
      });
      nodeMap.set(template.nodeKey, node.id);
    }

    // Create dependencies
    for (const template of STAGE_1_NODES) {
      const nodeId = nodeMap.get(template.nodeKey)!;
      for (const depKey of template.dependsOn) {
        const depId = nodeMap.get(depKey)!;
        await prisma.nodeDependency.create({
          data: { nodeId, dependsOnNodeId: depId },
        });
      }
    }

    // Set KBI to active (first node, no dependencies)
    await prisma.node.updateMany({
      where: { engagementId: engagement.id, nodeKey: "kbi" },
      data: { status: "active" },
    });

    return NextResponse.json({ engagement });
  } catch (error) {
    console.error("Create engagement error:", error);
    return NextResponse.json({ error: "Failed to create engagement" }, { status: 500 });
  }
}
