import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

// Use direct Postgres URL for seeding (bypasses prisma+postgres proxy)
const connectionString = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL!;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

// ---------------------------------------------------------------------------
// 7-Node Cascade — Stage 1
// ---------------------------------------------------------------------------

const NODE_CONFIGS = [
  { nodeKey: "key-business-info", displayName: "Key Business Information", sortOrder: 1, isGate: false, isConditional: false, status: "complete" as const, dependsOn: [] as string[] },
  { nodeKey: "ideal-client-profile", displayName: "Ideal Client Profile", sortOrder: 2, isGate: false, isConditional: false, status: "complete" as const, dependsOn: ["key-business-info"] },
  { nodeKey: "competitive-analysis", displayName: "Competitive & Market Analysis", sortOrder: 3, isGate: false, isConditional: false, status: "complete" as const, dependsOn: ["key-business-info"] },
  { nodeKey: "positioning", displayName: "Positioning", sortOrder: 4, isGate: true, isConditional: false, status: "complete" as const, dependsOn: ["key-business-info", "ideal-client-profile", "competitive-analysis"] },
  { nodeKey: "what-are-we-selling", displayName: "What Are We Selling", sortOrder: 5, isGate: false, isConditional: true, status: "locked" as const, dependsOn: ["positioning", "ideal-client-profile"] },
  { nodeKey: "messaging-playbook", displayName: "Messaging Playbook", sortOrder: 6, isGate: false, isConditional: false, status: "active" as const, dependsOn: ["positioning"] },
  { nodeKey: "gtm-plan", displayName: "Go-to-Market Plan", sortOrder: 7, isGate: false, isConditional: false, status: "locked" as const, dependsOn: ["messaging-playbook", "what-are-we-selling"] },
];

// ---------------------------------------------------------------------------
// Node Templates — section definitions per node
// ---------------------------------------------------------------------------

const NODE_TEMPLATES = [
  // NODE 1: Key Business Information
  { nodeKey: "key-business-info", sectionKey: "company_overview", sectionTitle: "Company Overview", sortOrder: 1, displayLayer: "CHAPTER" as const, isRequired: true, isConditional: false, description: "Who they are, what they do, current state" },
  { nodeKey: "key-business-info", sectionKey: "company_goals", sectionTitle: "Company Goals", sortOrder: 2, displayLayer: "CHAPTER" as const, isRequired: true, isConditional: false, description: "What they're trying to achieve" },
  { nodeKey: "key-business-info", sectionKey: "situation_analysis", sectionTitle: "Situation Analysis", sortOrder: 3, displayLayer: "CHAPTER" as const, isRequired: true, isConditional: false, description: "OTM's preliminary read" },
  { nodeKey: "key-business-info", sectionKey: "services_approach", sectionTitle: "Services & Current Approach", sortOrder: 4, displayLayer: "FULL" as const, isRequired: true, isConditional: false, description: "Descriptive, not analytical" },
  { nodeKey: "key-business-info", sectionKey: "preliminary_differentiators", sectionTitle: "Preliminary Differentiators", sortOrder: 5, displayLayer: "FULL" as const, isRequired: true, isConditional: false, description: "Client's claimed differentiators, captured as-stated" },
  { nodeKey: "key-business-info", sectionKey: "current_buyer_profile", sectionTitle: "Current Buyer Profile", sortOrder: 6, displayLayer: "FULL" as const, isRequired: true, isConditional: false, description: "Who they sell to today as the client describes it" },
  { nodeKey: "key-business-info", sectionKey: "sales_process", sectionTitle: "Sales Process & Friction Points", sortOrder: 7, displayLayer: "FULL" as const, isRequired: true, isConditional: false, description: "How they sell today, what breaks" },
  { nodeKey: "key-business-info", sectionKey: "named_competitors", sectionTitle: "Named Competitors", sortOrder: 8, displayLayer: "FULL" as const, isRequired: true, isConditional: false, description: "Listed, not analyzed" },
  { nodeKey: "key-business-info", sectionKey: "marketing_audit", sectionTitle: "Current Marketing Audit", sortOrder: 9, displayLayer: "FULL" as const, isRequired: true, isConditional: false, description: "Descriptive inventory of what exists" },
  { nodeKey: "key-business-info", sectionKey: "additional_research", sectionTitle: "Additional Research", sortOrder: 10, displayLayer: "FULL" as const, isRequired: false, isConditional: false, description: "Supplementary context, varies by engagement" },

  // NODE 2: Ideal Client Profile
  { nodeKey: "ideal-client-profile", sectionKey: "icp_overview", sectionTitle: "ICP Overview", sortOrder: 1, displayLayer: "CHAPTER" as const, isRequired: true, isConditional: false, description: null },
  { nodeKey: "ideal-client-profile", sectionKey: "firmographic_criteria", sectionTitle: "Firmographic Criteria", sortOrder: 2, displayLayer: "CHAPTER" as const, isRequired: true, isConditional: false, description: null },
  { nodeKey: "ideal-client-profile", sectionKey: "key_attributes", sectionTitle: "Ideal Client Key Attributes", sortOrder: 3, displayLayer: "CHAPTER" as const, isRequired: true, isConditional: false, description: null },
  { nodeKey: "ideal-client-profile", sectionKey: "buyer_persona_1_summary", sectionTitle: "Buyer Persona 1 Summary", sortOrder: 4, displayLayer: "CHAPTER" as const, isRequired: true, isConditional: false, description: null },
  { nodeKey: "ideal-client-profile", sectionKey: "buyer_persona_2_summary", sectionTitle: "Buyer Persona 2 Summary", sortOrder: 5, displayLayer: "CHAPTER" as const, isRequired: false, isConditional: false, description: null },
  { nodeKey: "ideal-client-profile", sectionKey: "buying_committee", sectionTitle: "Buying Committee", sortOrder: 6, displayLayer: "CHAPTER" as const, isRequired: true, isConditional: false, description: null },
  { nodeKey: "ideal-client-profile", sectionKey: "exclusion_criteria", sectionTitle: "Who We Should Not Target", sortOrder: 7, displayLayer: "CHAPTER" as const, isRequired: true, isConditional: false, description: null },
  { nodeKey: "ideal-client-profile", sectionKey: "buyer_persona_1_canvas", sectionTitle: "Buyer Persona 1 Full Canvas", sortOrder: 8, displayLayer: "FULL" as const, isRequired: true, isConditional: false, description: null },
  { nodeKey: "ideal-client-profile", sectionKey: "buyer_persona_2_canvas", sectionTitle: "Buyer Persona 2 Full Canvas", sortOrder: 9, displayLayer: "FULL" as const, isRequired: false, isConditional: false, description: null },
  { nodeKey: "ideal-client-profile", sectionKey: "buying_committee_detail", sectionTitle: "Buying Committee Detail", sortOrder: 10, displayLayer: "FULL" as const, isRequired: true, isConditional: false, description: null },
  { nodeKey: "ideal-client-profile", sectionKey: "reference_profiles", sectionTitle: "Reference Client Profiles", sortOrder: 11, displayLayer: "FULL" as const, isRequired: false, isConditional: false, description: null },
  { nodeKey: "ideal-client-profile", sectionKey: "voc_validation_summary", sectionTitle: "VoC Validation Summary", sortOrder: 12, displayLayer: "CHAPTER" as const, isRequired: true, isConditional: true, description: "Only when engagement includes primary research" },
  { nodeKey: "ideal-client-profile", sectionKey: "voc_key_findings", sectionTitle: "VoC Key Findings by Theme", sortOrder: 13, displayLayer: "FULL" as const, isRequired: true, isConditional: true, description: null },
  { nodeKey: "ideal-client-profile", sectionKey: "voc_methodology", sectionTitle: "VoC Methodology", sortOrder: 14, displayLayer: "FULL" as const, isRequired: true, isConditional: true, description: null },
  { nodeKey: "ideal-client-profile", sectionKey: "voc_analyses", sectionTitle: "VoC Interview/Survey Analyses", sortOrder: 15, displayLayer: "FULL" as const, isRequired: false, isConditional: true, description: null },

  // NODE 3: Competitive & Market Analysis
  { nodeKey: "competitive-analysis", sectionKey: "market_context", sectionTitle: "Market Context", sortOrder: 1, displayLayer: "CHAPTER" as const, isRequired: true, isConditional: false, description: "Market trends, sizing, dynamics" },
  { nodeKey: "competitive-analysis", sectionKey: "competitive_landscape", sectionTitle: "Competitive Landscape Overview", sortOrder: 2, displayLayer: "CHAPTER" as const, isRequired: true, isConditional: false, description: "How the market is structured" },
  { nodeKey: "competitive-analysis", sectionKey: "differentiation_assessment", sectionTitle: "Differentiation Assessment", sortOrder: 3, displayLayer: "CHAPTER" as const, isRequired: true, isConditional: false, description: "Preliminary differentiators stress-tested" },
  { nodeKey: "competitive-analysis", sectionKey: "competitive_whitespace", sectionTitle: "Competitive Whitespace", sortOrder: 4, displayLayer: "CHAPTER" as const, isRequired: true, isConditional: false, description: "Where the gaps are" },
  { nodeKey: "competitive-analysis", sectionKey: "brand_naming", sectionTitle: "Brand Naming & Discoverability", sortOrder: 5, displayLayer: "CHAPTER" as const, isRequired: false, isConditional: false, description: "If applicable" },
  { nodeKey: "competitive-analysis", sectionKey: "competitor_deep_dives", sectionTitle: "Competitor Deep Dives", sortOrder: 6, displayLayer: "FULL" as const, isRequired: true, isConditional: false, description: "Individual competitor teardowns" },
  { nodeKey: "competitive-analysis", sectionKey: "pricing_benchmarks", sectionTitle: "Pricing Benchmarks", sortOrder: 7, displayLayer: "FULL" as const, isRequired: true, isConditional: false, description: "Market pricing data" },
  { nodeKey: "competitive-analysis", sectionKey: "market_data", sectionTitle: "Market Data & Sources", sortOrder: 8, displayLayer: "FULL" as const, isRequired: false, isConditional: false, description: "Third-party data, sentiment research" },

  // NODE 4: Positioning (GATE)
  { nodeKey: "positioning", sectionKey: "target_client", sectionTitle: "Target Client Definition", sortOrder: 1, displayLayer: "CHAPTER" as const, isRequired: true, isConditional: false, description: null },
  { nodeKey: "positioning", sectionKey: "problem_solved", sectionTitle: "Problem We Solve", sortOrder: 2, displayLayer: "CHAPTER" as const, isRequired: true, isConditional: false, description: null },
  { nodeKey: "positioning", sectionKey: "competitive_alternatives", sectionTitle: "Competitive Alternatives", sortOrder: 3, displayLayer: "CHAPTER" as const, isRequired: true, isConditional: false, description: null },
  { nodeKey: "positioning", sectionKey: "market_category", sectionTitle: "Market Category", sortOrder: 4, displayLayer: "CHAPTER" as const, isRequired: true, isConditional: false, description: null },
  { nodeKey: "positioning", sectionKey: "positioning_statement", sectionTitle: "Positioning Statement", sortOrder: 5, displayLayer: "CHAPTER" as const, isRequired: true, isConditional: false, description: null },
  { nodeKey: "positioning", sectionKey: "core_differentiators", sectionTitle: "Core Differentiators", sortOrder: 6, displayLayer: "CHAPTER" as const, isRequired: true, isConditional: false, description: null },
  { nodeKey: "positioning", sectionKey: "content_themes", sectionTitle: "Content Themes", sortOrder: 7, displayLayer: "CHAPTER" as const, isRequired: true, isConditional: false, description: null },
  { nodeKey: "positioning", sectionKey: "core_question", sectionTitle: "The Core Question", sortOrder: 8, displayLayer: "FULL" as const, isRequired: true, isConditional: false, description: "Frames the strategic decision" },
  { nodeKey: "positioning", sectionKey: "option_a", sectionTitle: "Option A", sortOrder: 9, displayLayer: "FULL" as const, isRequired: true, isConditional: false, description: null },
  { nodeKey: "positioning", sectionKey: "option_b", sectionTitle: "Option B", sortOrder: 10, displayLayer: "FULL" as const, isRequired: true, isConditional: false, description: null },
  { nodeKey: "positioning", sectionKey: "option_c", sectionTitle: "Option C", sortOrder: 11, displayLayer: "FULL" as const, isRequired: false, isConditional: false, description: null },
  { nodeKey: "positioning", sectionKey: "strategic_comparison", sectionTitle: "Strategic Comparison", sortOrder: 12, displayLayer: "FULL" as const, isRequired: true, isConditional: false, description: null },
  { nodeKey: "positioning", sectionKey: "recommendation", sectionTitle: "Recommendation & Decision Criteria", sortOrder: 13, displayLayer: "FULL" as const, isRequired: true, isConditional: false, description: null },

  // NODE 5: What Are We Selling (conditional node)
  { nodeKey: "what-are-we-selling", sectionKey: "service_architecture", sectionTitle: "Service Architecture", sortOrder: 1, displayLayer: "CHAPTER" as const, isRequired: true, isConditional: false, description: null },
  { nodeKey: "what-are-we-selling", sectionKey: "pricing_model", sectionTitle: "Pricing Model", sortOrder: 2, displayLayer: "CHAPTER" as const, isRequired: true, isConditional: false, description: null },
  { nodeKey: "what-are-we-selling", sectionKey: "packaging_rationale", sectionTitle: "Packaging Rationale", sortOrder: 3, displayLayer: "FULL" as const, isRequired: true, isConditional: false, description: null },
  { nodeKey: "what-are-we-selling", sectionKey: "service_descriptions", sectionTitle: "Detailed Service Descriptions", sortOrder: 4, displayLayer: "FULL" as const, isRequired: true, isConditional: false, description: null },

  // NODE 6: Messaging Playbook
  { nodeKey: "messaging-playbook", sectionKey: "one_liner", sectionTitle: "One-Liner", sortOrder: 1, displayLayer: "CHAPTER" as const, isRequired: true, isConditional: false, description: null },
  { nodeKey: "messaging-playbook", sectionKey: "positioning_statement_ref", sectionTitle: "Positioning Statement", sortOrder: 2, displayLayer: "CHAPTER" as const, isRequired: true, isConditional: false, description: "Inherited from Positioning" },
  { nodeKey: "messaging-playbook", sectionKey: "messaging_house", sectionTitle: "Messaging House", sortOrder: 3, displayLayer: "CHAPTER" as const, isRequired: true, isConditional: false, description: null },
  { nodeKey: "messaging-playbook", sectionKey: "tone_voice", sectionTitle: "Tone & Voice Guide", sortOrder: 4, displayLayer: "CHAPTER" as const, isRequired: true, isConditional: false, description: null },
  { nodeKey: "messaging-playbook", sectionKey: "one_page_summary", sectionTitle: "One-Page Messaging Summary", sortOrder: 5, displayLayer: "CHAPTER" as const, isRequired: true, isConditional: false, description: null },
  { nodeKey: "messaging-playbook", sectionKey: "funnel_language_system", sectionTitle: "Funnel Language System", sortOrder: 6, displayLayer: "FULL" as const, isRequired: true, isConditional: false, description: null },
  { nodeKey: "messaging-playbook", sectionKey: "sales_language_library", sectionTitle: "Sales Language Library", sortOrder: 7, displayLayer: "FULL" as const, isRequired: true, isConditional: false, description: null },

  // NODE 7: GTM Plan
  { nodeKey: "gtm-plan", sectionKey: "executive_overview", sectionTitle: "Executive Overview", sortOrder: 1, displayLayer: "CHAPTER" as const, isRequired: true, isConditional: false, description: null },
  { nodeKey: "gtm-plan", sectionKey: "performance_signals", sectionTitle: "Performance Signals & Exit Criteria", sortOrder: 2, displayLayer: "CHAPTER" as const, isRequired: true, isConditional: false, description: null },
  { nodeKey: "gtm-plan", sectionKey: "system_architecture", sectionTitle: "System Architecture", sortOrder: 3, displayLayer: "CHAPTER" as const, isRequired: true, isConditional: false, description: null },
  { nodeKey: "gtm-plan", sectionKey: "phase_1_activation", sectionTitle: "Phase 1 Activation Plan", sortOrder: 4, displayLayer: "FULL" as const, isRequired: true, isConditional: false, description: null },
  { nodeKey: "gtm-plan", sectionKey: "phase_2_scale", sectionTitle: "Phase 2: Scale What Works", sortOrder: 5, displayLayer: "FULL" as const, isRequired: true, isConditional: false, description: null },
  { nodeKey: "gtm-plan", sectionKey: "execution_roadmap", sectionTitle: "Execution Roadmap", sortOrder: 6, displayLayer: "FULL" as const, isRequired: true, isConditional: false, description: null },
];

// ---------------------------------------------------------------------------
// EP Section Content — for completed nodes (HTML-ready plain text for now)
// ---------------------------------------------------------------------------

const EP_SECTIONS: Record<string, Record<string, string>> = {
  "key-business-info": {
    company_overview: `<p>Executive Presence is a specialized B2B services firm that helps executives and organizations build trust, visibility, and influence through authentic thought leadership on LinkedIn. The company currently supports approximately 47 active clients across three business models: EP 1.0 (individual executive programs), CoCreate (a lower-touch hybrid), and a small but strategically important set of EP 2.0 multi-executive engagements.</p>`,
    company_goals: `<p>The goal of this engagement is to reposition Executive Presence from a partner to individual executives toward an organizational brand partner supporting the entire go-to-market function — reducing churn and improving revenue quality by shifting from one-off executives to embedded, organization-wide partnerships.</p>`,
    situation_analysis: `<p>Current positioning around "LinkedIn content for executives" has built the business to roughly $200K in MRR, but has exposed structural issues: tight margins, consistent churn, and an inconsistent pipeline. Most individual executive clients struggle to see attributable ROI, and when a CMO reprioritizes, these one-off relationships churn.</p><p>The transition from EP 1.0 to EP 2.0 represents a fundamental shift in business model — from individual service delivery to organizational partnership. This requires not just new positioning but a reimagined service architecture, pricing model, and go-to-market approach.</p>`,
    services_approach: `<p>Three current service tiers:</p><ul><li><strong>EP 1.0</strong> — Individual executive LinkedIn programs. Core offering, highest volume, but highest churn.</li><li><strong>CoCreate</strong> — Lower-touch hybrid model. Designed for scale but unclear differentiation from 1.0.</li><li><strong>EP 2.0</strong> — Multi-executive organizational engagements. Small portfolio but strategically critical — this is the future direction.</li></ul>`,
    preliminary_differentiators: `<p>Client-stated differentiators:</p><ul><li>Deep interview process that surfaces authentic executive voice</li><li>Focus on substance over volume — "we don't post to post"</li><li>LinkedIn platform specialization vs. generalist agencies</li><li>Strategic approach connecting executive visibility to business outcomes</li></ul>`,
    current_buyer_profile: `<p>Current buyers are primarily individual executives — CEOs, founders, and C-suite leaders at B2B companies ranging from growth-stage to enterprise. Most find EP through referrals or LinkedIn itself. The buying decision is typically made by the individual executive, sometimes with CMO involvement for budget approval.</p>`,
    sales_process: `<p>Sales process is primarily referral-driven with some inbound from LinkedIn presence. Key friction points:</p><ul><li>Long sales cycles for enterprise deals</li><li>Individual executives make emotional buying decisions that churn when priorities shift</li><li>No systematic qualification process — many deals close that shouldn't</li><li>Pricing conversations happen too late in the process</li></ul>`,
    named_competitors: `<p>Key competitors identified:</p><ul><li>Content agencies (ghostwriters, content mills)</li><li>PR firms with LinkedIn bolt-on services</li><li>Social selling platforms and training companies</li><li>Brand consultancies with executive visibility practices</li><li>DIY tools (AI writing assistants, scheduling platforms)</li></ul>`,
    marketing_audit: `<p>Current marketing consists primarily of the founders' own LinkedIn presence, which serves as both proof-of-concept and lead generation. Website exists but is not optimized for the EP 2.0 positioning. No systematic content marketing, email nurture, or paid acquisition. Case studies exist informally but are not packaged for sales enablement.</p>`,
  },
  "ideal-client-profile": {
    icp_overview: `<p>The ideal target client for Executive Presence 2.0 is a growth-stage B2B company where leadership credibility shapes market perception and market perception is necessary for growth. These are companies with $20M or more in annual revenue, 50 to 2,000+ employees, in industries like IT services, professional services, finance, managed services, and technology-enabled businesses.</p>`,
    firmographic_criteria: `<p>Target firmographic criteria:</p><ul><li><strong>Revenue:</strong> $20M+ annual revenue</li><li><strong>Headcount:</strong> 50–2,000+ employees</li><li><strong>Industries:</strong> IT services, professional services, finance, managed services, technology-enabled businesses</li><li><strong>Buying trigger:</strong> At or approaching an inflection point (M&amp;A, PE event, leadership transition, competitive threat)</li></ul>`,
    key_attributes: `<p>The right client has a real point of view worth amplifying and a CEO who is willing to put it to work. They are not looking for a posting service — they want a partner who will push back on weak ideas, extract what's actually worth saying, and connect it to how the rest of the business operates.</p>`,
    buyer_persona_1_summary: `<p><strong>The Platform Builder</strong> — CEOs of $100M+ companies built through acquisition who are preparing for liquidity events. They're already active on LinkedIn organically but lack systematic amplification. They will pay premium prices without negotiation if convinced of value, but they demand mutual evaluation and bi-directional feedback.</p>`,
    buyer_persona_2_summary: `<p><strong>The Scale-Up Strategist</strong> — CEOs of $20–100M companies that are post-acquisition or PE-backed. They're managing integration pressures while trying to maintain market presence through small, overwhelmed marketing teams. They operate in the $5–10K comfort zone and need upfront strategic work to prove value before committing to ongoing retainers.</p>`,
    buying_committee: `<p>Typical buying committee includes the CEO (final decision maker), CMO or VP Marketing (budget holder and internal champion), and sometimes a Chief of Staff or COO for operational alignment. The CEO must be personally willing to participate — delegation to marketing alone is a disqualifier.</p>`,
    exclusion_criteria: `<p>Do not target:</p><ul><li>Companies without a genuine inflection point (just "we should probably do LinkedIn")</li><li>CEOs unwilling to be coached or receive strategic pushback</li><li>Marketing teams that want to control messaging without executive input</li><li>Companies under $20M revenue (insufficient budget and organizational complexity)</li></ul>`,
    voc_validation_summary: `<p>Interviews confirmed that the highest-value buyers are not individual executives seeking personal brand help — they are CEOs of growth-stage and mid-market B2B companies who see executive visibility as an organizational capability, not a vanity project.</p><p>The preliminary ICP from KBI was directionally correct but underweighted two critical factors: the role of inflection points as buying triggers, and the importance of CEO willingness to receive strategic pushback as a qualifying criterion.</p>`,
    voc_key_findings: `<p><strong>Theme 1: Inflection Points Drive Urgency</strong></p><p>Companies actively buy executive visibility services when something forces them to care — fundraising, acquisition integration, competitive threat, or leadership transition. Without an inflection point, executive LinkedIn is "nice to have" and churns.</p><p><strong>Theme 2: CEO Coachability is the #1 Success Predictor</strong></p><p>The executives who get the most value are those who treat EP as a strategic partner, not a content vendor.</p><p><strong>Theme 3: Organizational Buy-In Matters More Than Individual Enthusiasm</strong></p><p>When only one executive is engaged, the program is fragile. When the organization sees executive visibility as a GTM function, retention and expansion are dramatically higher.</p>`,
    voc_methodology: `<p>Conducted 12 semi-structured interviews across three cohorts: current EP 1.0 clients (5), churned clients (4), and prospects who evaluated but didn't buy (3). Interviews lasted 45–60 minutes and covered buying motivations, decision criteria, perceived value, and reasons for churn or non-purchase.</p>`,
  },
  "competitive-analysis": {
    market_context: `<p>The executive visibility market is expanding rapidly — the ghostwriting industry alone has grown from $1.55B in 2021 to $2.05B in 2025. This growth has lowered the barrier to producing polished content without solving the deeper challenge: building real executive credibility that connects back to business outcomes.</p><p>The market is bifurcating: commoditized content production on one end, strategic advisory on the other. The middle — "good content at fair prices" — is being squeezed by AI tools and offshore writers.</p>`,
    competitive_landscape: `<p>The competitive landscape is fragmented across five categories:</p><ol><li><strong>Content agencies and ghostwriters</strong> — Volume-focused, primarily individual service</li><li><strong>PR firms</strong> — LinkedIn as one channel among many, not platform-native</li><li><strong>Social selling platforms</strong> — Training and tools, not done-for-you</li><li><strong>Brand consultancies</strong> — Strategic but rarely execute on LinkedIn</li><li><strong>DIY tools</strong> — AI writing assistants, scheduling, analytics</li></ol>`,
    differentiation_assessment: `<p>EP's claimed differentiators tested against competitive reality:</p><ul><li><strong>Deep interview process:</strong> Validated — no competitor invests comparable time in executive voice extraction. This is genuinely defensible.</li><li><strong>Substance over volume:</strong> Partially validated — several competitors make similar claims, but EP's diagnostic-first model backs it up.</li><li><strong>LinkedIn specialization:</strong> Double-edged — provides depth but limits perceived scope for organizational buyers.</li><li><strong>Business outcome focus:</strong> Aspirational — EP doesn't yet have the measurement infrastructure to prove this consistently.</li></ul>`,
    competitive_whitespace: `<p>Clear whitespace exists at the intersection of three capabilities no competitor currently combines:</p><ol><li><strong>Organizational coordination</strong> — managing multiple executives' LinkedIn presence as a unified system</li><li><strong>Intelligence extraction</strong> — turning LinkedIn engagement data into GTM insights</li><li><strong>Strategic advisory</strong> — pushing back on executives' instincts with data-informed recommendations</li></ol><p>The gap is not in any single capability but in their combination.</p>`,
    competitor_deep_dives: `<p><strong>Ghostwrite.ai</strong> — AI-first content generation. Fast, cheap, no strategic layer. Targets individuals.</p><p><strong>The Thought Leadership Agency</strong> — UK-based, strong strategic positioning but limited LinkedIn execution. Serves enterprises.</p><p><strong>Social Factor</strong> — LinkedIn-focused agency, closest direct competitor. Strong execution but lacks EP's diagnostic depth.</p><p><strong>Influence &amp; Co</strong> — Content marketing agency with executive ghostwriting. Broader scope dilutes LinkedIn focus.</p><p><strong>Internal Marketing Teams</strong> — The most common "competitor." LinkedIn added to existing responsibilities with no dedicated strategy.</p>`,
    pricing_benchmarks: `<p>Market pricing ranges:</p><ul><li>Individual ghostwriting: $1,500–5,000/month</li><li>Executive LinkedIn management: $3,000–8,000/month</li><li>Organizational programs (rare): $15,000–40,000/month</li><li>PR firms with LinkedIn: $8,000–25,000/month (LinkedIn is 10–20% of scope)</li></ul><p>EP's current pricing ($3,000–7,000 for EP 1.0) is mid-market for individual service. EP 2.0 organizational pricing has no established benchmark — this is an advantage.</p>`,
  },
  "positioning": {
    target_client: `<p>B2B companies with $20M+ annual revenue, 50–2,000+ employees, at or approaching a business inflection point. Industries where leadership credibility shapes market perception: IT services, professional services, finance, managed services, and technology-enabled businesses.</p>`,
    problem_solved: `<p>When companies hit inflection points — acquisitions, PE events, competitive threats, leadership transitions — their executives' market presence becomes a strategic asset or a strategic liability. Most companies have no systematic way to turn executive visibility into business intelligence and market advantage.</p>`,
    competitive_alternatives: `<p>When companies don't work with Executive Presence, they typically:</p><ul><li>Hire a PR firm that folds LinkedIn into a broader engagement (losing platform focus)</li><li>Assign it to internal marketing (no dedicated strategy)</li><li>Use AI tools + DIY effort (volume without substance)</li><li>Hire a ghostwriter (content without strategy)</li><li>Do nothing and hope the market figures out who they are</li></ul>`,
    market_category: `<p>LinkedIn-native executive intelligence partner. Not a content agency. Not a ghostwriting service. Not a PR firm. A strategic partner that turns what executives say on LinkedIn into intelligence that informs go-to-market decisions.</p>`,
    positioning_statement: `<p>For growth-stage and mid-market B2B companies at business inflection points, Executive Presence is the LinkedIn-native intelligence partner that turns executive visibility into organizational advantage — providing the diagnostic depth, strategic advisory, and cross-executive coordination that no content agency, PR firm, or DIY approach can deliver.</p>`,
    core_differentiators: `<ol><li><strong>The Diagnostic</strong> — Every engagement begins with deep-dive interviews that surface what the executive actually believes and confirm substance exists before committing to amplify it</li><li><strong>The Market Intelligence Loop</strong> — EP tracks what resonates on LinkedIn and translates signal into GTM intelligence</li><li><strong>Organizational Coordination</strong> — Not individual executives posting in isolation, but a unified leadership voice architecture</li></ol>`,
    content_themes: `<ol><li>The Executive Visibility Gap — why most B2B companies have one and what it costs them</li><li>Inflection Points as Visibility Moments — the connection between business events and market presence</li><li>Intelligence Over Content — why what resonates matters more than what's published</li><li>The Coordinated Voice — why organizational visibility beats individual posting</li></ol>`,
    core_question: `<p>The core strategic question: <strong>How does Executive Presence transition from EP 1.0 (individual executive LinkedIn service) to EP 2.0 (organizational visibility partner) without getting trapped back in the individual service model that created the churn problem?</strong></p><p>The whitespace identified in Competitive Analysis — the intersection of organizational coordination, intelligence extraction, and strategic advisory — provides the territory. The question is which entry strategy captures it most effectively.</p>`,
    strategic_comparison: `<table><thead><tr><th>Dimension</th><th>Option A: Catalytic Moments</th><th>Option B: Communication Foundation</th><th>Option C: CEO-First Premium</th></tr></thead><tbody><tr><td>Entry point</td><td>Business inflection events</td><td>Full communication framework</td><td>CEO-only at premium price</td></tr><tr><td>Risk</td><td>Timing-dependent pipeline</td><td>Scope creep beyond LinkedIn</td><td>Reverts to individual model</td></tr><tr><td>Pricing</td><td>Event-triggered premium</td><td>Retainer-based</td><td>High individual, expand later</td></tr><tr><td>Competitive defense</td><td>Unique trigger-based positioning</td><td>Broad but harder to defend</td><td>Premium brand, thin moat</td></tr></tbody></table>`,
    recommendation: `<p><strong>OTM recommends Option A: Catalytic Moments</strong> as the primary entry strategy.</p><p>Option A creates the strongest structural defense against reverting to EP 1.0 because it qualifies on organizational need (the inflection point) rather than individual desire. It naturally leads to multi-executive coordination because the events that trigger purchase inherently involve multiple stakeholders.</p>`,
    option_a: `<p><strong>Option A: Catalytic Moments — The LinkedIn-Native Intelligence Partner</strong></p><p><strong>Who &amp; When:</strong> B2B companies at inflection points — post-acquisition, PE-backed growth, leadership transitions, competitive threats. $20M+ revenue, CEO willing to be coached.</p><p><strong>The Bet:</strong> Companies buy executive visibility when something forces them to care. If EP can be the partner they call at that moment, it enters at the organizational level by default.</p><p><strong>Business Model:</strong> Diagnostic engagement ($15–25K) → ongoing organizational program ($8–15K/month per executive, 3+ executive minimum).</p>`,
    option_b: `<p><strong>Option B: Communication Foundation Framework</strong></p><p><strong>Who &amp; When:</strong> Same ICP but broader trigger — any company that recognizes communication fragmentation as a growth bottleneck.</p><p><strong>The Bet:</strong> EP becomes the communication infrastructure partner, extending beyond LinkedIn into internal communications, investor relations, and sales enablement.</p><p><strong>Risk:</strong> Requires significant capability expansion. Risk of competing with established communication consultancies.</p>`,
  },
};

// Backward-compatible exec summaries — generated from CHAPTER sections
function buildExecSummary(nodeKey: string): string | null {
  const sections = EP_SECTIONS[nodeKey];
  if (!sections) return null;
  const templates = NODE_TEMPLATES.filter(
    (t) => t.nodeKey === nodeKey && t.displayLayer === "CHAPTER"
  );
  const parts: string[] = [];
  for (const t of templates) {
    const content = sections[t.sectionKey];
    if (content) {
      // Strip HTML tags for the plain-text execSummary field
      const text = content.replace(/<[^>]+>/g, "").trim();
      parts.push(`## ${t.sectionTitle}\n\n${text}`);
    }
  }
  return parts.length > 0 ? parts.join("\n\n") : null;
}

// ---------------------------------------------------------------------------
// Main seed function
// ---------------------------------------------------------------------------

async function main() {
  console.log("Seeding database (7-node cascade)...");

  // Clear existing data
  await prisma.cascadeFlag.deleteMany();
  await prisma.nodeSection.deleteMany();
  await prisma.nodeVersion.deleteMany();
  await prisma.nodeDependency.deleteMany();
  await prisma.node.deleteMany();
  await prisma.nodeTemplate.deleteMany();
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
        lockedIn: false,
      },
    });
    nodeMap.set(config.nodeKey, node.id);

    // Create version with sections for nodes that have content
    const sectionContent = EP_SECTIONS[config.nodeKey];
    const execSummary = buildExecSummary(config.nodeKey);
    if (sectionContent || execSummary) {
      const version = await prisma.nodeVersion.create({
        data: {
          nodeId: node.id,
          versionNumber: 1,
          execSummary: execSummary,
          isCurrent: true,
          isBaseline: true,
        },
      });

      // Create sections
      if (sectionContent) {
        const templates = NODE_TEMPLATES.filter((t) => t.nodeKey === config.nodeKey);
        for (const template of templates) {
          const content = sectionContent[template.sectionKey];
          if (content) {
            await prisma.nodeSection.create({
              data: {
                nodeVersionId: version.id,
                sectionKey: template.sectionKey,
                sectionTitle: template.sectionTitle,
                content,
                sortOrder: template.sortOrder,
                displayLayer: template.displayLayer,
              },
            });
          }
        }
      }
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

  // Seed node templates
  for (const t of NODE_TEMPLATES) {
    await prisma.nodeTemplate.create({ data: t });
  }

  console.log("Seeded:");
  console.log(`  - 2 users (admin@meetotm.com / admin123, client@example.com / client123)`);
  console.log(`  - 1 engagement (Executive Presence)`);
  console.log(`  - ${NODE_CONFIGS.length} nodes with dependencies`);
  console.log(`  - ${NODE_TEMPLATES.length} node templates`);
  console.log(`  - ${Object.keys(EP_SECTIONS).length} nodes with section content`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
