"use client";

import ReactMarkdown from "react-markdown";

export default function SummaryContent({ content }: { content: string }) {
  return (
    <div className="prose-otm">
      <ReactMarkdown
        components={{
          h1: ({ children }) => (
            <h1 className="font-outfit font-bold text-otm-navy text-lg mb-3">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="font-outfit font-semibold text-otm-navy text-base mb-2">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="font-outfit font-semibold text-otm-navy text-sm mb-2">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="text-otm-gray text-[15px] leading-[1.75] font-lato mb-4">
              {children}
            </p>
          ),
          strong: ({ children }) => (
            <strong className="font-bold text-otm-navy">{children}</strong>
          ),
          ul: ({ children }) => (
            <ul className="list-disc pl-5 mb-4 space-y-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-5 mb-4 space-y-1">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="text-otm-gray text-[15px] leading-[1.75] font-lato">
              {children}
            </li>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
