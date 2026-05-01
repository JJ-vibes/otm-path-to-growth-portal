import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const admin = await getSessionUser();
  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id: engagementId, userId } = await params;
  try {
    await prisma.engagementUser.delete({
      where: { userId_engagementId: { userId, engagementId } },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "User not on engagement" }, { status: 404 });
  }
}
