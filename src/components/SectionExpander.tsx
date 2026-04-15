"use client";

import { useState } from "react";
import SectionHtml from "./SectionHtml";

export default function SectionExpander({
  title,
  content,
  inheritedFrom,
}: {
  title: string;
  content: string;
  inheritedFrom?: string | null;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <svg
            className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open ? "rotate-90" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-sm font-medium text-otm-navy">{title}</span>
          {inheritedFrom && (
            <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
              from {inheritedFrom}
            </span>
          )}
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-gray-100">
          <div className="pt-3">
            <SectionHtml content={content} />
          </div>
        </div>
      )}
    </div>
  );
}
