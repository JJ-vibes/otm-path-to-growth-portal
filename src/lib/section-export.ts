import { prisma } from "./prisma";

export type ExportableSection = {
  templateId: string | null;
  sectionKey: string;
  displayName: string;
  kind: "CHAPTER" | "FULL";
  contentHtml: string;
  sortOrder: number;
};

export type ExportableNode = {
  nodeId: string;
  nodeKey: string;
  displayName: string;
  versionId: string;
  versionNumber: number;
  sections: ExportableSection[];
};

/**
 * Single source of truth for "what's in this node" when exporting it to
 * any external format (.docx regeneration, future deck export, PDF book, etc.).
 *
 * Returns enabled sections of the current version, in `sortOrder`.
 * Use `opts.layer` to filter to CHAPTER or FULL only.
 */
export async function getNodeContentForExport(
  nodeId: string,
  opts: { layer?: "CHAPTER" | "FULL" | "BOTH" } = {}
): Promise<ExportableNode | null> {
  const layer = opts.layer ?? "BOTH";

  const node = await prisma.node.findUnique({
    where: { id: nodeId },
    include: {
      versions: {
        where: { isCurrent: true },
        take: 1,
        include: {
          sections: { orderBy: { sortOrder: "asc" } },
        },
      },
    },
  });

  if (!node || !node.versions[0]) return null;
  const version = node.versions[0];

  const sections: ExportableSection[] = version.sections
    .filter((s) =>
      layer === "BOTH" ? true : (s.displayLayer as "CHAPTER" | "FULL") === layer
    )
    .map((s) => ({
      templateId: null,
      sectionKey: s.sectionKey,
      displayName: s.sectionTitle,
      kind: s.displayLayer as "CHAPTER" | "FULL",
      contentHtml: s.content,
      sortOrder: s.sortOrder,
    }));

  return {
    nodeId: node.id,
    nodeKey: node.nodeKey,
    displayName: node.displayName,
    versionId: version.id,
    versionNumber: version.versionNumber,
    sections,
  };
}
