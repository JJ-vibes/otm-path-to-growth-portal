import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export async function POST(req: NextRequest) {
  try {
    const {
      text,
      nodeDisplayName,
      upstreamNames,
      downstreamNames,
      isGate,
    } = await req.json();

    if (!text || !nodeDisplayName) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const upstreamList = (upstreamNames || []).join(", ") || "None (this is the first deliverable)";
    const downstreamList = (downstreamNames || []).join(", ") || "None";

    const prompt = `You are an executive summary writer for OTM, a B2B growth consultancy for professional services firms.

A strategy document has been uploaded for the "${nodeDisplayName}" section of a client engagement.

Write a concise executive summary (3-5 paragraphs) that:
1. States the key conclusions or decisions in plain, confident language
2. Uses "you/your" language — written FOR the client
3. Explains what upstream work this builds on (reference prior deliverables by name)
4. States what this enables downstream
5. Highlights critical decisions and why they matter
6. Avoids jargon and filler — focus on outcomes and implications

Sound like a senior strategist explaining "here's what we concluded and why it matters."

This deliverable builds on: ${upstreamList}
This deliverable unlocks: ${downstreamList}
${isGate ? "This is the STRATEGIC GATE — all downstream work depends on this decision." : ""}

Document content:
${text.slice(0, 50000)}`;

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const summary =
      message.content[0].type === "text" ? message.content[0].text : "";

    return NextResponse.json({ summary });
  } catch (error) {
    console.error("Extract summary error:", error);
    return NextResponse.json(
      { error: "Failed to generate summary" },
      { status: 500 }
    );
  }
}
