import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

// Use direct Postgres URL for seeding (bypasses prisma+postgres proxy)
const connectionString = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL!;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const EP_SUMMARIES: Record<string, string> = {
  kbi: `Executive Presence is a specialized B2B services firm that helps executives and organizations build trust, visibility, and influence through authentic thought leadership on LinkedIn. You currently support approximately 47 active clients across three business models: EP 1.0 (individual executive programs), CoCreate (a lower-touch hybrid), and a small but strategically important set of EP 2.0 multi-executive engagements.

Your current positioning around "LinkedIn content for executives" has built the business to roughly $200K in MRR, but has exposed structural issues: tight margins, consistent churn, and an inconsistent pipeline. Most individual executive clients struggle to see attributable ROI, and when a CMO reprioritizes, these one-off relationships churn.

The goal of this engagement is to reposition Executive Presence from a partner to individual executives toward an organizational brand partner supporting the entire go-to-market function — reducing churn and improving revenue quality by shifting from one-off executives to embedded, organization-wide partnerships.`,

  icp_alignment: `The ideal target client for Executive Presence 2.0 is a growth-stage B2B company where leadership credibility shapes market perception and market perception is necessary for growth. These are companies with $20M or more in annual revenue, 50 to 2,000+ employees, in industries like IT services, professional services, finance, managed services, and technology-enabled businesses.

The right client has a real point of view worth amplifying and a CEO who is willing to put it to work. They are not looking for a posting service — they want a partner who will push back on weak ideas, extract what's actually worth saying, and connect it to how the rest of the business operates. Inflection points such as recent acquisitions, PE backing, or upcoming liquidity events are strong buying signals.`,

  comp_analysis: `The executive visibility market is expanding rapidly — the ghostwriting industry alone has grown from $1.55B in 2021 to $2.05B in 2025. This growth has lowered the barrier to producing polished content without solving the deeper challenge: building real executive credibility that connects back to business outcomes.

The competitive landscape is fragmented across content agencies, ghostwriters, PR firms, brand consultants, and sales-focused social selling firms. Most serve individual executives, not leadership teams. No major competitor offers a coordinated, cross-executive visibility system — this leaves a clear gap at the organizational level, exactly where Executive Presence 2.0 is positioned to compete.

When companies don't work with Executive Presence, they typically rely on PR firms that fold LinkedIn into a broader engagement (losing platform focus), internal marketing teams that add LinkedIn to existing responsibilities (no dedicated strategy), AI tools combined with DIY effort, or playbook agencies that promise a system and a schedule (volume over substance).`,

  positioning_options: `Three strategic directions were evaluated for how Executive Presence transitions from EP 1.0 to EP 2.0. Option A uses catalytic business moments (fundraising, launches, exits) as the wedge into organizational coordination. Option B builds a full communication foundation framework that extends beyond LinkedIn. Option C leads with CEO-only at a premium price point and adds executives over time.

Each option was assessed on its target buyer, qualifying criteria, deal-breaker scenarios, pricing model, and competitive defensibility. The core tension across all three: the entry strategy must get Executive Presence to organizational coordination without trapping it back in individual executive services — which is what killed the 1.0 model.`,

  positioning_guide: `Executive Presence chose Direction A: the LinkedIn-native intelligence partner. This positions EP as the company that turns what executives say on LinkedIn into an intelligence engine that informs go-to-market decisions — not a content production service.

The positioning rests on two defensible pillars. First, the Market Intelligence Loop: EP tracks what resonates on LinkedIn and translates that signal into intelligence that informs GTM messaging, recruiting narratives, investor conversations, and sales language. Internal marketing stops treating EP as a content vendor and starts looking to it for signal. Second, the Diagnostic as Step One: every engagement begins with deep-dive interviews that surface what the executive actually believes and what they want to be known for — confirming substance exists before committing to amplify it.

This is the strategic gate for your entire engagement. Your target personas, brand story, messaging playbook, and GTM plan all build directly on this decision. Any revision to this positioning requires review of every downstream deliverable.`,

  target_personas: `We've defined two distinct buyer personas that will guide your go-to-market strategy, building directly on your Positioning Guide and ICP alignment work. These personas represent the CEOs most likely to invest in executive presence services, each with fundamentally different motivations and decision-making processes.

The Platform Builder is your enterprise segment — CEOs of $100M+ companies built through acquisition who are preparing for liquidity events. They're already active on LinkedIn organically but lack systematic amplification. The Scale-Up Strategist represents your growth segment — CEOs of $20-100M companies that are post-acquisition or PE-backed. They're managing integration pressures while trying to maintain market presence through small, overwhelmed marketing teams.

The critical insight is that these personas have opposite tolerance for risk and different entry points. Platform Builders will pay premium prices without negotiation if convinced of value, but they demand mutual evaluation and bi-directional feedback. Scale-Up Strategists operate in the $5-10K comfort zone and need upfront strategic work to prove value before committing to ongoing retainers.`,
};

const NODE_CONFIGS = [
  { nodeKey: "kbi", displayName: "Key Business Information", sortOrder: 1, isGate: false, isConditional: false, status: "complete" as const, dependsOn: [] },
  { nodeKey: "icp_alignment", displayName: "ICP Alignment", sortOrder: 2, isGate: false, isConditional: true, status: "complete" as const, dependsOn: ["kbi"] },
  { nodeKey: "comp_analysis", displayName: "Competitive Analysis", sortOrder: 3, isGate: false, isConditional: false, status: "complete" as const, dependsOn: ["kbi"] },
  { nodeKey: "positioning_options", displayName: "Positioning Options", sortOrder: 4, isGate: false, isConditional: false, status: "complete" as const, dependsOn: ["kbi", "icp_alignment", "comp_analysis"] },
  { nodeKey: "positioning_guide", displayName: "Positioning Guide", sortOrder: 5, isGate: true, isConditional: false, status: "complete" as const, dependsOn: ["positioning_options"] },
  { nodeKey: "target_personas", displayName: "Target Personas", sortOrder: 6, isGate: false, isConditional: false, status: "active" as const, dependsOn: ["positioning_guide", "icp_alignment"] },
  { nodeKey: "offer_architecture", displayName: "Offer Architecture", sortOrder: 7, isGate: false, isConditional: true, status: "locked" as const, dependsOn: ["positioning_guide", "target_personas"] },
  { nodeKey: "brand_story", displayName: "Brand Story", sortOrder: 8, isGate: false, isConditional: false, status: "locked" as const, dependsOn: ["positioning_guide", "target_personas"] },
  { nodeKey: "messaging_playbook", displayName: "Messaging Playbook", sortOrder: 9, isGate: false, isConditional: false, status: "locked" as const, dependsOn: ["brand_story"] },
  { nodeKey: "gtm_plan", displayName: "GTM Plan", sortOrder: 10, isGate: false, isConditional: false, status: "locked" as const, dependsOn: ["messaging_playbook", "offer_architecture"] },
];

async function main() {
  console.log("Seeding database...");

  // Clear existing data
  await prisma.cascadeFlag.deleteMany();
  await prisma.nodeVersion.deleteMany();
  await prisma.nodeDependency.deleteMany();
  await prisma.node.deleteMany();
  await prisma.engagementUser.deleteMany();
  await prisma.engagement.deleteMany();
  await prisma.user.deleteMany();

  // Create users
  const adminHash = await bcrypt.hash("admin123", 12);
  const clientHash = await bcrypt.hash("client123", 12);

  const admin = await prisma.user.create({
    data: {
      email: "admin@meetotm.com",
      name: "OTM Admin",
      passwordHash: adminHash,
      role: "ADMIN",
    },
  });

  const client = await prisma.user.create({
    data: {
      email: "client@example.com",
      name: "Justin MyCo",
      passwordHash: clientHash,
      role: "CLIENT",
    },
  });

  // Create engagement
  const engagement = await prisma.engagement.create({
    data: {
      clientName: "Executive Presence",
      lifecycleStage: "Traction",
    },
  });

  // Link users to engagement
  await prisma.engagementUser.createMany({
    data: [
      { userId: admin.id, engagementId: engagement.id },
      { userId: client.id, engagementId: engagement.id },
    ],
  });

  // Create nodes
  const nodeMap = new Map<string, string>(); // nodeKey -> nodeId

  for (const config of NODE_CONFIGS) {
    const node = await prisma.node.create({
      data: {
        engagementId: engagement.id,
        nodeKey: config.nodeKey,
        displayName: config.displayName,
        sortOrder: config.sortOrder,
        isGate: config.isGate,
        isConditional: config.isConditional,
        status: config.status,
      },
    });
    nodeMap.set(config.nodeKey, node.id);

    // Create initial version with exec summary if complete
    const summary = EP_SUMMARIES[config.nodeKey];
    if (summary) {
      await prisma.nodeVersion.create({
        data: {
          nodeId: node.id,
          versionNumber: 1,
          execSummary: summary,
          isCurrent: true,
          isBaseline: true,
        },
      });
    }
  }

  // Create dependencies
  for (const config of NODE_CONFIGS) {
    const nodeId = nodeMap.get(config.nodeKey)!;
    for (const depKey of config.dependsOn) {
      const depId = nodeMap.get(depKey)!;
      await prisma.nodeDependency.create({
        data: {
          nodeId,
          dependsOnNodeId: depId,
        },
      });
    }
  }

  console.log("Seeded:");
  console.log(`  - 2 users (admin@meetotm.com / admin123, client@example.com / client123)`);
  console.log(`  - 1 engagement (Executive Presence)`);
  console.log(`  - 10 nodes with dependencies`);
  console.log(`  - ${Object.keys(EP_SUMMARIES).length} node versions with exec summaries`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
