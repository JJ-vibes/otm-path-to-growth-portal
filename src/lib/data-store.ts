import { prisma } from "./prisma";
import type { Engagement, CascadeNode, CascadeFlag, NodeStatus, NodeSectionData } from "@/data/engagement";

export interface NodeData {
  nodeKey: string;
  displayName: string;
  sortOrder: number;
  isGate: boolean;
  isConditional: boolean;
  status: string;
  dependsOn: string[];
  execSummary?: string;
  lockedIn: boolean;
}

/**
 * Get engagement by ID (or the first one if no ID provided).
 * Returns the same shape as the old JSON-based getEngagementFresh().
 */
export async function getEngagementFresh(engagementId?: string): Promise<Engagement> {
  const engagement = engagementId
    ? await prisma.engagement.findUniqueOrThrow({
        where: { id: engagementId },
        include: {
          nodes: {
            orderBy: { sortOrder: "asc" },
            include: {
              dependsOn: { include: { dependsOnNode: true } },
              dependedOnBy: { include: { node: true } },
              versions: {
                where: { isCurrent: true },
                take: 1,
                include: { sections: { orderBy: { sortOrder: "asc" } } },
              },
              configs: { where: { engagementId } },
            },
          },
        },
      })
    : await prisma.engagement.findFirstOrThrow({
        include: {
          nodes: {
            orderBy: { sortOrder: "asc" },
            include: {
              dependsOn: { include: { dependsOnNode: true } },
              dependedOnBy: { include: { node: true } },
              versions: {
                where: { isCurrent: true },
                take: 1,
                include: { sections: { orderBy: { sortOrder: "asc" } } },
              },
              configs: true,
            },
          },
        },
      });

  const flags = await prisma.cascadeFlag.findMany({
    where: {
      flaggedNode: { engagementId: engagement.id },
      resolved: false,
    },
    include: {
      flaggedNode: true,
      sourceNode: true,
    },
  });

  const cascadeFlags: CascadeFlag[] = flags.map((f) => ({
    flaggedNodeKey: f.flaggedNode.nodeKey,
    sourceNodeKey: f.sourceNode.nodeKey,
    flagType: f.flagType === "needs_review" ? "needs_review" : "cascading",
    sourceChangeDate: f.sourceChangeDate.toISOString(),
    resolved: f.resolved,
  }));

  const nodes: CascadeNode[] = engagement.nodes.map((node) => {
    const currentVersion = node.versions[0];
    const sections = currentVersion?.sections?.length
      ? currentVersion.sections.map((s) => ({
          sectionKey: s.sectionKey,
          sectionTitle: s.sectionTitle,
          content: s.content,
          sortOrder: s.sortOrder,
          displayLayer: s.displayLayer as "CHAPTER" | "FULL",
          isInherited: s.isInherited,
          inheritedFromNode: s.inheritedFromNode,
        }))
      : undefined;

    const cfg = node.configs?.[0];
    return {
      nodeKey: node.nodeKey,
      displayName: node.displayName,
      sortOrder: node.sortOrder,
      isGate: node.isGate,
      isConditional: node.isConditional,
      status: node.status as NodeStatus,
      dependsOn: node.dependsOn.map((d) => d.dependsOnNode.nodeKey),
      execSummary: currentVersion?.execSummary ?? undefined,
      documentUrl: currentVersion?.documentUrl ?? null,
      sections,
      lockedIn: node.lockedIn,
      lockedInAt: node.lockedInAt?.toISOString() ?? null,
      excluded: cfg?.excluded ?? false,
      upstreamNames: node.dependsOn.map((d) => d.dependsOnNode.displayName),
      downstreamNames: node.dependedOnBy.map((d) => d.node.displayName),
    };
  });

  return {
    clientName: engagement.clientName,
    lifecycleStage: engagement.lifecycleStage,
    nodes,
    flags: cascadeFlags,
  };
}

/**
 * Get raw engagement data (flat node list) for admin operations.
 */
export async function getEngagementData(engagementId?: string) {
  const engagement = engagementId
    ? await prisma.engagement.findUniqueOrThrow({
        where: { id: engagementId },
        include: {
          nodes: {
            orderBy: { sortOrder: "asc" },
            include: {
              dependsOn: { include: { dependsOnNode: true } },
              versions: {
                where: { isCurrent: true },
                take: 1,
                include: { sections: { orderBy: { sortOrder: "asc" } } },
              },
            },
          },
        },
      })
    : await prisma.engagement.findFirstOrThrow({
        include: {
          nodes: {
            orderBy: { sortOrder: "asc" },
            include: {
              dependsOn: { include: { dependsOnNode: true } },
              versions: {
                where: { isCurrent: true },
                take: 1,
                include: { sections: { orderBy: { sortOrder: "asc" } } },
              },
            },
          },
        },
      });

  const flags = await prisma.cascadeFlag.findMany({
    where: {
      flaggedNode: { engagementId: engagement.id },
    },
    include: {
      flaggedNode: true,
      sourceNode: true,
    },
  });

  const nodes: NodeData[] = engagement.nodes.map((node) => ({
    nodeKey: node.nodeKey,
    displayName: node.displayName,
    sortOrder: node.sortOrder,
    isGate: node.isGate,
    isConditional: node.isConditional,
    status: node.status,
    dependsOn: node.dependsOn.map((d) => d.dependsOnNode.nodeKey),
    execSummary: node.versions[0]?.execSummary ?? undefined,
    lockedIn: node.lockedIn,
  }));

  return {
    id: engagement.id,
    clientName: engagement.clientName,
    lifecycleStage: engagement.lifecycleStage,
    nodes,
    flags: flags.map((f) => ({
      flaggedNodeKey: f.flaggedNode.nodeKey,
      sourceNodeKey: f.sourceNode.nodeKey,
      flagType: f.flagType as "needs_review" | "cascading",
      sourceChangeDate: f.sourceChangeDate.toISOString(),
      resolved: f.resolved,
    })),
  };
}

/**
 * Update a node's status and/or exec summary (creates a new version).
 */
export async function updateNode(
  nodeKey: string,
  updates: Partial<Pick<NodeData, "status" | "execSummary">> & {
    documentUrl?: string | null;
    sections?: Array<{
      sectionKey: string;
      sectionTitle: string;
      content: string;
      sortOrder: number;
      displayLayer: string;
      isInherited?: boolean;
      inheritedFromNode?: string | null;
    }>;
  },
  engagementId?: string
): Promise<NodeData | null> {
  const node = await prisma.node.findFirst({
    where: engagementId
      ? { nodeKey, engagementId }
      : { nodeKey },
    include: {
      dependsOn: { include: { dependsOnNode: true } },
      versions: { where: { isCurrent: true }, take: 1 },
    },
  });

  if (!node) return null;

  // Update status if provided
  if (updates.status) {
    await prisma.node.update({
      where: { id: node.id },
      data: { status: updates.status as NodeStatus },
    });
  }

  // Create new version if exec summary is provided
  if (updates.execSummary !== undefined) {
    // Mark existing current version as not current
    await prisma.nodeVersion.updateMany({
      where: { nodeId: node.id, isCurrent: true },
      data: { isCurrent: false },
    });

    const lastVersion = node.versions[0];
    // If a fresh document was just uploaded (`updates.documentUrl` is set),
    // the source-of-truth .docx matches portal state — sync is clean.
    // Otherwise the publish came from in-portal section edits, so the existing
    // .docx is stale relative to the new portal content.
    const docxOutOfSync = updates.documentUrl == null;
    const newVersion = await prisma.nodeVersion.create({
      data: {
        nodeId: node.id,
        versionNumber: (lastVersion?.versionNumber ?? 0) + 1,
        execSummary: updates.execSummary,
        documentUrl: updates.documentUrl ?? lastVersion?.documentUrl ?? null,
        docxOutOfSync,
        isCurrent: true,
      },
    });

    // Create sections if provided
    if (updates.sections?.length) {
      await prisma.nodeSection.createMany({
        data: updates.sections.map((s) => ({
          nodeVersionId: newVersion.id,
          sectionKey: s.sectionKey,
          sectionTitle: s.sectionTitle,
          content: s.content,
          sortOrder: s.sortOrder,
          displayLayer: s.displayLayer as "CHAPTER" | "FULL",
          isInherited: s.isInherited ?? false,
          inheritedFromNode: s.inheritedFromNode ?? null,
        })),
      });
    }
  }

  // Return updated node data
  const updated = await prisma.node.findUnique({
    where: { id: node.id },
    include: {
      dependsOn: { include: { dependsOnNode: true } },
      versions: { where: { isCurrent: true }, take: 1 },
    },
  });

  if (!updated) return null;

  return {
    nodeKey: updated.nodeKey,
    displayName: updated.displayName,
    sortOrder: updated.sortOrder,
    isGate: updated.isGate,
    isConditional: updated.isConditional,
    status: updated.status,
    dependsOn: updated.dependsOn.map((d) => d.dependsOnNode.nodeKey),
    execSummary: updated.versions[0]?.execSummary ?? undefined,
    lockedIn: updated.lockedIn,
  };
}

/**
 * Get active (unresolved) flag for a node.
 */
export async function getFlagForNode(
  nodeKey: string,
  engagementId?: string
): Promise<CascadeFlag | undefined> {
  const flag = await prisma.cascadeFlag.findFirst({
    where: {
      flaggedNode: engagementId
        ? { nodeKey, engagementId }
        : { nodeKey },
      resolved: false,
    },
    include: {
      flaggedNode: true,
      sourceNode: true,
    },
  });

  if (!flag) return undefined;

  return {
    flaggedNodeKey: flag.flaggedNode.nodeKey,
    sourceNodeKey: flag.sourceNode.nodeKey,
    flagType: flag.flagType === "needs_review" ? "needs_review" : "cascading",
    sourceChangeDate: flag.sourceChangeDate.toISOString(),
    resolved: flag.resolved,
  };
}

/**
 * Get all nodes for an engagement as NodeData[] (used by cascade logic).
 */
export async function getNodesForEngagement(engagementId?: string): Promise<NodeData[]> {
  const engagement = engagementId
    ? await prisma.engagement.findUniqueOrThrow({
        where: { id: engagementId },
        include: {
          nodes: {
            orderBy: { sortOrder: "asc" },
            include: {
              dependsOn: { include: { dependsOnNode: true } },
              versions: {
                where: { isCurrent: true },
                take: 1,
                include: { sections: { orderBy: { sortOrder: "asc" } } },
              },
            },
          },
        },
      })
    : await prisma.engagement.findFirstOrThrow({
        include: {
          nodes: {
            orderBy: { sortOrder: "asc" },
            include: {
              dependsOn: { include: { dependsOnNode: true } },
              versions: {
                where: { isCurrent: true },
                take: 1,
                include: { sections: { orderBy: { sortOrder: "asc" } } },
              },
            },
          },
        },
      });

  return engagement.nodes.map((node) => ({
    nodeKey: node.nodeKey,
    displayName: node.displayName,
    sortOrder: node.sortOrder,
    isGate: node.isGate,
    isConditional: node.isConditional,
    status: node.status,
    dependsOn: node.dependsOn.map((d) => d.dependsOnNode.nodeKey),
    execSummary: node.versions[0]?.execSummary ?? undefined,
    lockedIn: node.lockedIn,
  }));
}

export interface CascadeApplyResult {
  flagCount: number;
  flaggedNodeKeys: string[];
  cascadingNodeKeys: string[];
  unlockedNodeKeys: string[];
}

/**
 * Apply cascade flag propagation results to the database transactionally.
 * Status changes, new flag rows, and lockedIn auto-unlocks all succeed
 * together or all fail together.
 */
export async function applyCascadeResults(
  engagementId: string,
  _sourceNodeKey: string,
  updatedNodes: NodeData[],
  newFlags: CascadeFlag[],
  unlockedNodeKeys: string[] = []
): Promise<CascadeApplyResult> {
  // Resolve all node keys → IDs in one query so the transaction is short.
  const allKeys = new Set<string>([
    ...updatedNodes.map((n) => n.nodeKey),
    ...newFlags.flatMap((f) => [f.flaggedNodeKey, f.sourceNodeKey]),
    ...unlockedNodeKeys,
  ]);
  const dbNodes = await prisma.node.findMany({
    where: { engagementId, nodeKey: { in: Array.from(allKeys) } },
    select: { id: true, nodeKey: true },
  });
  const keyToId = new Map(dbNodes.map((n) => [n.nodeKey, n.id]));

  const flaggedNodeKeys: string[] = [];
  const cascadingNodeKeys: string[] = [];

  await prisma.$transaction([
    ...updatedNodes
      .map((node) => {
        const id = keyToId.get(node.nodeKey);
        if (!id) return null;
        if (node.status === "flagged") flaggedNodeKeys.push(node.nodeKey);
        if (node.status === "cascading") cascadingNodeKeys.push(node.nodeKey);
        return prisma.node.update({
          where: { id },
          data: { status: node.status as NodeStatus },
        });
      })
      .filter((p): p is NonNullable<typeof p> => p !== null),
    ...unlockedNodeKeys
      .map((nodeKey) => {
        const id = keyToId.get(nodeKey);
        if (!id) return null;
        return prisma.node.update({
          where: { id },
          data: { lockedIn: false, lockedInAt: null, lockedInBy: null },
        });
      })
      .filter((p): p is NonNullable<typeof p> => p !== null),
    ...newFlags
      .map((flag) => {
        const flaggedId = keyToId.get(flag.flaggedNodeKey);
        const sourceId = keyToId.get(flag.sourceNodeKey);
        if (!flaggedId || !sourceId) return null;
        return prisma.cascadeFlag.create({
          data: {
            flaggedNodeId: flaggedId,
            sourceNodeId: sourceId,
            flagType: flag.flagType === "needs_review" ? "needs_review" : "cascading",
            resolved: false,
          },
        });
      })
      .filter((p): p is NonNullable<typeof p> => p !== null),
  ]);

  return {
    flagCount: newFlags.length,
    flaggedNodeKeys,
    cascadingNodeKeys,
    unlockedNodeKeys,
  };
}

/**
 * Resolve a flag on a node and clean up cascading states.
 */
export async function resolveFlag(
  nodeKey: string,
  engagementId?: string
): Promise<Engagement> {
  // Find the node
  const node = await prisma.node.findFirst({
    where: engagementId ? { nodeKey, engagementId } : { nodeKey },
  });

  if (!node) throw new Error(`Node ${nodeKey} not found`);

  const actualEngagementId = node.engagementId;

  // Resolve the flag
  await prisma.cascadeFlag.updateMany({
    where: {
      flaggedNodeId: node.id,
      resolved: false,
    },
    data: {
      resolved: true,
      resolvedAt: new Date(),
    },
  });

  // Set node back to complete
  await prisma.node.update({
    where: { id: node.id },
    data: { status: "complete" },
  });

  // Clean up cascading nodes that have no remaining unresolved flags
  const cascadingNodes = await prisma.node.findMany({
    where: {
      engagementId: actualEngagementId,
      status: "cascading",
    },
  });

  for (const cn of cascadingNodes) {
    const unresolvedFlags = await prisma.cascadeFlag.count({
      where: { flaggedNodeId: cn.id, resolved: false },
    });
    if (unresolvedFlags === 0) {
      await prisma.node.update({
        where: { id: cn.id },
        data: { status: "locked" },
      });
    }
  }

  return getEngagementFresh(actualEngagementId);
}

/**
 * Get the first engagement's ID (for routes that don't have it yet).
 */
export async function getDefaultEngagementId(): Promise<string> {
  const engagement = await prisma.engagement.findFirstOrThrow();
  return engagement.id;
}

/**
 * Get sections for the current version of a node.
 */
export async function getNodeSections(
  nodeKey: string,
  engagementId: string
): Promise<NodeSectionData[]> {
  const node = await prisma.node.findFirst({
    where: { nodeKey, engagementId },
    include: {
      versions: {
        where: { isCurrent: true },
        take: 1,
        include: {
          sections: { orderBy: { sortOrder: "asc" } },
        },
      },
    },
  });

  if (!node || !node.versions[0]) return [];

  return node.versions[0].sections.map((s) => ({
    sectionKey: s.sectionKey,
    sectionTitle: s.sectionTitle,
    content: s.content,
    sortOrder: s.sortOrder,
    displayLayer: s.displayLayer as "CHAPTER" | "FULL",
    isInherited: s.isInherited,
    inheritedFromNode: s.inheritedFromNode,
  }));
}
