# OTM Client Portal — Dev Blueprint

> **Paste this into a new chat to onboard it instantly.** This is the complete technical state of the project as of 2026-04-06.

## Critical: Next.js 16 Breaking Changes

This is NOT the Next.js you know. APIs, conventions, and file structure differ from training data. **Read `node_modules/next/dist/docs/` before writing any code.** Key breaks:
- `proxy.ts` replaces `middleware.ts` — export is `proxy()` not `middleware()`
- Prisma 7 requires driver adapters — no `datasourceUrl` in `PrismaClient()`
- Prisma client generated to `src/generated/prisma/client.ts` (no `index.ts`, gitignored)

---

## Stack (exact versions)

| Layer | Tech | Version |
|-------|------|---------|
| Framework | Next.js (App Router) | 16.2.1 |
| React | React + React-DOM | 19.2.4 |
| Auth | NextAuth (JWT, CredentialsProvider) | 4.24.13 |
| ORM | Prisma + @prisma/adapter-pg | 7.6.0 |
| DB | PostgreSQL | Railway-hosted |
| AI | @anthropic-ai/sdk (claude-sonnet-4-20250514) | ^0.80.0 |
| CSS | Tailwind CSS v4 (@tailwindcss/postcss) | 4.x |
| PDF | Puppeteer | 24.40.0 |
| Doc parse | mammoth (docx), pdf-parse (pdf, lazy-imported) | 1.12.0 / 1.1.1 |
| Passwords | bcryptjs | 3.0.3 |
| Markdown | react-markdown | 10.1.0 |
| Host | Railway | App + Postgres services |

---

## Database Schema (Prisma)

```
User           { id, email (unique), name?, passwordHash, role: ADMIN|CLIENT }
Engagement     { id, clientName, lifecycleStage (default "Traction") }
EngagementUser { userId, engagementId } // many-to-many join, @@unique([userId, engagementId])
Node           { id, engagementId, nodeKey, displayName, sortOrder, isGate, isConditional, status: locked|active|complete|flagged|cascading }
NodeDependency { nodeId, dependsOnNodeId } // @@unique([nodeId, dependsOnNodeId])
NodeVersion    { id, nodeId, versionNumber, execSummary (Text), documentUrl?, changeType?, changeNote?, isCurrent, isBaseline, cascadeTriggering, createdAt }
CascadeFlag    { id, flaggedNodeId, sourceNodeId, flagType: needs_review|cascading, sourceChangeDate?, resolved (default false), resolvedAt? }
```

---

## Route Tree

### Pages

| Route | Type | Purpose |
|-------|------|---------|
| `/login` | Client | Email/password login form |
| `/` | Server | Redirect: ADMIN→/admin, CLIENT→/portal |
| `/portal` | Server | Client homepage: LifecycleBar + StageCard + progress |
| `/portal/strategy` | Client | Strategy cascade: CascadeNav (left) + NodeContent (right) |
| `/admin` | Server | Dashboard: all engagements listed |
| `/admin/engagements/new` | Server | Create engagement form |
| `/admin/engagements/[id]` | Server | Manage nodes for engagement |
| `/admin/nodes/[nodeKey]` | Client | Upload docs, generate AI summary, publish, resolve flags |

### API Routes

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| GET/POST | `/api/auth/[...nextauth]` | Public | NextAuth endpoints |
| GET | `/api/engagement` | Session | Client's engagement + nodes + flags |
| POST/GET | `/api/engagements` | ADMIN | Create engagement (auto-generates 10 nodes) / list all |
| GET | `/api/nodes/[nodeKey]/details` | Session | Single node + active flag |
| POST | `/api/nodes/[nodeKey]/publish` | ADMIN | Save exec summary, set status, trigger cascade |
| POST | `/api/nodes/[nodeKey]/resolve-flag` | ADMIN | Resolve flag, cleanup cascading state |
| POST | `/api/upload` | ADMIN | Upload docx/pdf/md/txt, extract text, save file |
| GET | `/api/documents/[filename]` | Session | Authenticated file download (path traversal protected) |
| POST | `/api/extract-summary` | **NONE** | Claude API generates exec summary (no auth!) |
| GET | `/api/strategy-book` | Session | Puppeteer PDF generation + download |

---

## Component Tree

| Component | Props | Notes |
|-----------|-------|-------|
| `Providers` | `{ children }` | SessionProvider wrapper |
| `TopBar` | `{ clientName }` | Logo, breadcrumb, admin badge, sign out. Client component |
| `LifecycleBar` | none | 6 static stages, "Traction" highlighted |
| `StageCard` | `{ completedCount, totalCount }` | Progress bar + link to /portal/strategy |
| `CascadeNav` | `{ nodes, selectedKey, onSelect, clientName }` | Left sidebar: status circles, progress bar, gate dividers, PDF download |
| `CascadeBanner` | `{ nodes, flags }` | Amber warning when cascade flags exist |
| `NodeContent` | `{ node, allNodes, flags }` | Dispatcher → status-specific view |
| `CompleteNodeView` | `{ node }` | Summary + doc download + "what this unlocks" |
| `ActiveNodeView` | `{ node }` | "In progress" badge + upstream deps |
| `LockedNodeView` | `{ node, allNodes }` | Lock icon + incomplete upstream deps + gate detection |
| `FlaggedNodeView` | `{ node, sourceNodeName? }` | Amber warning + source node ref |
| `SummaryContent` | `{ content }` | react-markdown with OTM-branded component overrides |
| `DevToggle` | `{ nodes, onStatusChange }` | Dev-only: cycle node statuses (hidden in production) |

---

## Data Types (`src/data/engagement.ts`)

```typescript
type NodeStatus = "locked" | "active" | "complete" | "flagged" | "cascading"

interface CascadeFlag {
  flaggedNodeKey: string; sourceNodeKey: string;
  flagType: "needs_review" | "cascading";
  sourceChangeDate: string; resolved: boolean;
}

interface CascadeNode {
  nodeKey: string; displayName: string; sortOrder: number;
  isGate: boolean; isConditional: boolean; status: NodeStatus;
  dependsOn: string[]; execSummary?: string;
  upstreamNames: string[]; downstreamNames: string[];
}

interface Engagement {
  clientName: string; lifecycleStage: string;
  nodes: CascadeNode[]; flags: CascadeFlag[];
}
```

NextAuth session augmented in `src/types/next-auth.d.ts`: `session.user` has `id: string` and `role: "ADMIN" | "CLIENT"`.

---

## Key Library Functions

### `src/lib/data-store.ts` (all async)
- `getEngagementFresh(engagementId?)` → `Engagement` with nodes + deps + flags
- `getEngagementData(engagementId?)` → flatter structure for admin ops
- `updateNode(nodeKey, { execSummary?, status? }, engagementId?)` → creates version, marks old non-current
- `getFlagForNode(nodeKey, engagementId?)` → first unresolved `CascadeFlag` or undefined
- `getNodesForEngagement(engagementId?)` → `NodeData[]` for cascade logic
- `applyCascadeResults(engagementId, sourceNodeKey, updatedNodes, newFlags)` → persists cascade to DB
- `resolveFlag(nodeKey, engagementId?)` → marks resolved, node→complete, cleans cascading
- `getDefaultEngagementId()` → first engagement ID or throws

### `src/lib/cascade.ts`
- `propagateFlags(sourceNodeKey, nodes, existingFlags)` → `{ updatedNodes, newFlags }` — recursive downstream flagging

### `src/lib/session.ts`
- `getSessionUser()` → `{ id, email, name, role }` or null
- `getUserEngagementId(requestedId?)` → engagement ID (admin: any, client: their linked one)
- `canAccessEngagement(engagementId)` → boolean

### `src/lib/prisma.ts`
- Singleton PrismaClient with PrismaPg adapter. Uses `DIRECT_DATABASE_URL` or `DATABASE_URL`.

### `src/lib/strategy-book-template.ts`
- `generateStrategyBookHTML(engagement)` → branded HTML for Puppeteer PDF

---

## The 10-Node Cascade (Stage 1)

```
 1. Key Business Information     (no deps, starts "active")
 2. ICP Alignment                → KBI                           [conditional]
 3. Competitive Analysis         → KBI
 4. Positioning Options          → KBI, ICP, Comp
 5. Positioning Guide            → Options                       [GATE — locks all downstream]
 6. Target Personas              → Guide, ICP
 7. Offer Architecture           → Guide, Personas               [conditional]
 8. Brand Story                  → Guide, Personas
 9. Messaging Playbook           → Brand Story
10. GTM Plan                     → Playbook, Offer Arch
```

**Cascade logic:** When a completed node is revised with `triggerCascade: true`:
1. Direct complete/active dependents → `flagged` (needs_review)
2. Direct locked dependents → `cascading`
3. Recurse downstream. Admin resolves each flag individually.

---

## Auth Model

- `src/proxy.ts` protects all routes except `/login` and `/api/auth`
- Admin routes (`/admin/*`) require `role: "ADMIN"` in JWT
- Client routes scope to user's linked engagement via `EngagementUser` join
- JWT callbacks in `src/lib/auth.ts` inject `id` and `role` into token/session
- Hardcoded NEXTAUTH_SECRET fallback in auth.ts and next.config.ts (Railway workaround)

---

## Brand Theme

| Token | Hex | Usage |
|-------|-----|-------|
| `otm-navy` | `#023a67` | Headlines, primary text |
| `otm-teal` | `#259494` | Buttons, links, active/complete states |
| `otm-gold` | `#e9aa22` | Highlights only — NEVER as text color |
| `otm-aqua` | `#37adbf` | Secondary accent |
| `otm-gray` | `#4a4a4a` | Body text |
| `otm-light` | `#f7f7f7` | Background |

Fonts: **Outfit** (headings 400/600/700), **Lato** (body 400/700) via `next/font/google`.
Tailwind classes: `text-otm-navy`, `bg-otm-teal`, etc. Defined in `globals.css` `@theme inline`.

---

## Known Issues & Gotchas

1. **`/api/extract-summary` has NO auth** — anyone can call it (costs money)
2. **pdf-parse** tries to load test file on import — must lazy-import: `await import("pdf-parse")`
3. **Prisma 7** — `PrismaClient()` takes adapter, NOT `datasourceUrl`. See `src/lib/prisma.ts`
4. **Prisma client path** — `src/generated/prisma/client.ts` (no index.ts). Import `@/generated/prisma/client`
5. **Generated dir is gitignored** — regenerated by `postinstall` hook and `npm run build`
6. **Railway env vars** must be on App service, not Postgres service
7. **NEXTAUTH_SECRET** has hardcoded fallback due to Railway env var injection inconsistency
8. **All data-store functions are async** — server components must `async`/`await`
9. **File uploads** saved to `/uploads` dir with no cleanup logic
10. **Puppeteer** uses `--no-sandbox` flag; PDF route has 30s timeout
11. **`getEngagementData` flag mapping** returns empty strings for flaggedNodeKey/sourceNodeKey (bug)

---

## Dev Setup

```bash
npm install                    # postinstall runs prisma generate
npx prisma dev --non-interactive  # start local Postgres (separate terminal)
npx prisma db push             # sync schema
npx prisma db seed             # populate test data
npm run dev                    # http://localhost:3000
```

**Test credentials:** `admin@meetotm.com` / `admin123`, `client@example.com` / `client123`

**Env vars (.env.local):**
```
DIRECT_DATABASE_URL=postgres://postgres:postgres@localhost:51214/template1?sslmode=disable
DATABASE_URL=prisma+postgres://localhost:51213/...
NEXTAUTH_SECRET=dev-secret-change-in-production
NEXTAUTH_URL=http://localhost:3000
ANTHROPIC_API_KEY=sk-ant-...
```

---

## Railway Deployment

- **App service** + **PostgreSQL service** (separate)
- Both `DATABASE_URL` and `DIRECT_DATABASE_URL` use internal URL (`postgres.railway.internal`)
- `nixpacks.toml` overrides to `npm install` (not `npm ci`)
- Build: `prisma generate && next build`
- Push schema to prod: enable public networking on Postgres, run `DIRECT_DATABASE_URL="<public-url>" DATABASE_URL="<public-url>" npx prisma db push`, disable public networking after

**Live URL:** https://otm-path-to-growth-portal-production.up.railway.app

---

## What's Built (Sessions 1-5, complete)

Portal UI (homepage, cascade nav, 5 node states) → Admin (doc upload, Claude AI summaries, publish) → Cascade flag engine → Strategy book PDF (Puppeteer) → Prisma + PostgreSQL + NextAuth + Railway deploy

## Future Work (not built)

ClickUp integration, email notifications, client commenting, version history UI, conditional node toggling, mobile responsive, n8n automation, custom domain, invite client flow

---

## Working Preferences

- Use `client@example.com` style placeholders — never real client emails
- Make decisions autonomously — only direct user when their physical action is required
- Don't ask questions with AskUserQuestion tool — ask as plain text
