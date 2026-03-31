import fs from "fs";
import path from "path";
import {
  buildEngagement,
  type Engagement,
  type RawEngagement,
  type CascadeFlag,
} from "@/data/engagement";

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

interface EngagementData {
  clientName: string;
  lifecycleStage: string;
  nodes: NodeData[];
  flags: CascadeFlag[];
}

const DATA_PATH = path.join(process.cwd(), "src/data/ep-engagement.json");

function readData(): EngagementData {
  const raw = fs.readFileSync(DATA_PATH, "utf-8");
  const data = JSON.parse(raw);
  if (!data.flags) data.flags = [];
  return data;
}

function writeData(data: EngagementData): void {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), "utf-8");
}

export function getEngagementData(): EngagementData {
  return readData();
}

export function getEngagementFresh(): Engagement {
  const raw = readData();
  return buildEngagement(raw as RawEngagement);
}

export function updateNode(
  nodeKey: string,
  updates: Partial<Pick<NodeData, "status" | "execSummary">>
): NodeData | null {
  const data = readData();
  const node = data.nodes.find((n) => n.nodeKey === nodeKey);
  if (!node) return null;

  if (updates.status !== undefined) node.status = updates.status;
  if (updates.execSummary !== undefined) node.execSummary = updates.execSummary;

  writeData(data);
  return node;
}

export function updateEngagementData(
  updater: (data: EngagementData) => void
): EngagementData {
  const data = readData();
  updater(data);
  writeData(data);
  return data;
}

export function getFlags(): CascadeFlag[] {
  return readData().flags;
}

export function getFlagForNode(nodeKey: string): CascadeFlag | undefined {
  return readData().flags.find(
    (f) => f.flaggedNodeKey === nodeKey && !f.resolved
  );
}
