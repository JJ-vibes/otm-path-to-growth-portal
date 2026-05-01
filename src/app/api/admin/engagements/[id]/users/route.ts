import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
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
  const { id } = await params;
  const links = await prisma.engagementUser.findMany({
    where: { engagementId: id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          active: true,
          deactivatedAt: true,
          lastLoginAt: true,
          role: true,
        },
      },
    },
  });
  const users = links
    .filter((l) => l.user.role === "CLIENT")
    .map((l) => ({
      id: l.user.id,
      name: l.user.name,
      email: l.user.email,
      active: l.user.active,
      deactivatedAt: l.user.deactivatedAt?.toISOString() ?? null,
      lastLoginAt: l.user.lastLoginAt?.toISOString() ?? null,
    }));
  return NextResponse.json({ users });
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
  const url = new URL(req.url);
  const addExisting = url.searchParams.get("addExisting") === "true";

  const body = await req.json();
  const name = (body.name || "").trim();
  const email = (body.email || "").trim().toLowerCase();
  const password = body.password || "";

  if (!name || name.length > 100) {
    return NextResponse.json({ error: "Name required (1-100 chars)" }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }
  if (password.length < 8 || password.length > 128) {
    return NextResponse.json({ error: "Password must be 8-128 chars" }, { status: 400 });
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email } });

    if (existing && !addExisting) {
      return NextResponse.json(
        { error: "USER_EXISTS", existingUserId: existing.id },
        { status: 409 }
      );
    }

    let userId: string;
    if (existing) {
      userId = existing.id;
    } else {
      const passwordHash = await bcrypt.hash(password, 10);
      const created = await prisma.user.create({
        data: { name, email, passwordHash, role: "CLIENT" },
      });
      userId = created.id;
    }

    // Idempotently link user to engagement
    await prisma.engagementUser.upsert({
      where: { userId_engagementId: { userId, engagementId } },
      update: {},
      create: { userId, engagementId },
    });

    const user = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, name: true, email: true, active: true },
    });
    return NextResponse.json({ user }, { status: 201 });
  } catch (e) {
    console.error("Add user error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
