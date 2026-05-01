import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import { getSessionUser, getUserEngagementId } from "@/lib/session";
import { getNodeContentForExport } from "@/lib/section-export";

const UPLOADS_DIR = path.join(process.cwd(), "uploads");

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ nodeKey: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const engagementId = await getUserEngagementId();
    if (!engagementId) {
      return NextResponse.json({ error: "No engagement found" }, { status: 404 });
    }

    const { nodeKey } = await params;
    const dbNode = await prisma.node.findFirst({ where: { engagementId, nodeKey } });
    if (!dbNode) {
      return NextResponse.json({ error: "Node not found" }, { status: 404 });
    }

    const exportable = await getNodeContentForExport(dbNode.id);
    if (!exportable || exportable.sections.length === 0) {
      return NextResponse.json(
        { error: "No content to export" },
        { status: 400 }
      );
    }

    const { default: HTMLtoDOCX } = await import("html-to-docx");

    const htmlBody = exportable.sections
      .map((s) => `<h1>${escapeHtml(s.displayName)}</h1>${s.contentHtml || ""}`)
      .join("\n");

    const fullHtml = `<!DOCTYPE html><html><body>${htmlBody}</body></html>`;

    const buffer = await HTMLtoDOCX(fullHtml, null, {
      table: { row: { cantSplit: true } },
      font: "Lato",
      fontSize: 22, // half-points; 22 = 11pt
      margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
      title: exportable.displayName,
      creator: "OTM Portal",
    });

    if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    const ts = Date.now();
    const filename = `${engagementId}_${nodeKey}_v${exportable.versionNumber}_regenerated_${ts}.docx`;
    const filePath = path.join(UPLOADS_DIR, filename);
    fs.writeFileSync(filePath, buffer);

    await prisma.nodeVersion.update({
      where: { id: exportable.versionId },
      data: {
        documentUrl: filename,
        docxOutOfSync: false,
        docxRegeneratedAt: new Date(),
      },
    });

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${nodeKey}_updated.docx"`,
      },
    });
  } catch (error) {
    console.error("Regenerate-docx error:", error);
    return NextResponse.json(
      { error: "Failed to generate .docx" },
      { status: 500 }
    );
  }
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
