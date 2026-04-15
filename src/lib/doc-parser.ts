import mammoth from "mammoth";
import { prisma } from "./prisma";

export interface ParsedSection {
  sectionKey: string;
  sectionTitle: string;
  content: string;
  sortOrder: number;
  displayLayer: "CHAPTER" | "FULL";
  isRequired: boolean;
  isConditional: boolean;
  matched: boolean;
}

export interface ParseResult {
  /** Sections that matched a template heading */
  matched: ParsedSection[];
  /** Heading titles found in the document that didn't match any template */
  unmatched: string[];
  /** Template sections that had no matching heading in the document */
  missing: ParsedSection[];
  /** Raw HTML from mammoth conversion */
  html: string;
}

/**
 * Normalize a heading string for matching:
 * lowercase, trim, strip leading/trailing punctuation, collapse whitespace.
 */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/^[^\w]+|[^\w]+$/g, "")
    .replace(/\s+/g, " ");
}

/**
 * Strip HTML tags from a string to get clean text.
 */
function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, "").trim();
}

/**
 * Split HTML at <h1> tags into sections.
 * Returns an array of { title, content } where title is the text inside the <h1>
 * and content is everything between that <h1> and the next <h1> (or end of document).
 */
function splitAtH1(html: string): Array<{ title: string; content: string }> {
  // Split on <h1> tags — captures the tag itself as a delimiter
  const parts = html.split(/(<h1[^>]*>[\s\S]*?<\/h1>)/i);
  const sections: Array<{ title: string; content: string }> = [];

  let currentTitle: string | null = null;
  let currentContent = "";

  for (const part of parts) {
    const h1Match = part.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    if (h1Match) {
      // If we have a previous section, push it
      if (currentTitle !== null) {
        sections.push({ title: currentTitle, content: currentContent.trim() });
      }
      currentTitle = stripHtml(h1Match[1]);
      currentContent = "";
    } else if (currentTitle !== null) {
      currentContent += part;
    }
    // Content before the first <h1> is ignored (title pages, etc.)
  }

  // Push the last section
  if (currentTitle !== null) {
    sections.push({ title: currentTitle, content: currentContent.trim() });
  }

  return sections;
}

/**
 * Parse a .docx buffer against a node's template sections.
 *
 * 1. Converts .docx to HTML via mammoth
 * 2. Splits at <h1> tags
 * 3. Matches headings to NodeTemplate entries
 * 4. Returns matched sections, unmatched headings, and missing template sections
 */
export async function parseDocument(
  buffer: Buffer,
  nodeKey: string
): Promise<ParseResult> {
  // Convert docx to HTML
  const mammothResult = await mammoth.convertToHtml({ buffer });
  const html = mammothResult.value;

  // Get template sections for this node
  const templates = await prisma.nodeTemplate.findMany({
    where: { nodeKey },
    orderBy: { sortOrder: "asc" },
  });

  if (templates.length === 0) {
    throw new Error(`No templates found for node: ${nodeKey}`);
  }

  // Split HTML at h1 boundaries
  const docSections = splitAtH1(html);

  // Build a lookup from normalized title to template
  const templateByNormalizedTitle = new Map<string, typeof templates[number]>();
  for (const t of templates) {
    templateByNormalizedTitle.set(normalize(t.sectionTitle), t);
  }

  const matchedKeys = new Set<string>();
  const matched: ParsedSection[] = [];
  const unmatched: string[] = [];

  // Match document sections to templates
  for (const docSection of docSections) {
    const normalizedTitle = normalize(docSection.title);
    const template = templateByNormalizedTitle.get(normalizedTitle);

    if (template) {
      matchedKeys.add(template.sectionKey);
      matched.push({
        sectionKey: template.sectionKey,
        sectionTitle: template.sectionTitle,
        content: docSection.content,
        sortOrder: template.sortOrder,
        displayLayer: template.displayLayer as "CHAPTER" | "FULL",
        isRequired: template.isRequired,
        isConditional: template.isConditional,
        matched: true,
      });
    } else {
      unmatched.push(docSection.title);
    }
  }

  // Sort matched sections by sortOrder
  matched.sort((a, b) => a.sortOrder - b.sortOrder);

  // Find template sections not matched by the document
  const missing: ParsedSection[] = templates
    .filter((t) => !matchedKeys.has(t.sectionKey))
    .map((t) => ({
      sectionKey: t.sectionKey,
      sectionTitle: t.sectionTitle,
      content: "",
      sortOrder: t.sortOrder,
      displayLayer: t.displayLayer as "CHAPTER" | "FULL",
      isRequired: t.isRequired,
      isConditional: t.isConditional,
      matched: false,
    }));

  return { matched, unmatched, missing, html };
}
