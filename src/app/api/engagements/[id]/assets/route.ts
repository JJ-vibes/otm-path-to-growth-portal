import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, canAccessEngagement } from "@/lib/session";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: engagementId } = await params;
  const allowed = await canAccessEngagement(engagementId);
  if (!allowed) return NextResponse.json({ error: "Not found" }, { status: 404 });

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
