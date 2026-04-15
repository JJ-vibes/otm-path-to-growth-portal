import fs from "fs";
import path from "path";
import type { Engagement, CascadeNode } from "@/data/engagement";

function getLogoBase64(): string {
  const logoPath = path.join(process.cwd(), "public/otm-logo.png");
  const buffer = fs.readFileSync(logoPath);
  return `data:image/png;base64,${buffer.toString("base64")}`;
}

function looksLikeHtml(str: string): boolean {
  return str.includes("<p>") || str.includes("<ul>") || str.includes("<ol>") || str.includes("<table>");
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderMarkdownText(text: string): string {
  return text
    .split("\n\n")
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return "";

      // Headings
      const h3Match = trimmed.match(/^###\s+(.+)$/);
      if (h3Match) return `<h4>${escapeHtml(h3Match[1])}</h4>`;
      const h2Match = trimmed.match(/^##\s+(.+)$/);
      if (h2Match) return `<h3>${escapeHtml(h2Match[1])}</h3>`;
      const h1Match = trimmed.match(/^#\s+(.+)$/);
      if (h1Match) return `<h2>${escapeHtml(h1Match[1])}</h2>`;

      // Paragraph with bold
      let html = escapeHtml(trimmed);
      html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
      return `<p>${html}</p>`;
    })
    .join("\n");
}

function renderCoverPage(engagement: Engagement, date: string): string {
  return `
    <div class="cover-page">
      <div class="cover-accent"></div>
      <div class="cover-content">
        <div class="cover-logo">
          <img src="${getLogoBase64()}" alt="OTM" style="height: 48px; width: auto;" />
        </div>
        <div class="cover-title-block">
          <h1 class="cover-client">${escapeHtml(engagement.clientName)}</h1>
          <h2 class="cover-subtitle">Strategy Book</h2>
          <p class="cover-stage">Stage 1: Prove the Strategy</p>
          <p class="cover-date">${date}</p>
        </div>
        <div class="cover-footer">
          <p>OTM &mdash; The Path to Growth&reg;</p>
        </div>
      </div>
    </div>
  `;
}

function renderTOC(nodes: CascadeNode[]): string {
  const items = nodes
    .map((node, i) => {
      const isComplete = node.status === "complete";
      const label = isComplete
        ? ""
        : node.status === "active"
        ? '<span class="toc-badge active">In progress</span>'
        : '<span class="toc-badge upcoming">Upcoming</span>';

      return `
        <div class="toc-item ${isComplete ? "" : "toc-incomplete"}">
          <span class="toc-number">${i + 1}.</span>
          <span class="toc-name">${escapeHtml(node.displayName)}</span>
          ${label}
        </div>
      `;
    })
    .join("\n");

  return `
    <div class="toc-page">
      <h2 class="section-title">Table of Contents</h2>
      <div class="toc-list">
        ${items}
      </div>
    </div>
  `;
}

function renderChapter(
  node: CascadeNode,
  chapterNum: number
): string {
  const hasSections = node.sections && node.sections.length > 0;
  if (!hasSections && !node.execSummary) return "";

  const builtFrom =
    node.upstreamNames.length > 0
      ? `<p class="built-from">Built from: <span class="navy">${node.upstreamNames.map(escapeHtml).join(", ")}</span></p>`
      : "";

  const unlocks =
    node.downstreamNames.length > 0
      ? `
        <div class="unlocks-section">
          <h4 class="unlocks-heading">What this unlocks</h4>
          <p>This deliverable unlocks: ${node.downstreamNames.map(escapeHtml).join(", ")}${node.isGate ? ", and all downstream work." : "."}</p>
        </div>
      `
      : "";

  const gateBadge = node.isGate
    ? '<span class="gate-badge">Strategic Gate</span>'
    : "";

  // Render body from CHAPTER sections if available, else execSummary
  let bodyHtml: string;
  if (hasSections) {
    const chapterSections = node.sections!.filter((s) => s.displayLayer === "CHAPTER");
    bodyHtml = chapterSections
      .map((section) => {
        const sourceNote = section.isInherited && section.inheritedFromNode
          ? `<p class="section-source">Source: ${escapeHtml(section.inheritedFromNode)}</p>`
          : "";
        // Content is HTML from mammoth — render directly
        const contentHtml = looksLikeHtml(section.content)
          ? section.content
          : renderMarkdownText(section.content);
        return `
          <div class="chapter-section">
            <h3 class="section-heading">${escapeHtml(section.sectionTitle)}</h3>
            ${sourceNote}
            ${contentHtml}
          </div>
        `;
      })
      .join("\n");
  } else {
    // Legacy fallback: execSummary may be markdown or HTML
    bodyHtml = looksLikeHtml(node.execSummary!)
      ? node.execSummary!
      : renderMarkdownText(node.execSummary!);
  }

  return `
    <div class="chapter">
      <div class="chapter-header">
        <span class="chapter-number">Chapter ${chapterNum}</span>
        ${gateBadge}
      </div>
      <h2 class="chapter-title">${escapeHtml(node.displayName)}</h2>
      ${builtFrom}
      <div class="chapter-divider"></div>
      <div class="chapter-body">
        ${bodyHtml}
      </div>
      ${unlocks}
    </div>
  `;
}

export function generateStrategyBookHTML(engagement: Engagement): string {
  const date = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const completedNodes = engagement.nodes.filter(
    (n) => n.status === "complete" && (n.execSummary || (n.sections && n.sections.length > 0))
  );

  let chapterNum = 0;
  const chapters = completedNodes
    .map((node) => {
      chapterNum++;
      return renderChapter(node, chapterNum);
    })
    .join("\n");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&family=Lato:wght@400;700&display=swap" rel="stylesheet">
  <style>
    @page {
      size: letter;
      margin: 1in;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Lato', sans-serif;
      color: #4a4a4a;
      font-size: 11pt;
      line-height: 1.7;
    }

    h1, h2, h3, h4 {
      font-family: 'Outfit', sans-serif;
      color: #023a67;
    }

    /* Cover Page */
    .cover-page {
      page-break-after: always;
      height: 100vh;
      display: flex;
      flex-direction: column;
      position: relative;
    }
    .cover-accent {
      height: 6px;
      background: #259494;
      width: 100%;
    }
    .cover-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: 0 0.5in;
    }
    .cover-logo {
      margin-bottom: 48px;
    }
    .gold-dot {
      color: #e9aa22;
      font-size: 28pt;
      font-weight: bold;
      font-family: 'Outfit', sans-serif;
      margin-right: 2px;
    }
    .logo-text {
      font-family: 'Outfit', sans-serif;
      font-weight: 700;
      font-size: 24pt;
      color: #023a67;
      letter-spacing: -0.02em;
    }
    .cover-title-block { margin-bottom: 48px; }
    .cover-client {
      font-size: 28pt;
      font-weight: 700;
      margin-bottom: 8px;
    }
    .cover-subtitle {
      font-size: 18pt;
      font-weight: 600;
      color: #259494;
      margin-bottom: 12px;
    }
    .cover-stage {
      font-size: 12pt;
      color: #4a4a4a;
      margin-bottom: 4px;
    }
    .cover-date {
      font-size: 10pt;
      color: #9ca3af;
    }
    .cover-footer {
      position: absolute;
      bottom: 0.5in;
      left: 0.5in;
      font-size: 9pt;
      color: #9ca3af;
    }

    /* TOC */
    .toc-page {
      page-break-after: always;
    }
    .section-title {
      font-size: 18pt;
      font-weight: 700;
      margin-bottom: 24px;
      padding-bottom: 8px;
      border-bottom: 2px solid #259494;
    }
    .toc-list { }
    .toc-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 0;
      border-bottom: 1px solid #f0f0f0;
      font-size: 11pt;
    }
    .toc-incomplete {
      color: #9ca3af;
    }
    .toc-number {
      width: 24px;
      font-weight: 600;
      color: #023a67;
    }
    .toc-incomplete .toc-number {
      color: #9ca3af;
    }
    .toc-name { flex: 1; }
    .toc-badge {
      font-size: 8pt;
      padding: 2px 8px;
      border-radius: 10px;
      font-weight: 600;
    }
    .toc-badge.active {
      background: #e0f2fe;
      color: #0284c7;
    }
    .toc-badge.upcoming {
      background: #f3f4f6;
      color: #9ca3af;
    }

    /* Chapters */
    .chapter {
      page-break-before: always;
    }
    .chapter-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 8px;
    }
    .chapter-number {
      font-size: 9pt;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #9ca3af;
    }
    .gate-badge {
      font-size: 8pt;
      padding: 2px 8px;
      border-radius: 10px;
      background: #fef2f2;
      color: #b91c1c;
      font-weight: 600;
    }
    .chapter-title {
      font-size: 20pt;
      font-weight: 700;
      margin-bottom: 8px;
    }
    .built-from {
      font-size: 9pt;
      color: #9ca3af;
      font-style: italic;
      margin-bottom: 16px;
    }
    .built-from .navy { color: #023a67; font-style: normal; }
    .chapter-divider {
      height: 1px;
      background: #e5e5e5;
      margin: 16px 0;
    }
    .chapter-body p {
      margin-bottom: 14px;
      line-height: 1.75;
    }
    .chapter-body strong {
      color: #023a67;
      font-weight: 700;
    }
    .unlocks-section {
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid #e5e5e5;
    }
    .unlocks-heading {
      font-size: 9pt;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #9ca3af;
      margin-bottom: 6px;
    }
    .unlocks-section p {
      font-size: 10pt;
      color: #4a4a4a;
    }

    /* Section headings within chapters */
    .chapter-section {
      margin-bottom: 20px;
    }
    .section-heading {
      font-size: 13pt;
      font-weight: 600;
      margin-bottom: 8px;
      color: #023a67;
    }
    .section-source {
      font-size: 8pt;
      color: #9ca3af;
      font-style: italic;
      margin-bottom: 8px;
    }

    /* HTML content styles (from mammoth) */
    .chapter-body ul {
      list-style-type: disc;
      padding-left: 20px;
      margin-bottom: 14px;
    }
    .chapter-body ol {
      list-style-type: decimal;
      padding-left: 20px;
      margin-bottom: 14px;
    }
    .chapter-body li {
      margin-bottom: 4px;
      line-height: 1.65;
    }
    .chapter-body table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
      font-size: 9pt;
    }
    .chapter-body th {
      background-color: #023a67;
      color: white;
      font-weight: 600;
      text-align: left;
      padding: 6px 8px;
      font-family: 'Outfit', sans-serif;
      font-size: 8.5pt;
    }
    .chapter-body td {
      padding: 5px 8px;
      border-bottom: 1px solid #e5e7eb;
      vertical-align: top;
      line-height: 1.5;
    }
    .chapter-body tr:nth-child(even) td {
      background-color: #f9fafb;
    }
    .chapter-body em {
      font-style: italic;
    }
    .chapter-body a {
      color: #259494;
      text-decoration: underline;
    }
    .chapter-body blockquote {
      border-left: 3px solid #259494;
      padding-left: 12px;
      margin: 12px 0;
      color: #6b7280;
      font-style: italic;
    }
    .chapter-body h2 {
      font-size: 13pt;
      margin-top: 18px;
      margin-bottom: 8px;
    }
    .chapter-body h3, .chapter-body h4 {
      font-size: 11pt;
      margin-top: 14px;
      margin-bottom: 6px;
    }
  </style>
</head>
<body>
  ${renderCoverPage(engagement, date)}
  ${renderTOC(engagement.nodes)}
  ${chapters}
</body>
</html>`;
}
