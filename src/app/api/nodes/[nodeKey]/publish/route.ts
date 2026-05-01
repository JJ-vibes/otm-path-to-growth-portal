import { NextRequest, NextResponse } from "next/server";
import { updateNode, getNodesForEngagement, applyCascadeResults } from "@/lib/data-store";
import { propagateFlags } from "@/lib/cascade";
import { prisma } from "@/lib/prisma";
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
    const { execSummary, sections, status, triggerCascade, documentUrl } = await req.json();

    // Compute backward-compatible execSummary from sections if not provided
    let finalSummary = execSummary;
    if (!finalSummary && sections?.length) {
      finalSummary = sections
        .filter((s: { displayLayer: string; content: string }) => s.displayLayer === "CHAPTER" && s.content)
        .map((s: { sectionTitle: string; content: string }) => `## ${s.sectionTitle}\n\n${s.content}`)
        .join("\n\n");
    }

    if (!finalSummary && !sections?.length) {
      return NextResponse.json({ error: "Missing content — provide execSummary or sections" }, { status: 400 });
    }

    const updated = await updateNode(nodeKey, {
      execSummary: finalSummary || "",
      status: status || "complete",
      sections: sections || undefined,
      documentUrl: documentUrl ?? undefined,
    }, engagementId);

    if (!updated) {
      return NextResponse.json({ error: "Node not found" }, { status: 404 });
    }

    let cascade: {
      cascadeTriggered: boolean;
      flaggedNodeKeys: string[];
      unlockedNodeKeys: string[];
      cascadingNodeKeys: string[];
    } = {
      cascadeTriggered: false,
      flaggedNodeKeys: [],
      unlockedNodeKeys: [],
      cascadingNodeKeys: [],
    };

    if (triggerCascade) {
      const nodes = await getNodesForEngagement(engagementId);
      const excludedConfigs = await prisma.engagementNodeConfig.findMany({
        where: { engagementId, excluded: true },
        include: { node: { select: { nodeKey: true } } },
      });
      const excludedNodeKeys = new Set(excludedConfigs.map((c) => c.node.nodeKey));
      const { updatedNodes, newFlags, unlockedNodeKeys } = propagateFlags(
        nodeKey,
        nodes,
        [],
        excludedNodeKeys
      );
      const result = await applyCascadeResults(
        engagementId,
        nodeKey,
        updatedNodes,
        newFlags,
        unlockedNodeKeys
      );
      cascade = {
        cascadeTriggered: true,
        flaggedNodeKeys: result.flaggedNodeKeys,
        unlockedNodeKeys: result.unlockedNodeKeys,
        cascadingNodeKeys: result.cascadingNodeKeys,
      };
    }

    return NextResponse.json({ node: updated, cascade });
  } catch (error) {
    console.error("Publish error:", error);
    return NextResponse.json({ error: "Failed to publish" }, { status: 500 });
  }
}
