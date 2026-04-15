import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";
import fs from "fs";
import path from "path";
import { getSessionUser } from "@/lib/session";

const UPLOADS_DIR = path.join(process.cwd(), "uploads");

function ensureUploadsDir() {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = file.name.toLowerCase();
    let text = "";
    let html = "";

    if (filename.endsWith(".docx")) {
      const [textResult, htmlResult] = await Promise.all([
        mammoth.extractRawText({ buffer }),
        mammoth.convertToHtml({ buffer }),
      ]);
      text = textResult.value;
      html = htmlResult.value;
    } else if (filename.endsWith(".pdf")) {
      const { default: pdfParse } = await import("pdf-parse");
      const result = await pdfParse(buffer);
      text = result.text;
    } else if (
      filename.endsWith(".md") ||
      filename.endsWith(".markdown") ||
      filename.endsWith(".txt")
    ) {
      text = buffer.toString("utf-8");
    } else {
      return NextResponse.json(
        { error: "Unsupported file type. Upload .docx, .pdf, .md, or .txt" },
        { status: 400 }
      );
    }

    // Save file to disk
    ensureUploadsDir();
    const timestamp = Date.now();
    const safeFilename = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const filePath = path.join(UPLOADS_DIR, safeFilename);
    fs.writeFileSync(filePath, buffer);

    return NextResponse.json({
      text,
      html: html || undefined,
      filename: file.name,
      storedFilename: safeFilename,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to extract text from document" },
      { status: 500 }
    );
  }
}
