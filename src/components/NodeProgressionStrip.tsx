"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import type { CascadeNode, NodeStatus } from "@/data/engagement";

export type DisplayStatus =
  | "LOCKED"
  | "IN_PROGRESS"
  | "AWAITING_APPROVAL"
  | "LOCKED_IN"
  | "NEEDS_REVIEW"
  | "PENDING_UPDATE";

export function getDisplayStatus(node: { status: NodeStatus; lockedIn: boolean }): DisplayStatus {
  if (node.status === "flagged") return "NEEDS_REVIEW";
  if (node.status === "cascading") return "PENDING_UPDATE";
  if (node.status === "locked") return "LOCKED";
  if (node.status === "active") return "IN_PROGRESS";
  if (node.status === "complete" && node.lockedIn) return "LOCKED_IN";
  if (node.status === "complete" && !node.lockedIn) return "AWAITING_APPROVAL";
  return "LOCKED";
}

const STATUS_LABEL: Record<DisplayStatus, string> = {
  LOCKED: "LOCKED",
  IN_PROGRESS: "IN PROGRESS",
  AWAITING_APPROVAL: "AWAITING APPROVAL",
  LOCKED_IN: "LOCKED IN",
  NEEDS_REVIEW: "NEEDS REVIEW",
  PENDING_UPDATE: "PENDING UPDATE",
};

const STATUS_COLORS: Record<
  DisplayStatus,
  { border: string; bg: string; numberBg: string; numberFg: string; badgeBg: string; badgeFg: string }
> = {
  LOCKED: {
    border: "#cbd2db",
    bg: "#f5f6f8",
    numberBg: "#cbd2db",
    numberFg: "#5b6577",
    badgeBg: "#e7eaf0",
    badgeFg: "#5b6577",
  },
  IN_PROGRESS: {
    border: "#e7a923",
    bg: "#fff8e8",
    numberBg: "#e7a923",
    numberFg: "#ffffff",
    badgeBg: "#e7a923",
    badgeFg: "#ffffff",
  },
  AWAITING_APPROVAL: {
    border: "#2d9198",
    bg: "#e0f5f6",
    numberBg: "#2d9198",
    numberFg: "#ffffff",
    badgeBg: "#2d9198",
    badgeFg: "#ffffff",
  },
  LOCKED_IN: {
    border: "#0d354f",
    bg: "#e8edf2",
    numberBg: "#0d354f",
    numberFg: "#ffffff",
    badgeBg: "#0d354f",
    badgeFg: "#ffffff",
  },
  NEEDS_REVIEW: {
    border: "#c84a3c",
    bg: "#fceeec",
    numberBg: "#c84a3c",
    numberFg: "#ffffff",
    badgeBg: "#c84a3c",
    badgeFg: "#ffffff",
  },
  PENDING_UPDATE: {
    border: "#b88a2e",
    bg: "#fbf2e0",
    numberBg: "#b88a2e",
    numberFg: "#ffffff",
    badgeBg: "#b88a2e",
    badgeFg: "#ffffff",
  },
};

const NODE_COPY: Record<
  string,
  { description: string; output: string }
> = {
  "key-business-info": {
    description: "Foundation — vision, services, current state, growth goals",
    output: "Business Foundation",
  },
  "ideal-client-profile": {
    description: "Who we're going after and how they buy",
    output: "Defined ICPs",
  },
  "competitive-analysis": {
    description: "Where we sit in the market and where the gaps are",
    output: "Competitive Landscape Report",
  },
  positioning: {
    description: "The locked strategic direction everything downstream depends on",
    output: "Positioning Guide",
  },
  "what-are-we-selling": {
    description: "The offer architecture aligned to ICP and positioning",
    output: "Offer Architecture",
  },
  "messaging-playbook": {
    description: "How we communicate the positioning to each audience",
    output: "Messaging Playbook",
  },
  "gtm-plan": {
    description: "Where, when, and how to take the strategy to market",
    output: "Go-to-Market Plan",
  },
};

function shortTitle(nodeKey: string, displayName: string): string {
  if (nodeKey === "competitive-analysis") return "Competitive Analysis";
  if (nodeKey === "gtm-plan") return "GTM Plan";
  return displayName;
}

export default function NodeProgressionStrip({
  nodes,
  selectedKey,
  onSelect,
}: {
  nodes: CascadeNode[];
  selectedKey?: string;
  onSelect?: (key: string) => void;
}) {
  // Filter out engagement-excluded nodes (e.g. "What Are We Selling" when toggled off).
  const sorted = [...nodes]
    .filter((n) => !n.excluded)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const inProgressIdx = sorted.findIndex(
    (n) => getDisplayStatus(n) === "IN_PROGRESS"
  );
  const defaultExpandedIdx = inProgressIdx >= 0 ? inProgressIdx : 0;
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 767px)");
    const apply = () => {
      setIsMobile(mql.matches);
      if (mql.matches) setExpandedIdx(defaultExpandedIdx);
    };
    apply();
    mql.addEventListener("change", apply);
    return () => mql.removeEventListener("change", apply);
  }, [defaultExpandedIdx]);

  if (isMobile) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {sorted.map((node, idx) => {
          const status = getDisplayStatus(node);
          const colors = STATUS_COLORS[status];
          const copy = NODE_COPY[node.nodeKey];
          const isExpanded = expandedIdx === idx;
          const num = String(idx + 1).padStart(2, "0");

          return (
            <div
              key={node.nodeKey}
              className="border-b border-gray-100 last:border-b-0"
              style={{ borderLeft: `3px solid ${colors.border}` }}
            >
              <button
                onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                className="w-full flex items-center gap-3 px-4 py-3"
              >
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center font-outfit font-bold text-[11px] shrink-0"
                  style={{ backgroundColor: colors.numberBg, color: colors.numberFg }}
                >
                  {num}
                </span>
                <span className="font-outfit font-bold text-[13px] flex-1 text-left" style={{ color: "#0d354f" }}>
                  {shortTitle(node.nodeKey, node.displayName)}
                </span>
                <span
                  className="font-outfit font-bold uppercase text-[9px] tracking-[0.05em] px-2 py-0.5 rounded-full whitespace-nowrap inline-flex items-center gap-1"
                  style={{ backgroundColor: colors.badgeBg, color: colors.badgeFg }}
                >
                  {status === "LOCKED_IN" && <Check size={10} strokeWidth={3} />}
                  {STATUS_LABEL[status]}
                </span>
                <ChevronDown
                  size={16}
                  className={`shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                  color="#5b6577"
                />
              </button>
              <div
                className="overflow-hidden transition-all duration-200 ease-out"
                style={{
                  maxHeight: isExpanded ? 200 : 0,
                  backgroundColor: colors.bg,
                }}
              >
                <div className="px-4 py-3">
                  <p className="text-[11px] leading-snug mb-3" style={{ color: "#5b6577" }}>
                    {copy?.description ?? ""}
                  </p>
                  <p
                    className="font-outfit font-bold uppercase text-[10px] tracking-[0.05em] mb-1"
                    style={{ color: "#8a92a3" }}
                  >
                    OUTPUT
                  </p>
                  <p className="font-outfit font-bold text-[13px]" style={{ color: "#0d354f" }}>
                    {copy?.output ?? ""}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Desktop: horizontal row of cards
  // NOTE: brief §6.3 specifies min-width 160px; reduced to 140 here so 7 cards
  // fit alongside the 240px CascadeNav. Overflow-x is set as a graceful
  // fallback at narrower widths.
  return (
    <div className="flex gap-3 items-stretch overflow-x-auto pb-2 -mb-2 pt-2">
      {sorted.map((node, idx) => {
        const status = getDisplayStatus(node);
        const colors = STATUS_COLORS[status];
        const copy = NODE_COPY[node.nodeKey];
        const isInProgress = status === "IN_PROGRESS";
        const isClickable = status !== "LOCKED" && status !== "PENDING_UPDATE" && !!onSelect;
        const isSelected = selectedKey === node.nodeKey;
        const num = String(idx + 1).padStart(2, "0");

        const cardStyle: React.CSSProperties = {
          backgroundColor: colors.bg,
          border: `2px solid ${colors.border}`,
          borderRadius: 6,
          padding: 16,
          minWidth: 140,
          height: 240,
          display: "flex",
          flexDirection: "column",
          cursor: isClickable ? "pointer" : "default",
          flex: 1,
          transition: "transform 200ms ease-out, box-shadow 200ms ease-out",
          ...(isInProgress
            ? {
                transform: "scale(1.04)",
                boxShadow: "0 4px 12px rgba(231,169,35,0.25)",
              }
            : {}),
          ...(isSelected && !isInProgress
            ? { boxShadow: "0 2px 6px rgba(13,53,79,0.10)" }
            : {}),
        };

        return (
          <div
            key={node.nodeKey}
            role={isClickable ? "button" : undefined}
            tabIndex={isClickable ? 0 : undefined}
            onClick={() => isClickable && onSelect?.(node.nodeKey)}
            onKeyDown={(e) => {
              if (isClickable && (e.key === "Enter" || e.key === " ")) {
                e.preventDefault();
                onSelect?.(node.nodeKey);
              }
            }}
            style={cardStyle}
          >
            {/* Top accent bar */}
            <div
              style={{
                height: 4,
                backgroundColor: colors.border,
                margin: "-16px -16px 12px",
                borderTopLeftRadius: 4,
                borderTopRightRadius: 4,
              }}
            />

            {/* Top row: number + status badge */}
            <div className="flex items-start justify-between gap-2 mb-3">
              <span
                className="w-8 h-8 rounded-full flex items-center justify-center font-outfit font-bold text-[13px]"
                style={{ backgroundColor: colors.numberBg, color: colors.numberFg }}
              >
                {num}
              </span>
              <span
                className="font-outfit font-bold uppercase text-[9px] tracking-[0.03em] leading-tight px-2 py-1 rounded-md inline-flex items-center gap-1 text-center"
                style={{ backgroundColor: colors.badgeBg, color: colors.badgeFg }}
              >
                {status === "LOCKED_IN" && <Check size={11} strokeWidth={3} />}
                {STATUS_LABEL[status]}
              </span>
            </div>

            {/* Title + description */}
            <h4
              className="font-outfit font-bold text-[14px] leading-tight mb-2"
              style={{ color: "#0d354f" }}
            >
              {shortTitle(node.nodeKey, node.displayName)}
            </h4>
            <p
              className="text-[11px] leading-snug overflow-hidden"
              style={{
                color: "#5b6577",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
              }}
            >
              {copy?.description ?? ""}
            </p>

            {/* Bottom: OUTPUT */}
            <div className="mt-auto">
              <p
                className="font-outfit uppercase text-[10px] tracking-[0.05em] mb-1"
                style={{ color: "#8a92a3" }}
              >
                OUTPUT
              </p>
              <p
                className="font-outfit font-bold text-[13px] leading-snug"
                style={{ color: "#0d354f" }}
              >
                {copy?.output ?? ""}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
