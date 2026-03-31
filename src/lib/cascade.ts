import type { CascadeFlag } from "@/data/engagement";
import type { NodeData } from "./data-store";

interface PropagationResult {
  updatedNodes: NodeData[];
  newFlags: CascadeFlag[];
}

export function propagateFlags(
  sourceNodeKey: string,
  nodes: NodeData[],
  existingFlags: CascadeFlag[]
): PropagationResult {
  const newFlags: CascadeFlag[] = [];
  const updatedNodes = nodes.map((n) => ({ ...n }));
  const visited = new Set<string>();
  const now = new Date().toISOString();

  function recurse(sourceKey: string) {
    // Find all nodes that depend on sourceKey
    const dependents = updatedNodes.filter((n) =>
      n.dependsOn.includes(sourceKey)
    );

    for (const dep of dependents) {
      if (visited.has(dep.nodeKey)) continue;
      visited.add(dep.nodeKey);

      // Skip if already flagged/cascading from this cascade
      const alreadyFlagged = existingFlags.some(
        (f) =>
          f.flaggedNodeKey === dep.nodeKey &&
          !f.resolved
      );
      if (alreadyFlagged) continue;

      const prevStatus = dep.status;

      if (prevStatus === "complete" || prevStatus === "active") {
        dep.status = "flagged";
        newFlags.push({
          flaggedNodeKey: dep.nodeKey,
          sourceNodeKey,
          flagType: "needs_review",
          sourceChangeDate: now,
          resolved: false,
        });
      } else if (prevStatus === "locked") {
        dep.status = "cascading";
        newFlags.push({
          flaggedNodeKey: dep.nodeKey,
          sourceNodeKey,
          flagType: "cascading",
          sourceChangeDate: now,
          resolved: false,
        });
      }

      // Recurse to downstream dependents
      recurse(dep.nodeKey);
    }
  }

  recurse(sourceNodeKey);

  return { updatedNodes, newFlags };
}
