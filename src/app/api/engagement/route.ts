import { NextRequest, NextResponse } from "next/server";
import { getEngagementFresh } from "@/lib/data-store";
import { getUserEngagementId } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const requested = req.nextUrl.searchParams.get("engagement") ?? undefined;
    const engagementId = await getUserEngagementId(requested);
    if (!engagementId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const engagement = await getEngagementFresh(engagementId);
    return NextResponse.json({ ...engagement, id: engagementId });
  } catch (error) {
    console.error("Failed to fetch engagement:", error);
    return NextResponse.json({ error: "Failed to fetch engagement" }, { status: 500 });
  }
}
