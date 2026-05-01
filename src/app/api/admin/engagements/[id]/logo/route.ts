import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

const UPLOADS_DIR = path.join(process.cwd(), "uploads");
const ALLOWED = new Set(["image/png", "image/jpeg", "image/svg+xml"]);
const MAX_BYTES = 2 * 1024 * 1024;

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
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: "Logo must be PNG, JPG, or SVG" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Logo must be 2MB or smaller" }, { status: 413 });
  }

  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  const ext = file.type === "image/svg+xml" ? "svg" : file.type === "image/png" ? "png" : "jpg";
  const filename = `logo_${engagementId}_${Date.now()}.${ext}`;
  const filePath = path.join(UPLOADS_DIR, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(filePath, buffer);

  await prisma.engagement.update({
    where: { id: engagementId },
    data: { clientLogoUrl: filename },
  });

  return NextResponse.json({ clientLogoUrl: filename });
}
