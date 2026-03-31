import { NextResponse } from "next/server";
import puppeteer from "puppeteer";
import { getEngagementFresh } from "@/lib/data-store";
import { generateStrategyBookHTML } from "@/lib/strategy-book-template";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  try {
    const engagement = getEngagementFresh();
    const html = generateStrategyBookHTML(engagement);

    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdf = await page.pdf({
      format: "letter",
      margin: { top: "1in", right: "1in", bottom: "1in", left: "1in" },
      printBackground: true,
    });

    await browser.close();

    const filename = `${engagement.clientName.replace(/\s+/g, "_")}_Strategy_Book.pdf`;

    return new NextResponse(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Strategy book generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate strategy book" },
      { status: 500 }
    );
  }
}
