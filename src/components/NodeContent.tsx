import { CascadeNode, CascadeFlag } from "@/data/engagement";
import CompleteNodeView from "./CompleteNodeView";
import ActiveNodeView from "./ActiveNodeView";
import LockedNodeView from "./LockedNodeView";
import FlaggedNodeView from "./FlaggedNodeView";

export default function NodeContent({
  node,
  allNodes,
  flags,
}: {
  node: CascadeNode;
  allNodes: CascadeNode[];
  flags: CascadeFlag[];
}) {
  switch (node.status) {
    case "complete":
      return <CompleteNodeView node={node} />;
    case "active":
      return <ActiveNodeView node={node} />;
    case "locked":
      return <LockedNodeView node={node} allNodes={allNodes} />;
    case "flagged": {
      const flag = flags.find(
        (f) => f.flaggedNodeKey === node.nodeKey && !f.resolved
      );
      const sourceNode = flag
        ? allNodes.find((n) => n.nodeKey === flag.sourceNodeKey)
        : undefined;
      return (
        <FlaggedNodeView
          node={node}
          sourceNodeName={sourceNode?.displayName}
        />
      );
    }
    case "cascading":
      return <LockedNodeView node={node} allNodes={allNodes} />;
    default:
      return null;
  }
}
