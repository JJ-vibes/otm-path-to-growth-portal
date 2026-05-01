import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const admin = await getSessionUser();
  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { userId } = await params;
  const { password } = await req.json();
  if (typeof password !== "string" || password.length < 8 || password.length > 128) {
    return NextResponse.json(
      { error: "Password must be 8-128 characters" },
      { status: 400 }
    );
  }
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
}
