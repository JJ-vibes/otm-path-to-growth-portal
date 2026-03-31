import { NextRequest, NextResponse } from "next/server";
import { resolveFlag } from "@/lib/data-store";
import { getSessionUser, getUserEngagementId } from "@/lib/session";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ nodeKey: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const engagementId = await getUserEngagementId();
    if (!engagementId) {
      return NextResponse.json({ error: "No engagement found" }, { status: 404 });
    }

    const { nodeKey } = await params;
    const engagement = await resolveFlag(nodeKey, engagementId);
    return NextResponse.json({ success: true, engagement });
  } catch (error) {
    console.error("Resolve flag error:", error);
    return NextResponse.json({ error: "Failed to resolve flag" }, { status: 500 });
  }
}
