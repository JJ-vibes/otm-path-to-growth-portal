import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

const UPLOADS_DIR = path.join(process.cwd(), "uploads");

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; assetId: string }> }
) {
  const admin = await getSessionUser();
  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id: engagementId, assetId } = await params;
  const asset = await prisma.engagementAsset.findFirst({
    where: { id: assetId, engagementId },
  });
  if (!asset) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.engagementAsset.delete({ where: { id: assetId } });

  // Best-effort: remove the underlying file
  try {
    const fp = path.join(UPLOADS_DIR, asset.url);
    if (fp.startsWith(UPLOADS_DIR) && fs.existsSync(fp)) {
      fs.unlinkSync(fp);
    }
  } catch (e) {
    console.warn("Failed to remove asset file:", e);
  }

  return NextResponse.json({ success: true });
}
