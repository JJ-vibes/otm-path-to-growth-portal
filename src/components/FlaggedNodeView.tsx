import { CascadeNode } from "@/data/engagement";
import SectionHtml from "./SectionHtml";

export default function FlaggedNodeView({
  node,
  sourceNodeName,
}: {
  node: CascadeNode;
  sourceNodeName?: string;
}) {
  return (
    <div>
      {/* Warning banner */}
      <div className="bg-[#fffbeb] border border-[#f59e0b] rounded-lg p-4 mb-4">
        <div className="flex items-start gap-2">
          <span className="text-amber-600 text-lg leading-none">⚠</span>
          <div>
            <p className="text-[#92400e] text-sm font-medium">
              Upstream change detected
            </p>
            <p className="text-[#92400e] text-sm mt-1">
              The {sourceNodeName || "upstream deliverable"} was revised. This
              deliverable may need updates.
            </p>
          </div>
        </div>
      </div>

      {/* Badge */}
      <div className="mb-3">
        <span className="inline-flex items-center text-xs font-medium bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full">
          Needs review
        </span>
      </div>

      {/* Title */}
      <h1 className="font-outfit font-bold text-otm-navy text-[22px] mb-4">
        {node.displayName}
      </h1>

      {/* Existing content still shown — sections if available, else execSummary */}
      {node.sections && node.sections.length > 0 ? (
        <>
          <div className="border-t border-gray-200 my-4" />
          {node.sections
            .filter((s) => s.displayLayer === "CHAPTER")
            .map((section) => (
              <div key={section.sectionKey} className="mb-4">
                <h3 className="font-outfit font-semibold text-otm-navy text-base mb-2">
                  {section.sectionTitle}
                </h3>
                <SectionHtml content={section.content} />
              </div>
            ))}
        </>
      ) : node.execSummary ? (
        <>
          <div className="border-t border-gray-200 my-4" />
          <h3 className="text-[11px] uppercase text-gray-400 tracking-[0.06em] mb-3">
            Executive Summary
          </h3>
          <SectionHtml content={node.execSummary} />
        </>
      ) : null}

      <p className="text-sm text-gray-500 italic mt-4">
        Your OTM team is reviewing whether updates are needed.
      </p>
    </div>
  );
}
