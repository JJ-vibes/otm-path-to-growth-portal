"use client";

import sanitizeHtml from "sanitize-html";

const ALLOWED_TAGS = [
  "p", "br", "strong", "b", "em", "i", "u", "s",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "ul", "ol", "li",
  "table", "thead", "tbody", "tfoot", "tr", "th", "td",
  "a", "blockquote", "pre", "code",
  "sup", "sub", "hr", "span", "div",
];

const ALLOWED_ATTRIBUTES: Record<string, string[]> = {
  a: ["href", "target", "rel"],
  td: ["colspan", "rowspan"],
  th: ["colspan", "rowspan"],
  span: ["class"],
  div: ["class"],
};

function sanitize(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES,
    transformTags: {
      a: (tagName, attribs) => ({
        tagName,
        attribs: { ...attribs, target: "_blank", rel: "noopener noreferrer" },
      }),
    },
  });
}

export default function SectionHtml({ content }: { content: string }) {
  if (!content?.trim()) return null;

  return (
    <div
      className="prose-otm"
      dangerouslySetInnerHTML={{ __html: sanitize(content) }}
    />
  );
}
