"use client";

import { useState } from "react";
import { CascadeNode, NodeStatus } from "@/data/engagement";

function StatusCircle({
  status,
  isGate,
  lockedIn,
}: {
  status: NodeStatus;
  isGate: boolean;
  lockedIn: boolean;
}) {
  const base = "w-[18px] h-[18px] rounded-full flex items-center justify-center shrink-0";

  const gateRing = isGate ? "ring-2 ring-red-600 ring-offset-1" : "";

  switch (status) {
    case "complete":
      if (lockedIn) {
        // Locked-in: navy filled circle with white lock icon
        return (
          <span className={`${base} bg-otm-navy ${gateRing}`}>
            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <rect x="5" y="11" width="14" height="10" rx="2" />
              <path d="M8 11V7a4 4 0 118 0v4" />
            </svg>
          </span>
        );
      }
      // Awaiting approval: gold accent (filled out, not yet approved). Dark
      // check on gold — never white text on yellow.
      return (
        <span className={`${base} ${gateRing}`} style={{ backgroundColor: "#e7a923" }}>
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="#0d354f" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </span>
      );
    case "active":
      // In progress / "you are here": gold accent ring + gold dot
      return (
        <span className={`${base} ${gateRing}`} style={{ border: "2px solid #e7a923" }}>
          <span className="w-[5px] h-[5px] rounded-full" style={{ backgroundColor: "#e7a923" }} />
        </span>
      );
    case "locked":
      return (
        <span className={`${base} border border-dashed border-gray-300 ${gateRing}`}>
          <svg className="w-2.5 h-2.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <rect x="5" y="11" width="14" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 118 0v4" />
          </svg>
        </span>
      );
    case "flagged":
      return (
        <span className={`${base} border-2 border-[#e9aa22] ${gateRing}`}>
          <svg className="w-2.5 h-2.5 text-[#e9aa22]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2L1 21h22L12 2zm0 4l7.53 13H4.47L12 6zm-1 5v4h2v-4h-2zm0 6v2h2v-2h-2z" />
          </svg>
        </span>
      );
    case "cascading":
      return (
        <span className={`${base} border border-dashed border-[#e9aa22] ${gateRing}`} />
      );
  }
}

function nameColor(status: NodeStatus, isGate: boolean, lockedIn: boolean): string {
  if (isGate) return "text-red-600";
  switch (status) {
    case "complete":
      return lockedIn ? "text-otm-navy" : "text-otm-navy font-medium";
    case "active":
      return "text-otm-navy font-medium";
    case "locked":
      return "text-gray-400 opacity-50";
    case "flagged":
      return "text-amber-700";
    case "cascading":
      return "text-amber-700 opacity-60";
  }
}

export default function CascadeNav({
  nodes,
  selectedKey,
  onSelect,
  clientName,
}: {
  nodes: CascadeNode[];
  selectedKey: string;
  onSelect: (key: string) => void;
  clientName: string;
}) {
  const visibleNodes = nodes.filter((n) => !n.excluded);
  const completed = visibleNodes.filter((n) => n.status === "complete").length;
  const total = visibleNodes.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <nav className="w-[240px] shrink-0 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <h2 className="font-outfit font-semibold text-otm-navy text-sm">
          {clientName}
        </h2>
        <p className="text-xs text-otm-gray mt-0.5">Stage 1</p>
      </div>

      {/* Progress */}
      <div className="px-4 pb-3">
        <p className="text-[11px] text-otm-gray mb-1">
          {completed} of {total} complete
        </p>
        <div className="h-[3px] bg-otm-light rounded-full overflow-hidden">
          <div
            className="h-full bg-otm-teal rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Node list */}
      <div className="flex-1 overflow-y-auto px-4 relative">
        {/* Vertical connector line */}
        <div className="absolute left-[25px] top-0 bottom-0 w-[1.5px] bg-gray-200 z-0" />

        <div className="relative z-10 space-y-0">
          {visibleNodes.map((node) => {
            const isSelected = node.nodeKey === selectedKey;
            const isClickable = node.status !== "locked" && node.status !== "cascading";

            return (
              <div key={node.nodeKey}>
                {/* Gate divider before */}
                {node.isGate && (
                  <div className="border-t-[1.5px] border-dashed border-red-600 my-2" />
                )}

                <button
                  onClick={() => isClickable && onSelect(node.nodeKey)}
                  disabled={!isClickable}
                  className={`w-full flex items-center gap-2.5 py-1.5 px-1 rounded-md text-left transition-colors ${
                    isSelected
                      ? "bg-[#f0fafa] border-l-[3px] border-l-otm-teal pl-0.5"
                      : "border-l-[3px] border-l-transparent"
                  } ${isClickable ? "cursor-pointer hover:bg-gray-50" : "cursor-default"}`}
                >
                  <StatusCircle status={node.status} isGate={node.isGate} lockedIn={node.lockedIn} />
                  <div className="flex flex-col">
                    <span className={`text-[13px] font-lato leading-tight ${nameColor(node.status, node.isGate, node.lockedIn)}`}>
                      {node.displayName}
                    </span>
                    {node.status === "complete" && node.sections && node.sections.length > 0 && (
                      <span className="text-[10px] text-gray-400 mt-0.5">
                        {node.sections.filter((s) => s.displayLayer === "CHAPTER").length} chapters
                      </span>
                    )}
                  </div>
                </button>

                {/* Gate divider after */}
                {node.isGate && (
                  <div className="border-t-[1.5px] border-dashed border-red-600 my-2" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Download button */}
      <DownloadButton />
    </nav>
  );
}

function DownloadButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleDownload() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/strategy-book");
      if (!res.ok) throw new Error("Failed to generate PDF");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] ||
        "Strategy_Book.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Failed to generate PDF");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border-t border-gray-200 p-4">
      <button
        onClick={handleDownload}
        disabled={loading}
        className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg text-otm-gray hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading && (
          <span className="w-3 h-3 border-2 border-otm-teal border-t-transparent rounded-full animate-spin" />
        )}
        {loading ? "Generating..." : "Download strategy book"}
      </button>
      {error && <p className="text-[10px] text-red-500 mt-1 text-center">{error}</p>}
    </div>
  );
}
