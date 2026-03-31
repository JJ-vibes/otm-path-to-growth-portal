"use client";

import { useState, useEffect } from "react";
import { CascadeNode, CascadeFlag, NodeStatus, Engagement } from "@/data/engagement";
import TopBar from "@/components/TopBar";
import CascadeNav from "@/components/CascadeNav";
import CascadeBanner from "@/components/CascadeBanner";
import NodeContent from "@/components/NodeContent";
import DevToggle from "@/components/DevToggle";

export default function StrategyPage() {
  const [engagement, setEngagement] = useState<Engagement | null>(null);
  const [nodes, setNodes] = useState<CascadeNode[]>([]);
  const [flags, setFlags] = useState<CascadeFlag[]>([]);
  const [selectedKey, setSelectedKey] = useState<string>("");

  useEffect(() => {
    fetch("/api/engagement")
      .then((r) => r.json())
      .then((data: Engagement) => {
        setEngagement(data);
        setNodes(data.nodes);
        setFlags(data.flags || []);
        const defaultKey =
          data.nodes.find((n) => n.status === "active")?.nodeKey ||
          data.nodes.find((n) => n.status !== "locked")?.nodeKey ||
          data.nodes[0].nodeKey;
        setSelectedKey(defaultKey);
      });
  }, []);

  if (!engagement || nodes.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-otm-light">
        <p className="text-gray-400 text-sm">Loading...</p>
      </div>
    );
  }

  const selectedNode = nodes.find((n) => n.nodeKey === selectedKey) || nodes[0];

  function handleStatusChange(nodeKey: string, status: NodeStatus) {
    setNodes((prev) =>
      prev.map((n) => (n.nodeKey === nodeKey ? { ...n, status } : n))
    );
  }

  return (
    <div className="h-screen flex flex-col bg-otm-light">
      <TopBar clientName={engagement.clientName} />
      <CascadeBanner nodes={nodes} flags={flags} />
      <div className="flex flex-1 overflow-hidden">
        <CascadeNav
          nodes={nodes}
          selectedKey={selectedKey}
          onSelect={setSelectedKey}
          clientName={engagement.clientName}
        />
        <main className="flex-1 overflow-y-auto p-8 max-w-3xl">
          <NodeContent node={selectedNode} allNodes={nodes} flags={flags} />
        </main>
      </div>
      <DevToggle nodes={nodes} onStatusChange={handleStatusChange} />
    </div>
  );
}
