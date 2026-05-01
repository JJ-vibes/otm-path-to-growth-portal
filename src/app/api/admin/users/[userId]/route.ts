import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const admin = await getSessionUser();
  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { userId } = await params;
  const body = await req.json();
  const data: {
    name?: string;
    email?: string;
    active?: boolean;
    deactivatedAt?: Date | null;
  } = {};
  if (typeof body.name === "string") data.name = body.name.trim().slice(0, 100);
  if (typeof body.email === "string") {
    const e = body.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) || e.length > 254) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }
    data.email = e;
  }
  if (typeof body.active === "boolean") {
    data.active = body.active;
    data.deactivatedAt = body.active ? null : new Date();
  }

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, name: true, email: true, active: true, deactivatedAt: true },
    });
    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
}
