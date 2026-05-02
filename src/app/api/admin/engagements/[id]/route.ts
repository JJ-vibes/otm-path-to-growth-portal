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
  } = {};
  if (typeof body.clientName === "string") data.clientName = body.clientName.slice(0, 200);
  if (typeof body.lifecycleStage === "string") data.lifecycleStage = body.lifecycleStage;
  if ("internalNotes" in body) data.internalNotes = body.internalNotes ?? null;

  try {
    const updated = await prisma.engagement.update({ where: { id }, data });
    return NextResponse.json({ engagement: updated });
  } catch {
    return NextResponse.json({ error: "Engagement not found" }, { status: 404 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;

  // Require the caller to confirm by repeating the engagement's clientName.
  // This is the second step of the two-step delete flow.
  const body = await req.json().catch(() => ({}));
  const confirm = typeof body.confirmName === "string" ? body.confirmName : "";

  const engagement = await prisma.engagement.findUnique({
    where: { id },
    select: { id: true, clientName: true },
  });
  if (!engagement) {
    return NextResponse.json({ error: "Engagement not found" }, { status: 404 });
  }
  if (confirm.trim() !== engagement.clientName) {
    return NextResponse.json(
      { error: "Confirmation text doesn't match the client name" },
      { status: 400 }
    );
  }

  // Schema cascades: deleting the engagement removes nodes, dependencies,
  // versions, sections, cascade flags, engagement users, and node configs.
  await prisma.engagement.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
