"use client";

import { useEffect, useState } from "react";
import { CascadeNode } from "@/data/engagement";

export default function ActiveNodeView({ node }: { node: CascadeNode }) {
  const [templateCount, setTemplateCount] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/templates/${node.nodeKey}`)
      .then((r) => (r.ok ? r.json() : { sections: [] }))
      .then((data) => {
        if (data.sections?.length) {
          setTemplateCount(data.sections.length);
        }
      })
      .catch(() => {});
  }, [node.nodeKey]);

  const sectionCount = node.sections?.length ?? 0;

  return (
    <div>
      <div className="mb-3">
        <span className="inline-flex items-center text-xs font-medium bg-otm-teal/10 text-otm-teal px-2.5 py-1 rounded-full">
          In progress
        </span>
      </div>

      <h1 className="font-outfit font-bold text-otm-navy text-[22px] mb-4">
        {node.displayName}
      </h1>

      <p className="text-otm-gray text-[15px] leading-relaxed mb-4">
        Your OTM team is currently working on this deliverable.
      </p>

      {/* Section progress */}
      {templateCount !== null && templateCount > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-gray-400">
              {sectionCount} of {templateCount} sections drafted
            </span>
          </div>
          <div className="h-[3px] bg-gray-100 rounded-full overflow-hidden w-48">
            <div
              className="h-full bg-otm-teal/40 rounded-full transition-all"
              style={{ width: `${Math.round((sectionCount / templateCount) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {node.upstreamNames.length > 0 && (
        <p className="text-xs text-gray-500 italic">
          Depends on:{" "}
          {node.upstreamNames.map((name, i) => (
            <span key={name}>
              <span className="text-otm-navy not-italic">{name}</span>
              {i < node.upstreamNames.length - 1 && ", "}
            </span>
          ))}
        </p>
      )}
    </div>
  );
}
