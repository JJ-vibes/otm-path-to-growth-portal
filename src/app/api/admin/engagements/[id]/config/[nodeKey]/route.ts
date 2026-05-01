import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { getSessionUser } from "@/lib/session";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; nodeKey: string }> }
) {
  const admin = await getSessionUser();
  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id: engagementId, nodeKey } = await params;
  const body = await req.json();

  const node = await prisma.node.findFirst({ where: { engagementId, nodeKey } });
  if (!node) {
    return NextResponse.json({ error: "Node not found" }, { status: 404 });
  }

  const data: { excluded?: boolean; sectionToggles?: Prisma.InputJsonValue } = {};
  if (typeof body.excluded === "boolean") data.excluded = body.excluded;
  if (body.sectionToggles && typeof body.sectionToggles === "object") {
    data.sectionToggles = body.sectionToggles as Prisma.InputJsonValue;
  }

  const cfg = await prisma.engagementNodeConfig.upsert({
    where: { engagementId_nodeId: { engagementId, nodeId: node.id } },
    update: data,
    create: { engagementId, nodeId: node.id, ...data },
  });

  return NextResponse.json({
    config: {
      nodeKey,
      displayName: node.displayName,
      excluded: cfg.excluded,
      sectionToggles: cfg.sectionToggles ?? null,
    },
  });
}
