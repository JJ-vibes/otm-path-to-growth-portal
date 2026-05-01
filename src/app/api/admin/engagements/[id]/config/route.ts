import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getSessionUser();
  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id: engagementId } = await params;

  const nodes = await prisma.node.findMany({
    where: { engagementId },
    orderBy: { sortOrder: "asc" },
    include: { configs: { where: { engagementId } } },
  });

  const config = nodes.map((n) => {
    const cfg = n.configs.find((c) => c.engagementId === engagementId);
    return {
      nodeKey: n.nodeKey,
      displayName: n.displayName,
      excluded: cfg?.excluded ?? false,
      sectionToggles:
        (cfg?.sectionToggles as Record<string, boolean> | null | undefined) ?? null,
    };
  });

  return NextResponse.json({ config });
}
