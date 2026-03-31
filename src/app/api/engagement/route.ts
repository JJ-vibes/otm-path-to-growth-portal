import { NextResponse } from "next/server";
import { getEngagementFresh } from "@/lib/data-store";

export const dynamic = "force-dynamic";

export async function GET() {
  const engagement = getEngagementFresh();
  return NextResponse.json(engagement);
}
