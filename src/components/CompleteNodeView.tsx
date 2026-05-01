import { CascadeNode } from "@/data/engagement";
import SectionHtml from "./SectionHtml";
import SectionExpander from "./SectionExpander";
import InheritedBadge from "./InheritedBadge";

export default function CompleteNodeView({ node }: { node: CascadeNode }) {
  const hasSections = node.sections && node.sections.length > 0;
  const chapterSections = node.sections?.filter((s) => s.displayLayer === "CHAPTER") || [];
  const fullSections = node.sections?.filter((s) => s.displayLayer === "FULL") || [];

  return (
    <div>
      {/* Badges */}
      <div className="flex items-center gap-2 mb-3">
        <span className="inline-flex items-center text-xs font-medium bg-otm-teal/10 text-otm-teal px-2.5 py-1 rounded-full">
          Complete
        </span>
        {node.isGate && (
          <span className="inline-flex items-center text-xs font-medium bg-red-50 text-red-700 px-2.5 py-1 rounded-full">
            Strategic gate
          </span>
        )}
      </div>

      {/* Title */}
      <h1 className="font-outfit font-bold text-otm-navy text-[22px] mb-2">
        {node.displayName}
      </h1>

      {/* Built from */}
      {node.upstreamNames.length > 0 && (
        <p className="text-xs text-gray-400 italic mb-4">
          Built from:{" "}
          {node.upstreamNames.map((name, i) => (
            <span key={name}>
              <span className="text-otm-navy not-italic">{name}</span>
              {i < node.upstreamNames.length - 1 && ", "}
            </span>
          ))}
        </p>
      )}

      <div className="border-t border-gray-200 my-4" />

      {/* Section-based display */}
      {hasSections ? (
        <>
          {/* CHAPTER sections — rendered as flowing content */}
          {chapterSections.length > 0 && (
            <div className="mb-6">
              {chapterSections.map((section) => (
                <div key={section.sectionKey} className="mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-outfit font-semibold text-otm-navy text-base">
                      {section.sectionTitle}
                    </h3>
                    {section.isInherited && section.inheritedFromNode && (
                      <InheritedBadge sourceName={section.inheritedFromNode} />
                    )}
                  </div>
                  <SectionHtml content={section.content} />
                </div>
              ))}
            </div>
          )}

          {/* FULL sections — expandable rows */}
          {fullSections.length > 0 && (
            <>
              <div className="border-t border-gray-200 my-4" />
              <h3 className="text-[11px] uppercase text-gray-400 tracking-[0.06em] mb-3">
                Detail Sections
              </h3>
              <div className="space-y-2 mb-6">
                {fullSections.map((section) => (
                  <SectionExpander
                    key={section.sectionKey}
                    title={section.sectionTitle}
                    content={section.content}
                    inheritedFrom={section.isInherited ? section.inheritedFromNode : null}
                  />
                ))}
              </div>
            </>
          )}
        </>
      ) : (
        /* Fallback: legacy execSummary */
        node.execSummary && (
          <div className="mb-6">
            <h3 className="text-[11px] uppercase text-gray-400 tracking-[0.06em] mb-3">
              Executive Summary
            </h3>
            <SectionHtml content={node.execSummary} />
          </div>
        )
      )}

      <div className="border-t border-gray-200 my-4" />

      {/* What this unlocks */}
      {node.downstreamNames.length > 0 && (
        <div className="mb-6">
          <h3 className="text-[11px] uppercase text-gray-400 tracking-[0.06em] mb-2">
            What This Unlocks
          </h3>
          <p className="text-otm-gray text-sm">
            This deliverable unlocks:{" "}
            {node.downstreamNames.join(", ")}
            {node.isGate ? ", and all downstream work." : "."}
          </p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-3">
        {node.documentUrl ? (
          <a
            href={`/api/documents/${encodeURIComponent(node.documentUrl)}`}
            target="_blank"
            rel="noopener"
            download
            className="text-xs px-4 py-2 border border-gray-300 rounded-lg text-otm-gray hover:bg-gray-50 transition-colors"
          >
            Download full document
          </a>
        ) : (
          <span className="text-xs px-4 py-2 text-gray-400 italic">
            (no source document attached)
          </span>
        )}
        <button
          onClick={() => window.print()}
          className="text-xs px-4 py-2 border border-gray-300 rounded-lg text-otm-gray hover:bg-gray-50 transition-colors"
        >
          Print
        </button>
      </div>
    </div>
  );
}
