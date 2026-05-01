import type { CascadeFlag } from "@/data/engagement";
import type { NodeData } from "./data-store";

export interface PropagationResult {
  updatedNodes: NodeData[];
  newFlags: CascadeFlag[];
  /** Node keys that were locked-in (lockedIn === true) and should be flipped to false. */
  unlockedNodeKeys: string[];
}

/**
 * Computes the cascade impact of a change to `sourceNodeKey`. Pure function —
 * does not mutate inputs and does not write to the database.
 *
 * Behavior:
 *   - Direct/transitive downstream nodes that are `complete` or `active` → `flagged`
 *   - Direct/transitive downstream nodes that are `locked` → `cascading`
 *   - Any downstream node with `lockedIn === true` is marked for auto-unlock
 *     (returned in `unlockedNodeKeys`) — applied transactionally by
 *     `applyCascadeResults` alongside the status changes.
 */
export function propagateFlags(
  sourceNodeKey: string,
  nodes: NodeData[],
  existingFlags: CascadeFlag[],
  excludedNodeKeys: Set<string> = new Set()
): PropagationResult {
  const newFlags: CascadeFlag[] = [];
  const unlockedNodeKeys: string[] = [];
  const updatedNodes = nodes.map((n) => ({ ...n }));
  const visited = new Set<string>();
  const now = new Date().toISOString();

  function recurse(sourceKey: string) {
    const dependents = updatedNodes.filter((n) =>
      n.dependsOn.includes(sourceKey)
    );

    for (const dep of dependents) {
      if (visited.has(dep.nodeKey)) continue;
      visited.add(dep.nodeKey);

      // Excluded nodes are transparent: do not flag them or change their
      // status, but still recurse through to their downstream dependents
      // so a cascade flows through the excluded node as if it weren't there.
      if (excludedNodeKeys.has(dep.nodeKey)) {
        recurse(dep.nodeKey);
        continue;
      }

      // Auto-unlock any downstream node currently locked in.
      // We unlock regardless of whether this cascade changes its status —
      // the upstream change invalidates the prior approval.
      if (dep.lockedIn) {
        dep.lockedIn = false;
        unlockedNodeKeys.push(dep.nodeKey);
      }

      const alreadyFlagged = existingFlags.some(
        (f) => f.flaggedNodeKey === dep.nodeKey && !f.resolved
      );

      if (!alreadyFlagged) {
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
      }

      // Recurse to downstream dependents.
      recurse(dep.nodeKey);
    }
  }

  recurse(sourceNodeKey);

  return { updatedNodes, newFlags, unlockedNodeKeys };
}
