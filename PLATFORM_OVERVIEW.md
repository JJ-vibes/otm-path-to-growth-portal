# OTM Client Portal — Platform Overview

> Paste this into a new chat to brief it on the platform before planning the next round of updates. Covers what exists, why, the architecture, and the open questions that should shape any roadmap.

**Live:** https://otm-path-to-growth-portal-production.up.railway.app
**Repo:** https://github.com/oldtownmedia/otm-path-to-growth-portal
**Project root on disk:** `/Users/dee/GitHub/otm-path-to-growth-portal`

---

## 1. What this is

A client portal for OTM (meetotm.com — a strategy/marketing consultancy). Clients log in and track their **Stage 1 strategy engagement** through OTM's "Path to Growth" methodology.

The portal IS the digital Strategy Book — clients don't get a deliverable PDF and call it done; they navigate a living dependency cascade of 7 strategic deliverables, each rendered as structured sections on the web (with optional PDF export of the full book).

**Two users:**
- **Admin** (OTM staff) — creates engagements, uploads .docx deliverables, parses them into structured sections, publishes nodes, resolves cascade flags.
- **Client** — sees their engagement homepage, navigates the cascade, reads CHAPTER (client-facing) and FULL (expandable detail) sections, downloads the strategy book PDF.

---

## 2. The 7-node cascade (Stage 1)

The engagement is modeled as a directed dependency graph. Each node = one strategic deliverable.

```
1. Key Business Information     (root, no deps; starts ACTIVE)
2. Ideal Client Profile         deps: KBI                       [VoC sections conditional]
3. Competitive & Market Analysis deps: KBI
4. Positioning                  deps: KBI, ICP, Comp           [GATE node]
5. What Are We Selling          deps: Positioning, ICP         [conditional node]
6. Messaging Playbook           deps: Positioning
7. GTM Plan                     deps: Playbook, What Are We Selling
```

**Node statuses:** `locked` → `active` → `complete` → (`flagged` or `cascading` after upstream change)

**Gate node:** Positioning. Revising it flags everything downstream.

**Cascade engine** (`src/lib/cascade.ts`): when a completed node is revised and marked cascade-triggering, all direct dependents that are COMPLETE → FLAGGED, dependents that are LOCKED → CASCADING, recurse downstream. Admin resolves each flag.

**Conditional pieces:**
- *Conditional node* — "What Are We Selling" may not appear in every engagement.
- *Conditional sections* — ICP's Voice of Customer sections only appear if the engagement includes primary research.

---

## 3. Tech stack

| Layer | Tech | Notes |
|-------|------|-------|
| Framework | Next.js 16.2.1 (App Router) | **Uses `proxy.ts` not `middleware.ts`** — Next 16 breaking change |
| Runtime | React 19.2.4 | |
| Language | TypeScript (strict) | |
| Auth | NextAuth v4 (JWT, CredentialsProvider) | Email + password, no SSO |
| ORM | Prisma 7 + `@prisma/adapter-pg` | **Driver adapter pattern, no `datasourceUrl`** |
| DB | PostgreSQL | Railway-hosted |
| Styling | Tailwind v4 + custom OTM brand classes | `text-otm-navy`, `bg-otm-light`, etc. |
| Doc parsing | `mammoth` (.docx → HTML) | Splits at H1 to match templates |
| HTML safety | `sanitize-html` | Applied before `dangerouslySetInnerHTML` |
| PDF gen | Puppeteer | Branded cover, TOC, CHAPTER sections |
| AI | `@anthropic-ai/sdk` (claude-sonnet) | Currently UNUSED — see §6 |
| Hosting | Railway | App + Postgres as separate services |

**Critical Next.js 16 gotchas (don't trust training data):**
- `src/proxy.ts` exports `proxy()` not `middleware()`. Codemod: `npx @next/codemod@latest middleware-to-proxy .`
- Prisma 7 client must be instantiated via `new PrismaPg({ connectionString })` adapter; you cannot pass `datasourceUrl` to `PrismaClient()`.
- Prisma client is generated to `src/generated/prisma/client.ts` (no `index.ts`, gitignored, regenerated on `postinstall`). Import from `@/generated/prisma/client`.
- `pdf-parse` requires `test/data/05-versions-space.pdf` on import — the upload route lazy-imports it (`await import("pdf-parse")`) to avoid this.
- `AGENTS.md` is checked in and reminds future contributors to read `node_modules/next/dist/docs/` before assuming Next.js APIs.

---

## 4. Data model

```prisma
User              id, email (unique), name?, passwordHash, role: ADMIN|CLIENT
Engagement        id, clientName, lifecycleStage (default "Traction")
EngagementUser    userId, engagementId  // many-to-many join
Node              id, engagementId, nodeKey, displayName, sortOrder,
                  isGate, isConditional, status
NodeDependency    nodeId, dependsOnNodeId
NodeTemplate      nodeId, sectionKey, displayName, sortOrder, kind: CHAPTER|FULL,
                  isConditional, defaultEnabled
NodeSection       nodeVersionId, templateId, contentHtml, isEnabled, sortOrder
NodeVersion       id, nodeId, versionNumber, execSummary, documentUrl?,
                  changeType?, changeNote?, isCurrent, isBaseline,
                  cascadeTriggering, createdAt
CascadeFlag       flaggedNodeId, sourceNodeId, flagType: needs_review|cascading,
                  resolved, resolvedAt?
```

Content is stored as **HTML** (from mammoth), rendered through `SectionHtml` with `sanitize-html` and the `.prose-otm` class for OTM brand styling.

---

## 5. Routes

### Pages
- `/login` — public, credentials sign-in
- `/` — redirects: admin → `/admin`, client → `/portal`
- `/portal` — client homepage (lifecycle stage card + cascade progress)
- `/portal/strategy` — left nav of 7 nodes + content pane (CHAPTER + FULL expanders)
- `/admin` — list of all engagements
- `/admin/engagements/new` — create engagement form
- `/admin/engagements/[id]` — manage nodes for one engagement
- `/admin/nodes/[nodeKey]` — upload doc, edit sections, publish

### API
- `GET /api/engagement` — session-scoped engagement
- `GET /api/nodes/[nodeKey]/details` — single node + sections
- `POST /api/nodes/[nodeKey]/publish` — save sections, trigger cascade
- `POST /api/nodes/[nodeKey]/resolve-flag` — resolve a cascade flag
- `POST /api/nodes/[nodeKey]/parse-upload` — auto-parse uploaded .docx into template sections
- `GET /api/templates/[nodeKey]` — node template sections (for admin editor)
- `GET /api/strategy-book` — generate branded PDF (CHAPTER sections only)
- `POST /api/upload` — upload doc, extract text + HTML, save file
- `GET /api/documents/[filename]` — authenticated file download
- `POST /api/engagements` — create engagement (admin)
- `*/api/auth/[...nextauth]` — NextAuth endpoints

### Auth model
- `proxy.ts` protects everything except `/login` and `/api/auth/*`
- `/admin/*` requires `role: "ADMIN"`
- API routes call `getSessionUser()` / `getUserEngagementId()` / `canAccessEngagement()` from `src/lib/session.ts`

---

## 6. What's currently built (sessions 1–10)

1. Portal UI — homepage, cascade nav, content pane, all 5 node states
2. Admin — doc upload, AI exec summary generation (since removed), publish flow
3. Cascade flag engine — propagation works
4. Strategy book PDF — branded cover, TOC, chapters via Puppeteer
5. Prisma + PostgreSQL, NextAuth, client isolation, multi-engagement admin, Railway deploy
6. Schema + seed for structured sections (NodeTemplate, NodeSection)
7. Admin section editor — auto-parse .docx upload, rich HTML preview, conditional VoC toggle
8. Client display — `SectionHtml`, `prose-otm` CSS, CHAPTER/FULL split, `SectionExpander`
9. Strategy book PDF refactored for HTML sections (table/list CSS)
10. Cleanup — removed AI extraction, `SummaryContent`, `parse-sections`; mobile responsive pass

**Recent commits (most recent → older):**
- `70f3e5c` Restructure portal from AI summaries to structured section display
- `700b895` Add production-safe template seeder and doc-to-section parser
- `672801f` Auto-populate section editors from uploaded documents
- `7ea0a32` Replace AI-generated summaries with structured section display system

**Important shift:** the original design generated AI exec summaries from uploaded .docx files. That was ripped out and replaced with structured section parsing — admins now author/upload structured docs that get split at H1 into named sections. AI is no longer in the pipeline. The `@anthropic-ai/sdk` dep is still in `package.json` but unused.

---

## 7. Known gaps & explicit "future work" (from CLAUDE.md)

- ClickUp integration for live status updates
- Email notifications when deliverables are published
- Client commenting / feedback on deliverables
- KBI baseline + milestone version-history UI (schema supports `isBaseline` and version numbering, no UI)
- Conditional-node toggling — admin marking "What Are We Selling" as not applicable
- Mobile-responsive layout polish (responsive pass done, deeper polish open)
- n8n workflow automation
- Custom domain + SSL
- Invite-client flow — create User + link to Engagement from admin (currently manual / seed)

---

## 8. Things to weigh when planning the next round

These aren't features, they're constraints and questions any planner should hold in mind:

**Product-level:**
- Stage 1 is fully modeled. **Stages 2+** of OTM's Path to Growth aren't represented at all — is the next push deeper Stage 1 polish, or starting Stage 2?
- The portal is one-way today: OTM publishes, client reads. Two-way (comments, approvals, requests) is the obvious next step but adds notification + permission surface area.
- KBI is the only "living" doc in concept (baseline + milestones), but there's no UI for that yet. Worth deciding before building elsewhere.
- The cascade engine flags but doesn't *guide* — there's no admin "what changed and why" diff or a templated re-review workflow.

**Architectural:**
- All content is HTML from mammoth. Editing in-portal means either (a) building a rich-text editor surface or (b) keeping .docx as source-of-truth and re-parsing. Pick before adding section authoring.
- NextAuth v4 with credentials only. Any "invite a client" flow needs to address password setup, magic links, or SSO. v5 migration may be a prerequisite.
- File storage today is local filesystem on Railway (uploads). That's fine for one app instance — won't survive horizontal scale or migrating off Railway. S3 / R2 should be on the table before anything heavy.
- Prisma 7 + Next.js 16 are very new. Anything that pulls in adjacent ecosystem (auth providers, file uploaders, editor libs) needs compatibility verified, not assumed.
- The AI SDK is dead code right now. Either re-engage it for a specific feature (drafting, summarizing client comments, change-impact analysis) or remove the dep.

**Operational:**
- Single Railway region, single Postgres, no backups documented. Worth confirming before the portal holds anything client-critical.
- No telemetry / observability. Any post-launch iteration is flying blind on actual usage.
- No automated tests. Cascade logic in `src/lib/cascade.ts` is the highest-leverage thing to test first.

**Brand:**
- OTM brand colors and fonts are first-class in the codebase (`globals.css`, Outfit/Lato via `next/font`). Anything new must respect this — gold is *never* a text color.

---

## 9. Key files to read first

```
CLAUDE.md                         — project instructions, full reference
AGENTS.md                         — Next.js 16 warning
BLUEPRINT.md                      — older detailed snapshot (some drift since)
prisma/schema.prisma              — data model
prisma/seed.ts                    — seeds the EP engagement: 7 nodes, 63 templates
src/lib/cascade.ts                — flag propagation engine
src/lib/data-store.ts             — all DB queries
src/lib/doc-parser.ts             — .docx → HTML → split at H1 → match templates
src/lib/strategy-book-template.ts — Puppeteer PDF template
src/proxy.ts                      — Next 16 route protection
src/app/admin/nodes/[nodeKey]/    — admin node editor
src/app/portal/strategy/          — client cascade view
src/components/CascadeNav.tsx     — left nav, progress, PDF download
src/components/CompleteNodeView.tsx — CHAPTER + FULL section rendering
```

---

## 10. Test credentials (dev)

- Admin: `admin@meetotm.com` / `admin123`
- Client: `client@example.com` / `client123`

(Generic placeholders only — never use real client emails in seed/test data.)
