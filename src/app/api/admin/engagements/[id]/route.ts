import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json();

  const data: {
    clientName?: string;
    lifecycleStage?: string;
    internalNotes?: string | null;
    clientLogoUrl?: string | null;
  } = {};
  if (typeof body.clientName === "string") data.clientName = body.clientName.slice(0, 200);
  if (typeof body.lifecycleStage === "string") data.lifecycleStage = body.lifecycleStage;
  if ("internalNotes" in body) data.internalNotes = body.internalNotes ?? null;
  if ("clientLogoUrl" in body) data.clientLogoUrl = body.clientLogoUrl ?? null;

  try {
    const updated = await prisma.engagement.update({ where: { id }, data });
    return NextResponse.json({ engagement: updated });
  } catch {
    return NextResponse.json({ error: "Engagement not found" }, { status: 404 });
  }
}
