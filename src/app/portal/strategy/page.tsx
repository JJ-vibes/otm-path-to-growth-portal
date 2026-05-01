"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CascadeNode, CascadeFlag, NodeStatus, Engagement } from "@/data/engagement";
import TopBar from "@/components/TopBar";
import CascadeNav from "@/components/CascadeNav";
import CascadeBanner from "@/components/CascadeBanner";
import NodeContent from "@/components/NodeContent";
import NodeProgressionStrip from "@/components/NodeProgressionStrip";
import DevToggle from "@/components/DevToggle";

// Page-level Suspense boundary required by Next.js when useSearchParams is
// used in the client tree, otherwise the prerender step bails out.
export default function StrategyPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen flex items-center justify-center bg-otm-light">
          <p className="text-gray-400 text-sm">Loading...</p>
        </div>
      }
    >
      <StrategyPageContent />
    </Suspense>
  );
}

function StrategyPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlNodeKey = searchParams.get("node");

  const [engagement, setEngagement] = useState<Engagement | null>(null);
  const [nodes, setNodes] = useState<CascadeNode[]>([]);
  const [flags, setFlags] = useState<CascadeFlag[]>([]);
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    fetch("/api/engagement")
      .then((r) => r.json())
      .then((data: Engagement) => {
        setEngagement(data);
        setNodes(data.nodes);
        setFlags(data.flags || []);

        // If the URL doesn't already specify a node, set a sensible default
        // and replace (don't push) so it doesn't add a useless history entry.
        if (!urlNodeKey || !data.nodes.some((n) => n.nodeKey === urlNodeKey)) {
          const defaultKey =
            data.nodes.find((n) => n.status === "active")?.nodeKey ||
            data.nodes.find((n) => n.status !== "locked")?.nodeKey ||
            data.nodes[0].nodeKey;
          router.replace(`/portal/strategy?node=${defaultKey}`);
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!engagement || nodes.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-otm-light">
        <p className="text-gray-400 text-sm">Loading...</p>
      </div>
    );
  }

  const selectedKey =
    (urlNodeKey && nodes.find((n) => n.nodeKey === urlNodeKey)?.nodeKey) ||
    nodes[0].nodeKey;
  const selectedNode = nodes.find((n) => n.nodeKey === selectedKey) || nodes[0];

  function handleStatusChange(nodeKey: string, status: NodeStatus) {
    setNodes((prev) =>
      prev.map((n) => (n.nodeKey === nodeKey ? { ...n, status } : n))
    );
  }

  function handleNodeSelect(key: string) {
    // Push a new history entry so browser back returns to the previous node,
    // not all the way to /portal.
    router.push(`/portal/strategy?node=${key}`);
    setNavOpen(false);
  }

  return (
    <div className="h-screen flex flex-col bg-otm-light">
      <TopBar clientName={engagement.clientName} clientLogoUrl={engagement.clientLogoUrl} />
      <CascadeBanner nodes={nodes} flags={flags} />

      {/* Mobile nav toggle */}
      <div className="md:hidden px-4 py-2 bg-white border-b border-gray-200">
        <button
          onClick={() => setNavOpen(!navOpen)}
          className="flex items-center gap-2 text-sm text-otm-teal"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          {selectedNode.displayName}
          <svg className={`w-3 h-3 transition-transform ${navOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar — hidden on mobile unless navOpen */}
        <div className={`${navOpen ? "absolute inset-0 z-20 bg-white" : "hidden"} md:block`}>
          <CascadeNav
            nodes={nodes}
            selectedKey={selectedKey}
            onSelect={handleNodeSelect}
            clientName={engagement.clientName}
          />
        </div>
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="mb-6">
            <NodeProgressionStrip
              nodes={nodes}
              selectedKey={selectedKey}
              onSelect={handleNodeSelect}
            />
          </div>
          <div className="max-w-3xl">
            <NodeContent node={selectedNode} allNodes={nodes} flags={flags} />
          </div>
        </main>
      </div>
      <DevToggle nodes={nodes} onStatusChange={handleStatusChange} />
    </div>
  );
}
