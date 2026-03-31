import { NextResponse } from "next/server";
import { getEngagementFresh } from "@/lib/data-store";
import { getUserEngagementId } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const engagementId = await getUserEngagementId();
    if (!engagementId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const engagement = await getEngagementFresh(engagementId);
    return NextResponse.json(engagement);
  } catch (error) {
    console.error("Failed to fetch engagement:", error);
    return NextResponse.json({ error: "Failed to fetch engagement" }, { status: 500 });
  }
}
