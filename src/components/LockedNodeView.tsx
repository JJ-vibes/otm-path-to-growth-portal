import { CascadeNode } from "@/data/engagement";

export default function LockedNodeView({
  node,
  allNodes,
}: {
  node: CascadeNode;
  allNodes: CascadeNode[];
}) {
  const incompleteUpstream = node.dependsOn
    .map((key) => allNodes.find((n) => n.nodeKey === key))
    .filter((n) => n && n.status !== "complete");

  const activeUpstream = incompleteUpstream.filter(
    (n) => n?.status === "active"
  );

  const gate = allNodes.find((n) => n.isGate);
  const isDownstreamOfGate =
    gate && gate.status !== "complete" && isTransitivelyDependentOn(node, gate.nodeKey, allNodes);

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <rect x="5" y="11" width="14" height="10" rx="2" />
          <path d="M8 11V7a4 4 0 118 0v4" />
        </svg>
        <span className="text-xs text-gray-400 font-medium">Locked</span>
      </div>

      <h1 className="font-outfit font-bold text-gray-400 text-[22px] mb-4">
        {node.displayName}
      </h1>

      <p className="text-otm-gray text-[15px] leading-relaxed mb-4">
        This deliverable will begin after{" "}
        {incompleteUpstream.map((n) => n!.displayName).join(" and ")}{" "}
        {incompleteUpstream.length === 1 ? "is" : "are"} finalized.
      </p>

      {isDownstreamOfGate && (
        <p className="text-sm text-gray-500 italic mb-4">
          The Positioning Guide must be finalized before this work can begin. It
          is the strategic gate that locks the direction for all downstream
          deliverables.
        </p>
      )}

      {activeUpstream.length > 0 && (
        <p className="text-sm text-otm-teal">
          Currently waiting on:{" "}
          <span className="font-medium">
            {activeUpstream.map((n) => n!.displayName).join(", ")}
          </span>
          , which is in progress.
        </p>
      )}
    </div>
  );
}

function isTransitivelyDependentOn(
  node: CascadeNode,
  targetKey: string,
  allNodes: CascadeNode[]
): boolean {
  if (node.dependsOn.includes(targetKey)) return true;
  return node.dependsOn.some((depKey) => {
    const dep = allNodes.find((n) => n.nodeKey === depKey);
    return dep ? isTransitivelyDependentOn(dep, targetKey, allNodes) : false;
  });
}
