"use client";

import { useState } from "react";
import { CascadeNode, NodeStatus } from "@/data/engagement";

const statuses: NodeStatus[] = [
  "complete",
  "active",
  "locked",
  "flagged",
  "cascading",
];

export default function DevToggle({
  nodes,
  onStatusChange,
}: {
  nodes: CascadeNode[];
  onStatusChange: (nodeKey: string, status: NodeStatus) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState(nodes[0]?.nodeKey || "");

  if (process.env.NODE_ENV !== "development") return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-gray-800 text-white text-xs px-3 py-1.5 rounded-lg shadow-lg hover:bg-gray-700"
      >
        {isOpen ? "Close" : "Dev"}
      </button>

      {isOpen && (
        <div className="absolute bottom-10 right-0 bg-white border border-gray-300 rounded-lg shadow-xl p-3 w-56">
          <p className="text-[10px] uppercase text-gray-400 tracking-wider mb-2">
            State Toggle
          </p>
          <select
            value={selectedNode}
            onChange={(e) => setSelectedNode(e.target.value)}
            className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 mb-2 text-gray-700"
          >
            {nodes.map((n) => (
              <option key={n.nodeKey} value={n.nodeKey}>
                {n.displayName}
              </option>
            ))}
          </select>
          <div className="flex flex-wrap gap-1">
            {statuses.map((s) => (
              <button
                key={s}
                onClick={() => onStatusChange(selectedNode, s)}
                className="text-[10px] px-2 py-1 border border-gray-200 rounded hover:bg-gray-100 text-gray-600"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
