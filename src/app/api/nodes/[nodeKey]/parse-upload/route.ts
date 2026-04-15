import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { parseDocument } from "@/lib/doc-parser";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ nodeKey: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { nodeKey } = await params;

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const filename = file.name.toLowerCase();
    if (!filename.endsWith(".docx")) {
      return NextResponse.json(
        { error: "Only .docx files are supported for section parsing" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await parseDocument(buffer, nodeKey);

    return NextResponse.json({
      matched: result.matched,
      unmatched: result.unmatched,
      missing: result.missing,
      filename: file.name,
    });
  } catch (error) {
    console.error("Parse-upload error:", error);
    const message = error instanceof Error ? error.message : "Failed to parse document";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
