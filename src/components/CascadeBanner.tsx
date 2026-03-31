import { CascadeNode, CascadeFlag } from "@/data/engagement";

export default function CascadeBanner({
  nodes,
  flags,
}: {
  nodes: CascadeNode[];
  flags: CascadeFlag[];
}) {
  const flaggedNodes = nodes.filter(
    (n) => n.status === "flagged" || n.status === "cascading"
  );

  if (flaggedNodes.length === 0) return null;

  // Find the source node name from the first unresolved flag
  const unresolvedFlag = flags.find((f) => !f.resolved);
  const sourceNode = unresolvedFlag
    ? nodes.find((n) => n.nodeKey === unresolvedFlag.sourceNodeKey)
    : null;

  return (
    <div className="bg-[#fffbeb] border-b border-[#f59e0b] px-6 py-3">
      <div className="flex items-center gap-2">
        <span className="text-amber-600 text-base">⚠</span>
        <p className="text-[#92400e] text-sm">
          <span className="font-medium">Upstream change detected</span>
          {" — "}
          {sourceNode && (
            <>
              The <strong>{sourceNode.displayName}</strong> was revised.{" "}
            </>
          )}
          {flaggedNodes.length} downstream{" "}
          {flaggedNodes.length === 1 ? "deliverable" : "deliverables"} may need
          updates.
        </p>
      </div>
    </div>
  );
}
