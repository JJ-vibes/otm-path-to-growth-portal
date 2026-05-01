import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

const UPLOADS_DIR = path.join(process.cwd(), "uploads");
const MAX_BYTES = 25 * 1024 * 1024;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getSessionUser();
  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id: engagementId } = await params;
  const assets = await prisma.engagementAsset.findMany({
    where: { engagementId },
    orderBy: { uploadedAt: "desc" },
  });
  return NextResponse.json({
    assets: assets.map((a) => ({
      id: a.id,
      filename: a.filename,
      url: a.url,
      mimeType: a.mimeType,
      sizeBytes: a.sizeBytes,
      uploadedAt: a.uploadedAt.toISOString(),
    })),
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getSessionUser();
  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id: engagementId } = await params;
  const fd = await req.formData();
  const file = fd.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 25MB)" }, { status: 413 });
  }

  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200);
  const filename = `asset_${engagementId}_${Date.now()}_${safeName}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(path.join(UPLOADS_DIR, filename), buffer);

  const asset = await prisma.engagementAsset.create({
    data: {
      engagementId,
      filename: file.name,
      url: filename,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
      uploadedBy: admin.id,
    },
  });

  return NextResponse.json(
    {
      asset: {
        id: asset.id,
        filename: asset.filename,
        url: asset.url,
        mimeType: asset.mimeType,
        sizeBytes: asset.sizeBytes,
        uploadedAt: asset.uploadedAt.toISOString(),
      },
    },
    { status: 201 }
  );
}
