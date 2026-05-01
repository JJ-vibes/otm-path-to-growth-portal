@AGENTS.md

# OTM Client Portal — Technical Reference

## What This Is

A client portal for OTM (meetotm.com) where clients log in and track their Stage 1 strategy engagement. The portal IS the digital Strategy Book — a navigable surface built on a 7-node document dependency cascade. Each deliverable is auto-parsed from structured .docx templates into rich HTML sections (CHAPTER for client-facing strategic read, FULL for expandable detail).

**Live URL:** https://otm-path-to-growth-portal-production.up.railway.app
**Repo:** https://github.com/oldtownmedia/otm-path-to-growth-portal

---

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | Next.js 16.2.1 (App Router) | Uses `proxy.ts` not `middleware.ts` (Next.js 16 breaking change) |
| Language | TypeScript | Strict mode |
| Styling | Tailwind CSS v4 | OTM brand colors defined as custom classes |
| Auth | NextAuth v4 | JWT strategy, CredentialsProvider |
| Database | PostgreSQL | Hosted on Railway |
| ORM | Prisma 7 | Uses `@prisma/adapter-pg` driver adapter pattern (not `datasourceUrl`) |
| Doc parsing | mammoth (docx) | Converts .docx → HTML, splits at H1 for section matching |
| HTML sanitize | sanitize-html | Safe rendering of mammoth HTML output |
| PDF gen | Puppeteer | Strategy book PDF with branded cover/TOC |
| Hosting | Railway | App + Postgres as separate services |
| Fonts | Outfit (headings), Lato (body) | via next/font/google |

---

## Architecture

### Route Structure

```
/login                  → Login page (public)
/                       → Redirects: admin → /admin, client → /portal
/portal                 → Client homepage (Growth Lifecycle + progress)
/portal/strategy        → Strategy cascade view (left nav + content pane)
/admin                  → Admin dashboard (lists all engagements)
/admin/engagements/new  → Create new engagement form
/admin/engagements/[id] → Manage nodes for a specific engagement
/admin/nodes/[nodeKey]  → Upload docs, generate AI summaries, publish
```

### API Routes

```
GET  /api/engagement                         → Client's engagement data (session-scoped)
GET  /api/nodes/[nodeKey]/details            → Single node + active flag + sections
POST /api/nodes/[nodeKey]/publish            → Save sections, trigger cascade
POST /api/nodes/[nodeKey]/resolve-flag       → Resolve a cascade flag
POST /api/nodes/[nodeKey]/parse-upload       → Auto-parse .docx against node templates
GET  /api/templates/[nodeKey]                → Node template sections for admin editor
GET  /api/strategy-book                      → Generate branded PDF (CHAPTER sections)
POST /api/upload                             → Upload doc, extract text + HTML, save file
GET  /api/documents/[filename]               → Authenticated file download
POST /api/engagements                        → Create new engagement (admin, 7 nodes)
*/   /api/auth/[...nextauth]                 → NextAuth endpoints
```

### Auth & Authorization

- **proxy.ts** (Next.js 16 middleware) protects all routes except `/login` and `/api/auth`
- Admin routes (`/admin/*`) require `role: "ADMIN"`
- Client routes use session to determine which engagement to show
- API routes check session via `getSessionUser()` and `getUserEngagementId()`
- `src/lib/session.ts` has helpers: `getSessionUser()`, `getUserEngagementId()`, `canAccessEngagement()`

### Database Schema (Prisma)

```
User              → id, email, name, passwordHash, role (ADMIN|CLIENT)
Engagement        → id, clientName, lifecycleStage
EngagementUser    → links User ↔ Engagement (many-to-many)
Node              → id, engagementId, nodeKey, displayName, sortOrder, status, isGate, isConditional
NodeDependency    → nodeId depends on dependsOnNodeId
NodeVersion       → id, nodeId, versionNumber, execSummary, documentUrl, isCurrent
CascadeFlag       → id, flaggedNodeId, sourceNodeId, flagType, resolved
```

**Node statuses:** `locked`, `active`, `complete`, `flagged`, `cascading`

### The 7-Node Cascade (Stage 1)

```
1. Key Business Information     → (no deps, starts "active")
2. Ideal Client Profile         → KBI                    [VoC sections conditional]
3. Competitive & Market Analysis → KBI
4. Positioning                  → KBI, ICP, Comp         [GATE — locks all downstream]
5. What Are We Selling          → Positioning, ICP       [conditional node]
6. Messaging Playbook           → Positioning
7. GTM Plan                     → Playbook, What Are We Selling
```

**Gate node:** Positioning. When revised, everything downstream gets flagged.
**Conditional node:** What Are We Selling may not appear in every engagement.
**Conditional sections:** ICP's Voice of Customer sections toggled on when engagement includes primary research.

### Cascade Flag Logic

When a completed node is revised and marked cascade-triggering:
1. All direct dependents that are COMPLETE → set to FLAGGED
2. Dependents that are LOCKED → set to CASCADING
3. Recurse downstream
4. Admin resolves flags by reviewing/updating each flagged node
5. Logic lives in `src/lib/cascade.ts`

---

## Key Files

```
src/lib/prisma.ts               → Prisma client singleton (PrismaPg adapter)
src/lib/data-store.ts           → All DB queries (getEngagementFresh, updateNode, resolveFlag, etc.)
src/lib/cascade.ts              → Cascade flag propagation engine
src/lib/doc-parser.ts           → Auto-parse .docx: mammoth → HTML → split at H1 → match to templates
src/lib/auth.ts                 → NextAuth config (CredentialsProvider, JWT callbacks)
src/lib/session.ts              → Session helpers (getSessionUser, getUserEngagementId)
src/lib/strategy-book-template.ts → PDF HTML template for Puppeteer (renders CHAPTER sections)
src/data/engagement.ts          → TypeScript types (CascadeNode, Engagement, NodeSectionData, etc.)
src/proxy.ts                    → Next.js 16 route protection (was middleware.ts)
src/components/Providers.tsx    → SessionProvider wrapper
src/components/TopBar.tsx       → Header with sign out, conditional admin link
src/components/CascadeNav.tsx   → Left nav with 7 nodes, chapter counts, progress bar, PDF download
src/components/NodeContent.tsx  → Right pane content based on node status
src/components/SectionHtml.tsx  → Renders sanitized HTML content with OTM prose styling
src/components/SectionExpander.tsx → Expandable FULL section rows
src/components/InheritedBadge.tsx → "Based on [source]" badge for inherited sections
src/components/CompleteNodeView.tsx → Completed node: CHAPTER sections + FULL expanders
src/components/ActiveNodeView.tsx → Active node with section progress indicator
src/components/CascadeBanner.tsx → Amber banner when cascade flags are active
src/components/DevToggle.tsx    → Dev-only widget for testing node status changes
src/types/next-auth.d.ts       → Type augmentation for session (id, role)
prisma/schema.prisma            → Database schema (Node, NodeTemplate, NodeSection, NodeVersion, etc.)
prisma/seed.ts                  → Seeds EP engagement: 7 nodes, 63 templates, HTML section content
prisma.config.ts                → Prisma config (datasource URL, seed command)
next.config.ts                  → NEXTAUTH_URL and SECRET fallbacks for Railway
nixpacks.toml                   → Railway build config (npm install instead of npm ci)
.npmrc                          → legacy-peer-deps for compatibility
```

---

## OTM Brand

| Element | Value | Usage |
|---------|-------|-------|
| Navy | `#023a67` | Headlines, primary text |
| Teal | `#259494` | Accent, buttons, links, active/complete states |
| Gold | `#e9aa22` | Highlights, small pops (NEVER as text color) |
| Aqua | `#37adbf` | Secondary accent |
| Dark Gray | `#4a4a4a` | Body text |
| Lt Gray | `#f7f7f7` | Primary background |
| Headline font | Outfit | Google Fonts, weights 400/600/700 |
| Body font | Lato | Google Fonts, weights 400/700 |

Tailwind custom classes: `text-otm-navy`, `text-otm-teal`, `text-otm-gray`, `bg-otm-light`, etc. Defined in `globals.css`.

---

## Development Setup

### Prerequisites
- Node 18+
- Local PostgreSQL (or use `npx prisma dev` for Prisma's built-in local Postgres)

### First-time setup
```bash
npm install
# Start local Postgres (in a separate terminal):
npx prisma dev --non-interactive
# Push schema and seed:
npx prisma db push
npx prisma db seed
# Start dev server:
npm run dev
```

### Environment Variables (.env.local)
```
ANTHROPIC_API_KEY=sk-ant-...
DIRECT_DATABASE_URL=postgres://postgres:postgres@localhost:51214/template1?sslmode=disable
DATABASE_URL=prisma+postgres://localhost:51213/...
NEXTAUTH_SECRET=dev-secret-change-in-production
NEXTAUTH_URL=http://localhost:3000
```

### Test Credentials
- **Admin:** admin@meetotm.com / admin123
- **Client:** client@example.com / client123

---

## Railway Deployment

### Services
1. **PostgreSQL** — Railway-managed Postgres
2. **App** — Next.js app connected to GitHub repo (auto-deploys on push)

### App Service Variables (required)
```
DATABASE_URL=postgresql://...@postgres.railway.internal:5432/railway
DIRECT_DATABASE_URL=postgresql://...@postgres.railway.internal:5432/railway
NEXTAUTH_SECRET=<random-secret>
NEXTAUTH_URL=https://otm-path-to-growth-portal-production.up.railway.app
ANTHROPIC_API_KEY=sk-ant-...
```

Both `DATABASE_URL` and `DIRECT_DATABASE_URL` use the **internal** Postgres URL (`postgres.railway.internal`). The app connects internally within Railway's network.

### Build Process
- `nixpacks.toml` overrides Railway to use `npm install` (not `npm ci`)
- `postinstall` runs `prisma generate`
- `build` runs `prisma generate && next build`
- NEXTAUTH_URL and SECRET have fallbacks in `next.config.ts` for Railway compatibility

### Pushing Schema Changes to Production

Public networking is left enabled on the Postgres service. The public URL is stored in `.env.railway` (gitignored) on the dev machine. Schema changes deploy in one command:

```bash
npm run db:push:prod
```

Under the hood: `dotenv-cli` loads `.env.railway` and runs `prisma db push`. To re-seed (rare):

```bash
npx dotenv -e .env.railway -- prisma db seed
```

If you ever rotate the Postgres password, regenerate `.env.railway` with the new public URL.

---

## What's Built (Sessions 1-10)

| Session | What | Status |
|---------|------|--------|
| 1 | Portal UI — homepage, cascade nav, content pane, all 5 node states | Done |
| 2 | Admin — doc upload, Claude API exec summary generation, publish flow | Done |
| 3 | Cascade flag engine — upstream changes flag downstream nodes | Done |
| 4 | Strategy book PDF — branded cover, TOC, chapters via Puppeteer | Done |
| 5 | Prisma + PostgreSQL, NextAuth login, client isolation, multi-engagement admin, Railway deploy | Done |
| 6 | Schema + seed for structured sections: NodeTemplate, NodeSection, 7-node cascade | Done |
| 7 | Admin section editor: auto-parse .docx upload, rich HTML preview, conditional VoC toggle | Done |
| 8 | Client display: SectionHtml renderer, prose-otm CSS, CHAPTER/FULL split, section expanders | Done |
| 9 | Strategy book PDF refactored for HTML sections, table/list CSS | Done |
| 10 | Cleanup: removed AI extraction, SummaryContent, parse-sections; mobile responsive pass | Done |

## Future Work (not yet built)

- ClickUp integration for live status updates
- Email notifications when deliverables are published
- Client commenting/feedback on deliverables
- KBI baseline + milestone version history UI
- Conditional node toggling (mark as "not applicable")
- Mobile-responsive layout
- n8n workflow automation
- Custom domain + SSL
- Invite client flow (create user + link to engagement from admin)

---

## Important Patterns & Gotchas

1. **Next.js 16 uses `proxy.ts` not `middleware.ts`** — the function export is `proxy()` not `middleware()`. The codemod is `npx @next/codemod@latest middleware-to-proxy .` See `src/proxy.ts`.

2. **Prisma 7 requires driver adapters** — you cannot use `datasourceUrl` in `new PrismaClient()`. Must use `new PrismaPg({ connectionString })` adapter. See `src/lib/prisma.ts`.

3. **Prisma client generated to `src/generated/prisma/client.ts`** — there is no `index.ts`. Import from `@/generated/prisma/client` in app code. The seed script uses the relative path `../src/generated/prisma/client`.

4. **`src/generated/prisma/` is gitignored** — it's regenerated on `npm install` (postinstall hook) and during `npm run build`. Never commit it.

5. **pdf-parse requires `test/data/05-versions-space.pdf`** — it tries to load a test file on import. The upload route lazy-imports it with `await import("pdf-parse")` to avoid this.

6. **Data store is fully async** — all functions in `src/lib/data-store.ts` return Promises. Server components must be `async` and `await` calls. The old synchronous `getEngagement()` from `src/data/engagement.ts` is no longer used.

7. **Content is stored as HTML** from mammoth .docx conversion. The `SectionHtml` component renders it with `dangerouslySetInnerHTML` after sanitization via `sanitize-html`. OTM brand styling is applied via the `.prose-otm` CSS class in `globals.css`.

8. **Railway env vars must be on the app service, not the Postgres service** — Railway auto-creates variables on the Postgres service, but the app service needs its own copies. Variables set on the Postgres service are NOT automatically available to the app.

9. **NEXTAUTH_SECRET and NEXTAUTH_URL have hardcoded fallbacks** in `next.config.ts` and `src/lib/auth.ts` because Railway's runtime env var injection was inconsistent during deployment. The env vars should still be set properly, but the fallbacks prevent crashes.

10. **Creating a new engagement auto-generates all 7 Stage 1 nodes** with the correct dependency graph and sets KBI to `active`. See `POST /api/engagements`.
