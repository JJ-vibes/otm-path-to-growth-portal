import type { NodeTemplateSection } from "@/data/engagement";

/**
 * Parse extracted document text and distribute it into template sections.
 *
 * Strategy:
 * 1. Build a normalised lookup of section titles → sectionKey
 * 2. Walk lines looking for headings that match a template title
 * 3. Collect text between matched headings and assign to the right section
 * 4. Any preamble before the first match goes into the first CHAPTER section
 */
export function parseSectionsFromText(
  text: string,
  templates: NodeTemplateSection[]
): Record<string, string> {
  if (!text.trim() || templates.length === 0) return {};

  // Build matchers: normalised title → sectionKey
  const matchers = templates.map((t) => ({
    sectionKey: t.sectionKey,
    title: t.sectionTitle,
    pattern: buildPattern(t.sectionTitle),
  }));

  const lines = text.split("\n");
  const segments: { sectionKey: string; startLine: number }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = matchHeading(line, matchers);
    if (match) {
      segments.push({ sectionKey: match, startLine: i });
    }
  }

  const result: Record<string, string> = {};

  if (segments.length === 0) {
    // No headings matched — put everything in the first CHAPTER section
    const firstChapter = templates.find((t) => t.displayLayer === "CHAPTER");
    if (firstChapter) {
      result[firstChapter.sectionKey] = text.trim();
    }
    return result;
  }

  // Preamble before first matched heading → first CHAPTER section
  if (segments[0].startLine > 0) {
    const preamble = lines.slice(0, segments[0].startLine).join("\n").trim();
    if (preamble) {
      const firstChapter = templates.find((t) => t.displayLayer === "CHAPTER");
      if (firstChapter && firstChapter.sectionKey !== segments[0].sectionKey) {
        result[firstChapter.sectionKey] = preamble;
      }
    }
  }

  // Extract content between headings
  for (let i = 0; i < segments.length; i++) {
    const start = segments[i].startLine + 1; // skip the heading line itself
    const end = i + 1 < segments.length ? segments[i + 1].startLine : lines.length;
    const content = lines.slice(start, end).join("\n").trim();
    if (content) {
      // If we already have content for this key (e.g. from preamble), append
      if (result[segments[i].sectionKey]) {
        result[segments[i].sectionKey] += "\n\n" + content;
      } else {
        result[segments[i].sectionKey] = content;
      }
    }
  }

  return result;
}

/**
 * Build a regex pattern from a section title that handles common variations:
 * - Case insensitive
 * - Optional leading numbers/bullets ("1.", "1)", "-", "*")
 * - Optional markdown heading markers (#, ##, ###)
 * - Optional trailing colon
 * - "&" ↔ "and" interchangeable
 * - Collapsed whitespace
 */
function buildPattern(title: string): RegExp {
  // Escape regex special chars except & which we handle specially
  let pattern = title
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/&/g, "(?:&|and)")
    .replace(/\s+/g, "\\s+");

  // Allow optional leading: markdown heading, numbering, bullets
  const prefix = "^(?:[#]{1,4}\\s+)?(?:\\d+[.)\\s]\\s*)?(?:[-*]\\s+)?";
  // Allow optional trailing colon
  const suffix = "\\s*:?\\s*$";

  return new RegExp(prefix + pattern + suffix, "i");
}

/**
 * Check if a line matches any section heading. Returns sectionKey or null.
 * Only matches lines that look like headings (short, no period-ending sentences).
 */
function matchHeading(
  line: string,
  matchers: { sectionKey: string; title: string; pattern: RegExp }[]
): string | null {
  const trimmed = line.trim();
  // Skip empty lines and lines that are clearly body text (long sentences)
  if (!trimmed || trimmed.length > 120) return null;

  for (const m of matchers) {
    if (m.pattern.test(trimmed)) {
      return m.sectionKey;
    }
  }
  return null;
}
