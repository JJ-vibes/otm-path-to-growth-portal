import { prisma } from "./prisma";
import type { Engagement, CascadeNode, CascadeFlag, NodeStatus } from "@/data/engagement";

export interface NodeData {
  nodeKey: string;
  displayName: string;
  sortOrder: number;
  isGate: boolean;
  isConditional: boolean;
  status: string;
  dependsOn: string[];
  execSummary?: string;
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
              versions: { where: { isCurrent: true }, take: 1 },
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
              versions: { where: { isCurrent: true }, take: 1 },
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

  const nodes: CascadeNode[] = engagement.nodes.map((node) => ({
    nodeKey: node.nodeKey,
    displayName: node.displayName,
    sortOrder: node.sortOrder,
    isGate: node.isGate,
    isConditional: node.isConditional,
    status: node.status as NodeStatus,
    dependsOn: node.dependsOn.map((d) => d.dependsOnNode.nodeKey),
    execSummary: node.versions[0]?.execSummary ?? undefined,
    upstreamNames: node.dependsOn.map((d) => d.dependsOnNode.displayName),
    downstreamNames: node.dependedOnBy.map((d) => d.node.displayName),
  }));

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
              versions: { where: { isCurrent: true }, take: 1 },
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
              versions: { where: { isCurrent: true }, take: 1 },
            },
          },
        },
      });

  const flags = await prisma.cascadeFlag.findMany({
    where: {
      flaggedNode: { engagementId: engagement.id },
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
  }));

  return {
    id: engagement.id,
    clientName: engagement.clientName,
    lifecycleStage: engagement.lifecycleStage,
    nodes,
    flags: flags.map((f) => ({
      flaggedNodeKey: "",
      sourceNodeKey: "",
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
  updates: Partial<Pick<NodeData, "status" | "execSummary">>,
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
    await prisma.nodeVersion.create({
      data: {
        nodeId: node.id,
        versionNumber: (lastVersion?.versionNumber ?? 0) + 1,
        execSummary: updates.execSummary,
        isCurrent: true,
      },
    });
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
              versions: { where: { isCurrent: true }, take: 1 },
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
              versions: { where: { isCurrent: true }, take: 1 },
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
  }));
}

/**
 * Apply cascade flag propagation results to the database.
 */
export async function applyCascadeResults(
  engagementId: string,
  sourceNodeKey: string,
  updatedNodes: NodeData[],
  newFlags: CascadeFlag[]
): Promise<number> {
  // Update node statuses
  for (const node of updatedNodes) {
    await prisma.node.updateMany({
      where: { engagementId, nodeKey: node.nodeKey },
      data: { status: node.status as NodeStatus },
    });
  }

  // Create flag records
  for (const flag of newFlags) {
    const flaggedNode = await prisma.node.findFirst({
      where: { engagementId, nodeKey: flag.flaggedNodeKey },
    });
    const sourceNode = await prisma.node.findFirst({
      where: { engagementId, nodeKey: flag.sourceNodeKey },
    });

    if (flaggedNode && sourceNode) {
      await prisma.cascadeFlag.create({
        data: {
          flaggedNodeId: flaggedNode.id,
          sourceNodeId: sourceNode.id,
          flagType: flag.flagType === "needs_review" ? "needs_review" : "cascading",
          resolved: false,
        },
      });
    }
  }

  return newFlags.length;
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
