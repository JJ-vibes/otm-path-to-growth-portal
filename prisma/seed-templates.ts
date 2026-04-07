/**
 * Production-safe script: seeds NodeTemplate rows and migrates existing
 * execSummary-only content into NodeSection records.
 *
 * Usage:
 *   DIRECT_DATABASE_URL="<url>" DATABASE_URL="<url>" npx tsx prisma/seed-templates.ts
 *
 * Safe to run multiple times — uses upsert for templates and skips
 * versions that already have sections.
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL!;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const NODE_TEMPLATES = [
  // Node 1: KBI
  { nodeKey: "kbi", sectionKey: "company_overview", sectionTitle: "Company Overview", sortOrder: 1, displayLayer: "CHAPTER" as const, isRequired: true, description: "Who they are, what they do, current state" },
  { nodeKey: "kbi", sectionKey: "company_goals", sectionTitle: "Company Goals", sortOrder: 2, displayLayer: "CHAPTER" as const, isRequired: true, description: "What they're trying to achieve" },
  { nodeKey: "kbi", sectionKey: "situation_analysis", sectionTitle: "Situation Analysis", sortOrder: 3, displayLayer: "CHAPTER" as const, isRequired: true, description: "OTM's preliminary read — framed as initial assessment subject to downstream validation" },
  { nodeKey: "kbi", sectionKey: "services_approach", sectionTitle: "Services & Current Approach", sortOrder: 4, displayLayer: "FULL" as const, isRequired: true, description: "Descriptive, not analytical" },
  { nodeKey: "kbi", sectionKey: "preliminary_differentiators", sectionTitle: "Preliminary Differentiators", sortOrder: 5, displayLayer: "FULL" as const, isRequired: true, description: "Client's claimed differentiators, captured as-stated without competitive assessment" },
  { nodeKey: "kbi", sectionKey: "current_buyer_profile", sectionTitle: "Current Buyer Profile", sortOrder: 6, displayLayer: "FULL" as const, isRequired: true, description: "Who they sell to today as the client describes it — not a validated ICP" },
  { nodeKey: "kbi", sectionKey: "sales_process", sectionTitle: "Sales Process & Friction Points", sortOrder: 7, displayLayer: "FULL" as const, isRequired: true, description: "How they sell today, what breaks" },
  { nodeKey: "kbi", sectionKey: "named_competitors", sectionTitle: "Named Competitors", sortOrder: 8, displayLayer: "FULL" as const, isRequired: true, description: "Listed, not analyzed — analysis is Comp Analysis's job" },
  { nodeKey: "kbi", sectionKey: "marketing_audit", sectionTitle: "Current Marketing Audit", sortOrder: 9, displayLayer: "FULL" as const, isRequired: true, description: "Descriptive inventory of what exists" },
  { nodeKey: "kbi", sectionKey: "additional_research", sectionTitle: "Additional Research", sortOrder: 10, displayLayer: "FULL" as const, isRequired: false, description: "Supplementary context, varies by engagement" },

  // Node 2: ICP Alignment
  { nodeKey: "icp_alignment", sectionKey: "validation_summary", sectionTitle: "Validation Summary", sortOrder: 1, displayLayer: "CHAPTER" as const, isRequired: true, description: "What interviews confirmed, challenged, or changed about preliminary ICP" },
  { nodeKey: "icp_alignment", sectionKey: "revised_icp", sectionTitle: "Revised ICP Recommendation", sortOrder: 2, displayLayer: "CHAPTER" as const, isRequired: false, description: "Only present if ICP changed based on findings" },
  { nodeKey: "icp_alignment", sectionKey: "key_findings", sectionTitle: "Key Findings by Theme", sortOrder: 3, displayLayer: "FULL" as const, isRequired: true, description: "Organized around the questions interviews were designed to answer" },
  { nodeKey: "icp_alignment", sectionKey: "interview_methodology", sectionTitle: "Interview Methodology", sortOrder: 4, displayLayer: "FULL" as const, isRequired: true, description: "Who was interviewed, what was asked, how findings were synthesized" },
  { nodeKey: "icp_alignment", sectionKey: "interview_analyses", sectionTitle: "Interview Analyses", sortOrder: 5, displayLayer: "FULL" as const, isRequired: false, description: "Individual interview writeups" },

  // Node 3: Comp Analysis
  { nodeKey: "comp_analysis", sectionKey: "market_context", sectionTitle: "Market Context", sortOrder: 1, displayLayer: "CHAPTER" as const, isRequired: true, description: "What's happening in the market — trends, sizing, dynamics" },
  { nodeKey: "comp_analysis", sectionKey: "competitive_landscape", sectionTitle: "Competitive Landscape Overview", sortOrder: 2, displayLayer: "CHAPTER" as const, isRequired: true, description: "How the market is structured, categories of competitors" },
  { nodeKey: "comp_analysis", sectionKey: "differentiation_assessment", sectionTitle: "Differentiation Assessment", sortOrder: 3, displayLayer: "CHAPTER" as const, isRequired: true, description: "KBI's preliminary differentiators stress-tested against competitive reality" },
  { nodeKey: "comp_analysis", sectionKey: "competitive_whitespace", sectionTitle: "Competitive Whitespace", sortOrder: 4, displayLayer: "CHAPTER" as const, isRequired: true, description: "Where the gaps are — what no competitor owns. Ends here. No positioning recommendation." },
  { nodeKey: "comp_analysis", sectionKey: "brand_naming", sectionTitle: "Brand Naming & Discoverability", sortOrder: 5, displayLayer: "CHAPTER" as const, isRequired: false, description: "If applicable" },
  { nodeKey: "comp_analysis", sectionKey: "competitor_deep_dives", sectionTitle: "Competitor Deep Dives", sortOrder: 6, displayLayer: "FULL" as const, isRequired: true, description: "Individual competitor teardowns" },
  { nodeKey: "comp_analysis", sectionKey: "pricing_benchmarks", sectionTitle: "Pricing Benchmarks", sortOrder: 7, displayLayer: "FULL" as const, isRequired: true, description: "Market pricing data" },
  { nodeKey: "comp_analysis", sectionKey: "market_data", sectionTitle: "Market Data & Sources", sortOrder: 8, displayLayer: "FULL" as const, isRequired: false, description: "Third-party data, sentiment research" },

  // Node 4: Positioning Options
  { nodeKey: "positioning_options", sectionKey: "core_question", sectionTitle: "The Core Question", sortOrder: 1, displayLayer: "CHAPTER" as const, isRequired: true, description: "Frames the strategic decision using whitespace and ICP as inputs" },
  { nodeKey: "positioning_options", sectionKey: "strategic_comparison", sectionTitle: "Strategic Comparison", sortOrder: 2, displayLayer: "CHAPTER" as const, isRequired: true, description: "Side-by-side on key dimensions" },
  { nodeKey: "positioning_options", sectionKey: "recommendation", sectionTitle: "Recommendation & Decision Criteria", sortOrder: 3, displayLayer: "CHAPTER" as const, isRequired: true, description: "OTM's perspective plus decision criteria" },
  { nodeKey: "positioning_options", sectionKey: "option_a", sectionTitle: "Option A", sortOrder: 4, displayLayer: "FULL" as const, isRequired: true, description: "Full option: Who & When, The Bet, Differentiation, What You Need to Win, Deal Breakers, Business Model" },
  { nodeKey: "positioning_options", sectionKey: "option_b", sectionTitle: "Option B", sortOrder: 5, displayLayer: "FULL" as const, isRequired: true, description: "Same structure as Option A" },
  { nodeKey: "positioning_options", sectionKey: "option_c", sectionTitle: "Option C", sortOrder: 6, displayLayer: "FULL" as const, isRequired: false, description: "Same structure, when applicable" },

  // Node 5: Positioning Guide (GATE — all CHAPTER)
  { nodeKey: "positioning_guide", sectionKey: "target_client", sectionTitle: "Target Client Definition", sortOrder: 1, displayLayer: "CHAPTER" as const, isRequired: true, description: null },
  { nodeKey: "positioning_guide", sectionKey: "problem_solved", sectionTitle: "Problem We Solve", sortOrder: 2, displayLayer: "CHAPTER" as const, isRequired: true, description: null },
  { nodeKey: "positioning_guide", sectionKey: "competitive_alternatives", sectionTitle: "Competitive Alternatives", sortOrder: 3, displayLayer: "CHAPTER" as const, isRequired: true, description: null },
  { nodeKey: "positioning_guide", sectionKey: "market_category", sectionTitle: "Market Category", sortOrder: 4, displayLayer: "CHAPTER" as const, isRequired: true, description: null },
  { nodeKey: "positioning_guide", sectionKey: "positioning_statement", sectionTitle: "Positioning Statement", sortOrder: 5, displayLayer: "CHAPTER" as const, isRequired: true, description: null },
  { nodeKey: "positioning_guide", sectionKey: "core_differentiators", sectionTitle: "Core Differentiators", sortOrder: 6, displayLayer: "CHAPTER" as const, isRequired: true, description: null },
  { nodeKey: "positioning_guide", sectionKey: "content_themes", sectionTitle: "Content Themes", sortOrder: 7, displayLayer: "CHAPTER" as const, isRequired: true, description: null },

  // Node 6: Target Personas
  { nodeKey: "target_personas", sectionKey: "persona_overview", sectionTitle: "Persona Overview", sortOrder: 1, displayLayer: "CHAPTER" as const, isRequired: true, description: "How many personas, what differentiates them structurally" },
  { nodeKey: "target_personas", sectionKey: "icp_firmographics", sectionTitle: "ICP Firmographic Criteria", sortOrder: 2, displayLayer: "CHAPTER" as const, isRequired: true, description: "Inherited — one table, explicitly labeled as carried forward from ICP Alignment / KBI" },
  { nodeKey: "target_personas", sectionKey: "key_attributes", sectionTitle: "Ideal Client Key Attributes", sortOrder: 3, displayLayer: "CHAPTER" as const, isRequired: true, description: "Qualitative: beliefs, values, fit signals" },
  { nodeKey: "target_personas", sectionKey: "persona_1_summary", sectionTitle: "Persona 1 Summary", sortOrder: 4, displayLayer: "CHAPTER" as const, isRequired: true, description: "Compact: who they are, what they need, how they buy" },
  { nodeKey: "target_personas", sectionKey: "persona_2_summary", sectionTitle: "Persona 2 Summary", sortOrder: 5, displayLayer: "CHAPTER" as const, isRequired: false, description: "Same structure" },
  { nodeKey: "target_personas", sectionKey: "exclusion_criteria", sectionTitle: "Who We Should Not Target", sortOrder: 6, displayLayer: "CHAPTER" as const, isRequired: true, description: null },
  { nodeKey: "target_personas", sectionKey: "persona_1_canvas", sectionTitle: "Persona 1 Full Canvas", sortOrder: 7, displayLayer: "FULL" as const, isRequired: true, description: "Demographics, org context, current state, goals, pain points, success metrics, buying committee, decision pattern" },
  { nodeKey: "target_personas", sectionKey: "persona_2_canvas", sectionTitle: "Persona 2 Full Canvas", sortOrder: 8, displayLayer: "FULL" as const, isRequired: false, description: "Same structure" },
  { nodeKey: "target_personas", sectionKey: "reference_profiles", sectionTitle: "Reference Client Profiles", sortOrder: 9, displayLayer: "FULL" as const, isRequired: false, description: "Real companies analyzed against ICP" },

  // Node 7: Offer Architecture (conditional)
  { nodeKey: "offer_architecture", sectionKey: "service_architecture", sectionTitle: "Service Architecture", sortOrder: 1, displayLayer: "CHAPTER" as const, isRequired: true, description: "Tiers, anchor, add-ons — the structure itself" },
  { nodeKey: "offer_architecture", sectionKey: "pricing_model", sectionTitle: "Pricing Model", sortOrder: 2, displayLayer: "CHAPTER" as const, isRequired: true, description: "Logic, ranges, benchmarks" },
  { nodeKey: "offer_architecture", sectionKey: "packaging_rationale", sectionTitle: "Packaging Rationale", sortOrder: 3, displayLayer: "FULL" as const, isRequired: true, description: "Why this structure serves the ICP and positioning" },
  { nodeKey: "offer_architecture", sectionKey: "service_descriptions", sectionTitle: "Detailed Service Descriptions", sortOrder: 4, displayLayer: "FULL" as const, isRequired: true, description: "Scope per tier/package" },

  // Node 8: Brand Story (all CHAPTER)
  { nodeKey: "brand_story", sectionKey: "brand_story_framework", sectionTitle: "Brand Story Framework", sortOrder: 1, displayLayer: "CHAPTER" as const, isRequired: true, description: "7-Part Story: Character/Want → Problem → Guide → Plan → CTA → Success → Failure → Transformation" },
  { nodeKey: "brand_story", sectionKey: "one_liner", sectionTitle: "One-Liner", sortOrder: 2, displayLayer: "CHAPTER" as const, isRequired: true, description: null },
  { nodeKey: "brand_story", sectionKey: "positioning_statement_ref", sectionTitle: "Positioning Statement", sortOrder: 3, displayLayer: "CHAPTER" as const, isRequired: true, description: "Inherited — labeled as from Positioning Guide" },

  // Node 9: Messaging Playbook
  { nodeKey: "messaging_playbook", sectionKey: "one_page_summary", sectionTitle: "One-Page Messaging Summary", sortOrder: 1, displayLayer: "CHAPTER" as const, isRequired: true, description: "The entire playbook compressed to one page" },
  { nodeKey: "messaging_playbook", sectionKey: "messaging_house", sectionTitle: "Messaging House", sortOrder: 2, displayLayer: "CHAPTER" as const, isRequired: true, description: "The five pillars — structural bridge between brand story and operational language" },
  { nodeKey: "messaging_playbook", sectionKey: "tone_voice", sectionTitle: "Tone & Voice Guide", sortOrder: 3, displayLayer: "CHAPTER" as const, isRequired: true, description: null },
  { nodeKey: "messaging_playbook", sectionKey: "buying_committee_guide", sectionTitle: "Buying Committee Language Guide", sortOrder: 4, displayLayer: "FULL" as const, isRequired: true, description: "Per role: key message, proof needs, objection response" },
  { nodeKey: "messaging_playbook", sectionKey: "funnel_language_system", sectionTitle: "Funnel Language System", sortOrder: 5, displayLayer: "FULL" as const, isRequired: true, description: "Assets mapped to persona × funnel stage with copy frameworks" },
  { nodeKey: "messaging_playbook", sectionKey: "sales_language_library", sectionTitle: "Sales Language Library", sortOrder: 6, displayLayer: "FULL" as const, isRequired: true, description: "Objection handling scripts, framing by persona" },

  // Node 10: GTM Plan
  { nodeKey: "gtm_plan", sectionKey: "executive_overview", sectionTitle: "Executive Overview", sortOrder: 1, displayLayer: "CHAPTER" as const, isRequired: true, description: "What's being done, why, how success is measured" },
  { nodeKey: "gtm_plan", sectionKey: "performance_signals", sectionTitle: "Performance Signals & Exit Criteria", sortOrder: 2, displayLayer: "CHAPTER" as const, isRequired: true, description: "What to measure at 90 days, 6 months — when to advance phases" },
  { nodeKey: "gtm_plan", sectionKey: "system_architecture", sectionTitle: "System Architecture", sortOrder: 3, displayLayer: "CHAPTER" as const, isRequired: true, description: "How channels work together — the compound effect" },
  { nodeKey: "gtm_plan", sectionKey: "phase_1_activation", sectionTitle: "Phase 1 Activation Plan", sortOrder: 4, displayLayer: "FULL" as const, isRequired: true, description: "Foundational projects, top/mid/bottom of funnel activations with copy, cadences, budgets" },
  { nodeKey: "gtm_plan", sectionKey: "phase_2_scale", sectionTitle: "Phase 2: Scale What Works", sortOrder: 5, displayLayer: "FULL" as const, isRequired: true, description: "Post-validation expansion" },
  { nodeKey: "gtm_plan", sectionKey: "execution_roadmap", sectionTitle: "Execution Roadmap", sortOrder: 6, displayLayer: "FULL" as const, isRequired: true, description: "Week-by-week execution plan" },
];

async function main() {
  console.log("Seeding NodeTemplate rows (upsert — safe for production)...\n");

  let created = 0;
  let updated = 0;

  for (const t of NODE_TEMPLATES) {
    const result = await prisma.nodeTemplate.upsert({
      where: {
        nodeKey_sectionKey: { nodeKey: t.nodeKey, sectionKey: t.sectionKey },
      },
      create: t,
      update: {
        sectionTitle: t.sectionTitle,
        sortOrder: t.sortOrder,
        displayLayer: t.displayLayer,
        isRequired: t.isRequired,
        description: t.description,
      },
    });
    // upsert doesn't tell us if it was create vs update, just count all
    created++;
  }

  console.log(`  Upserted ${created} NodeTemplate rows across 10 nodes.\n`);

  // --- Migrate existing execSummary-only versions to sections ---
  console.log("Checking for NodeVersions without sections...\n");

  const versionsWithoutSections = await prisma.nodeVersion.findMany({
    where: {
      isCurrent: true,
      sections: { none: {} },
      execSummary: { not: "" },
    },
    include: {
      node: true,
    },
  });

  if (versionsWithoutSections.length === 0) {
    console.log("  All current versions already have sections. Nothing to migrate.\n");
  } else {
    console.log(`  Found ${versionsWithoutSections.length} version(s) to migrate.\n`);

    for (const version of versionsWithoutSections) {
      const templates = NODE_TEMPLATES.filter((t) => t.nodeKey === version.node.nodeKey);
      if (templates.length === 0) {
        console.log(`  Skipping ${version.node.nodeKey} — no templates defined.`);
        continue;
      }

      // Put the entire execSummary into the first CHAPTER section
      const firstChapter = templates.find((t) => t.displayLayer === "CHAPTER");
      if (firstChapter && version.execSummary) {
        await prisma.nodeSection.create({
          data: {
            nodeVersionId: version.id,
            sectionKey: firstChapter.sectionKey,
            sectionTitle: firstChapter.sectionTitle,
            content: version.execSummary,
            sortOrder: firstChapter.sortOrder,
            displayLayer: firstChapter.displayLayer,
          },
        });
        console.log(`  Migrated ${version.node.nodeKey} → ${firstChapter.sectionKey}`);
      }
    }
  }

  console.log("\nDone.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
