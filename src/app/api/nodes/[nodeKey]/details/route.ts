import { NextRequest, NextResponse } from "next/server";
import { getEngagementFresh, getFlagForNode, getNodeSections } from "@/lib/data-store";
import { prisma } from "@/lib/prisma";
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
  const sections = await getNodeSections(nodeKey, engagementId);

  // Surface the current version's docx-sync metadata for the admin editor.
  const dbNode = await prisma.node.findFirst({
    where: { nodeKey, engagementId },
    include: {
      versions: { where: { isCurrent: true }, take: 1 },
    },
  });
  const currentVersion = dbNode?.versions[0];
  const versionMeta = currentVersion
    ? {
        id: currentVersion.id,
        versionNumber: currentVersion.versionNumber,
        documentUrl: currentVersion.documentUrl,
        docxOutOfSync: currentVersion.docxOutOfSync,
        docxRegeneratedAt: currentVersion.docxRegeneratedAt?.toISOString() ?? null,
      }
    : null;

  return NextResponse.json({
    node,
    flag: flag || null,
    sections,
    currentVersion: versionMeta,
  });
}
