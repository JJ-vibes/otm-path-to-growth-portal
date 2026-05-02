export type NodeStatus = "locked" | "active" | "complete" | "flagged" | "cascading";
export type DisplayLayer = "CHAPTER" | "FULL";

export interface NodeTemplateSection {
  sectionKey: string;
  sectionTitle: string;
  sortOrder: number;
  displayLayer: DisplayLayer;
  isRequired: boolean;
  isConditional: boolean;
  description: string | null;
}

export interface NodeSectionData {
  sectionKey: string;
  sectionTitle: string;
  content: string;
  sortOrder: number;
  displayLayer: DisplayLayer;
  isInherited: boolean;
  inheritedFromNode: string | null;
}

export interface CascadeFlag {
  flaggedNodeKey: string;
  sourceNodeKey: string;
  flagType: "needs_review" | "cascading";
  sourceChangeDate: string;
  resolved: boolean;
}

export interface CascadeNode {
  nodeKey: string;
  displayName: string;
  sortOrder: number;
  isGate: boolean;
  isConditional: boolean;
  status: NodeStatus;
  dependsOn: string[];
  execSummary?: string;
  documentUrl?: string | null;
  sections?: NodeSectionData[];
  lockedIn: boolean;
  lockedInAt?: string | null;
  excluded?: boolean;
  upstreamNames: string[];
  downstreamNames: string[];
}

export interface Engagement {
  clientName: string;
  lifecycleStage: string;
  nodes: CascadeNode[];
  flags: CascadeFlag[];
}

export interface RawNode {
  nodeKey: string;
  displayName: string;
  sortOrder: number;
  isGate: boolean;
  isConditional: boolean;
  status: string;
  dependsOn: string[];
  execSummary?: string;
}

export interface RawEngagement {
  clientName: string;
  lifecycleStage: string;
  nodes: RawNode[];
  flags?: CascadeFlag[];
}

export function buildEngagement(raw: RawEngagement): Engagement {
  const keyToName = new Map(raw.nodes.map((n) => [n.nodeKey, n.displayName]));

  const downstreamMap = new Map<string, string[]>();
  for (const node of raw.nodes) {
    for (const dep of node.dependsOn) {
      const existing = downstreamMap.get(dep) || [];
      existing.push(node.displayName);
      downstreamMap.set(dep, existing);
    }
  }

  const nodes: CascadeNode[] = raw.nodes.map((node) => ({
    ...node,
    status: node.status as NodeStatus,
    lockedIn: false,
    upstreamNames: node.dependsOn.map((k) => keyToName.get(k) || k),
    downstreamNames: downstreamMap.get(node.nodeKey) || [],
  }));

  return {
    clientName: raw.clientName,
    lifecycleStage: raw.lifecycleStage,
    nodes,
    flags: raw.flags || [],
  };
}
