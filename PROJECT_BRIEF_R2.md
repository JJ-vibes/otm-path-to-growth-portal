# PROJECT_BRIEF — Round 2 Updates (v2 — fully specified)

> Hand-off brief for Claude Code. Read this **before** opening the codebase. Pair with `CLAUDE.md`, `AGENTS.md`, and the existing platform overview.
>
> **This brief is intentionally exhaustive.** Every decision has been pre-made. If you find yourself wanting to ask the user a question, first re-read this document — the answer is almost certainly here. If it genuinely isn't, log the question in §13 (Open Questions) and proceed with the most defensible default rather than blocking.

**Repo:** `oldtownmedia/otm-path-to-growth-portal`
**Live:** https://otm-path-to-growth-portal-production.up.railway.app
**Branch strategy:** one feature branch per phase; squash-merge to `main` on QA pass.

---

## 0. Asset package

This brief ships with a `docs/reference/` folder. **Copy the entire folder into the repo at `docs/reference/`** as your first commit. Files included:

| File | Use |
|------|-----|
| `growth-lifecycle.avif` | Original proprietary asset, source of truth |
| `growth-lifecycle.png` | High-res PNG export of above (1920×1080); use this as the static image asset |
| `lifecycle_icons/` | Per-icon PNG crops with transparent backgrounds (96×96), backup if you need to overlay icons individually |
| `viso-progression.jpg` | Reference image for Phase 3 top progression strip layout |
| `progression-status-states.png` | Visual mockup of all 6 status states for Phase 3 cards |
| `colors.md` | Sampled hex values from brand assets, mapped to CSS var names |

The `growth-lifecycle.png` should also be copied into `public/images/growth-lifecycle.png` — that's the static asset the homepage will reference.

---

## 1. Scope

**In scope:**

1. Fix the broken per-section "Download full document" button
2. Rich text editor for admin section editing, with bidirectional .docx sync
3. Replace homepage lifecycle visual + add Stage 2/3 placeholder cards
4. Add a top progression strip on `/portal/strategy` modeled on Viso layout
5. Manual "Lock In" feature on each node + auto-unlock on upstream cascade
6. Expand admin to manage client engagement profiles, including user/password management

**Out of scope (next round):**

- Deck export — but Phase 4 must structure HTML extraction so deck export can reuse it
- KBI baseline + milestone version-history UI
- Stage 2/3 portals (placeholders only this round)
- ClickUp / n8n / email notifications
- NextAuth v5 migration — staying on v4 with credentials
- S3 / R2 file migration — local filesystem stays
- Magic links / SSO

---

## 2. Phase order

Ordered by dependency. Don't reorder.

| Phase | Change # | Title | Depends on |
|-------|----------|-------|------------|
| 0 | — | Schema migration | — |
| 1 | 4 | Fix per-section download button | — |
| 2 | 2 | Homepage lifecycle visual + Stage cards | — |
| 3 | 3 | Top progression strip + Lock In | Phase 0 |
| 4 | 1 | Rich text editor + bidirectional .docx sync | Phase 0 |
| 5 | 6 | Admin client profile management | Phase 4 |

---

## 3. Phase 0 — Schema migration

One migration, all schema changes. Run before Phase 1.

### 3.1 Schema additions

```prisma
model User {
  // ...existing fields
  active       Boolean   @default(true)
  deactivatedAt DateTime?
}

model Engagement {
  // ...existing fields
  clientLogoUrl String?
  internalNotes String?  @db.Text  // rich-text HTML, admin-only
}

model Node {
  // ...existing fields
  lockedIn     Boolean   @default(false)
  lockedInAt   DateTime?
  lockedInBy   String?   // userId of admin who locked it
}

model NodeVersion {
  // ...existing fields
  docxOutOfSync     Boolean   @default(false)
  docxRegeneratedAt DateTime?
}

model EngagementNodeConfig {
  id           String     @id @default(cuid())
  engagementId String
  nodeId       String
  excluded     Boolean    @default(false)
  engagement   Engagement @relation(fields: [engagementId], references: [id], onDelete: Cascade)
  node         Node       @relation(fields: [nodeId], references: [id], onDelete: Cascade)

  @@unique([engagementId, nodeId])
}

model EngagementAsset {
  id           String     @id @default(cuid())
  engagementId String
  filename     String
  url          String
  mimeType     String
  sizeBytes    Int
  uploadedAt   DateTime   @default(now())
  uploadedBy   String     // userId
  engagement   Engagement @relation(fields: [engagementId], references: [id], onDelete: Cascade)
}
```

Add corresponding back-references on `Engagement` and `Node`.

### 3.2 Migration commands

```bash
npx prisma migrate dev --name round2_full
npx prisma generate
```

### 3.3 Seed updates

In `prisma/seed.ts`:

- Set `lockedIn: false` explicitly on all 7 EP nodes
- For the EP engagement, do NOT create any `EngagementNodeConfig` rows — absence means "all nodes included with defaults"

### 3.4 Backfill

None required. All defaults are correct for existing data.

---

## 4. Phase 1 — Fix download button (Change 4)

### 4.1 Symptom

The "Download full document" button rendered alongside published node content is not clickable.

### 4.2 Diagnostic order

1. Open `/portal/strategy` as the seed client, navigate to the Key Business Information node
2. Inspect the download button in DOM. Three likely causes, check in order:
   - **CSS** — pointer-events disabled, z-index buried under another element, or `disabled` attribute
   - **Missing href** — anchor with no `href`, or button without `onClick`
   - **Null documentUrl** — `NodeVersion.documentUrl` is null on the published version, button renders but has nothing to fetch
3. If documentUrl is null on a node that should have a document, this is also a data bug — either the upload flow didn't persist the URL or the publish flow stripped it. Trace `src/app/api/nodes/[nodeKey]/publish/route.ts` to confirm.

### 4.3 Fix

Where likely: `src/components/CompleteNodeView.tsx` and any `DownloadButton`-style child component.

The button should:
- Be an `<a>` tag with `href={`/api/documents/${filename}`}`, `target="_blank"`, `rel="noopener"`, and `download` attribute
- Render only when `documentUrl` is non-null
- Render an "(no source document attached)" muted note when documentUrl is null, so admins notice the gap

### 4.4 Acceptance

- [ ] Logged in as `client@example.com`, on at least one complete EP node, the download button is visible and clicking it downloads the .docx
- [ ] On a node where documentUrl is null, the muted note shows instead of a broken button
- [ ] No console errors; no 404s in the network tab

---

## 5. Phase 2 — Homepage lifecycle visual + Stage cards (Change 2)

### 5.1 Approach: image-as-asset, not redrawn in code

The proprietary "Professional Services Firm Growth Lifecycle™" visual is the brand asset itself. **Do not attempt to recreate it in SVG or CSS.** Instead:

- Use `public/images/growth-lifecycle.png` as a static `<Image>` (Next.js `next/image`)
- Layer dynamic state (the "YOU ARE HERE" pill, current-stage highlight) as absolutely-positioned overlays on top
- The image is responsive — scales with parent container width

This is the pragmatic move: zero risk of visual drift, exact pixel fidelity to the brand asset, and the only thing that varies is the dynamic overlay.

### 5.2 Component structure

Create `src/components/GrowthLifecycle.tsx`:

```tsx
type Props = {
  currentStage: 'FORMATION' | 'TRACTION' | 'STRUCTURE' | 'MOMENTUM' | 'SCALE_READY' | 'ACCELERATE_EXIT'
}
```

Reads `Engagement.lifecycleStage` from the page-level data fetch and passes the matching enum value as `currentStage`.

### 5.3 Layout

```
<div class="relative w-full max-w-[1200px] mx-auto aspect-[1920/1080]">
  <Image src="/images/growth-lifecycle.png" alt="OTM Growth Lifecycle" fill priority />
  
  {/* "YOU ARE HERE" pill — absolutely positioned over the active column */}
  <div class="absolute" style={pillPosition[currentStage]}>
    <span class="...">YOU ARE HERE</span>
  </div>
</div>
```

### 5.4 Pill positioning

The image is 1920×1080. The 6 columns are centered at these x-positions (as percentages of width, which is what we use in CSS so it stays correct at any rendered size):

| Stage | Column center (% of width) | Pill `left` |
|-------|----------------------------|-------------|
| FORMATION | 4% | `4%` |
| TRACTION | 18% | `18%` |
| STRUCTURE | 35% | `35%` |
| MOMENTUM | 51% | `51%` |
| SCALE_READY | 68% | `68%` |
| ACCELERATE_EXIT | 85% | `85%` |

Pill `top`: `30%` (just below the description text, above the underline strip).

Pill style:

```
- background: #e7a923 (gold)
- color: white
- font: Outfit, 11px, bold, uppercase, letter-spacing 0.05em
- padding: 4px 10px
- border-radius: 999px
- transform: translateX(-50%) — to center pill on the column center
- box-shadow: 0 2px 4px rgba(13,53,79,0.15)
```

### 5.5 Stage cards (below the visual)

Replace the existing single stage card with three cards in a horizontal row.

Update `src/app/portal/page.tsx` (or wherever the homepage renders).

| # | Title | State | Description | Behavior |
|---|-------|-------|-------------|----------|
| 1 | **Prove the Strategy** | active | Read existing copy from current card; keep as-is. **Drop the "Stage 1:" prefix.** | Clickable, links to `/portal/strategy` |
| 2 | **Prove the Tactics** | locked | "Test the strategy in market — campaigns, channels, and offers prove what drives growth before you scale." | Not clickable, `cursor: not-allowed`, lock icon visible |
| 3 | **Prove the Model** | locked | "Scale what works — repeatable processes, measurable outcomes, profitable growth at scale." | Not clickable, `cursor: not-allowed`, lock icon visible |

### 5.6 Card visual specs

All three cards: same shape, same dimensions.

```
- card width: 33% of row, gap-4 between cards
- aspect ratio: ~1.4:1 (approx 360×260)
- border-radius: 12px
- border: 1px solid #e7eaf0
- padding: 24px
- background: white
```

Active card (#1):
- Card has a `bg-otm-light` (light teal) accent strip on left edge, 4px wide
- Title color: `#0d354f` (navy), Outfit 20px bold
- "PROVE THE STRATEGY" label above title: Outfit 11px, uppercase, gold (`#e7a923`), letter-spacing 0.1em
- Description: Lato 14px, slate (`#5b6577`)
- Hover: subtle box-shadow, cursor pointer
- "View Strategy →" CTA at bottom: Outfit 14px bold, navy

Locked cards (#2, #3):
- Card opacity: 0.6
- Lock icon (`Lock` from lucide-react, 16px, slate) in upper right
- Same typography but no CTA at bottom
- Replace CTA with muted text "Unlocks after [previous stage]"
- Card 2: "Unlocks after Prove the Strategy"
- Card 3: "Unlocks after Prove the Tactics"
- `cursor: default`, no hover effect

### 5.7 Mobile (<768px)

- Lifecycle visual: scales down to full container width, stays visible
- Stage cards: stack vertically, full-width
- "YOU ARE HERE" pill: stays positioned at same percentage offsets (works because we used percentages)

### 5.8 Acceptance

- [ ] Lifecycle visual renders at full quality on `/portal`
- [ ] "YOU ARE HERE" pill appears over the TRACTION column for the EP engagement (since `lifecycleStage` is "Traction")
- [ ] Three stage cards render below; only "Prove the Strategy" is clickable
- [ ] Title is "Prove the Strategy" (no "Stage 1:" prefix)
- [ ] Mobile: visual scales, cards stack vertically, pill stays positioned correctly
- [ ] Run a subagent visual QA pass (see §12) comparing against `docs/reference/growth-lifecycle.png`

---

## 6. Phase 3 — Top progression strip + Lock In (Change 3)

### 6.1 Component placement

Add `<NodeProgressionStrip />` above the existing two-column layout on `/portal/strategy`. **Do not replace `CascadeNav`** — the left rail stays.

Visual reference: `docs/reference/viso-progression.jpg` (similar dimensions, 7 cards instead of 6).
Status state mockup: `docs/reference/progression-status-states.png`.

### 6.2 Status mapping

The strip introduces a derived `displayStatus` that combines `Node.status` + `Node.lockedIn`:

```ts
function getDisplayStatus(node: Node): DisplayStatus {
  if (node.status === 'flagged') return 'NEEDS_REVIEW'
  if (node.status === 'cascading') return 'PENDING_UPDATE'
  if (node.status === 'locked') return 'LOCKED'
  if (node.status === 'active') return 'IN_PROGRESS'
  if (node.status === 'complete' && node.lockedIn) return 'LOCKED_IN'
  if (node.status === 'complete' && !node.lockedIn) return 'AWAITING_APPROVAL'
  return 'LOCKED' // fallback
}
```

### 6.3 Card spec (per state)

Refer to `progression-status-states.png` for visual reference. Common dimensions across all states:

```
- card width: flex-1 (equal) within the row
- min-width: 160px on desktop
- height: 240px
- border-radius: 6px
- border: 2px solid {accent color, varies by status}
- top accent bar: 4px tall, full card width, color = accent color
- padding: 16px
```

Per-state colors (also in `colors.md`):

| Status | Border / accent | Background tint | Number badge bg | Number badge fg | Status badge bg | Status badge fg |
|--------|-----------------|-----------------|-----------------|-----------------|-----------------|-----------------|
| LOCKED | `#cbd2db` | `#f5f6f8` | `#cbd2db` | `#5b6577` | `#e7eaf0` | `#5b6577` |
| IN_PROGRESS | `#e7a923` | `#fff8e8` | `#e7a923` | `#ffffff` | `#e7a923` | `#ffffff` |
| AWAITING_APPROVAL | `#2d9198` | `#e0f5f6` | `#2d9198` | `#ffffff` | `#2d9198` | `#ffffff` |
| LOCKED_IN | `#0d354f` | `#e8edf2` | `#0d354f` | `#ffffff` | `#0d354f` | `#ffffff` |
| NEEDS_REVIEW | `#c84a3c` | `#fceeec` | `#c84a3c` | `#ffffff` | `#c84a3c` | `#ffffff` |
| PENDING_UPDATE | `#b88a2e` | `#fbf2e0` | `#b88a2e` | `#ffffff` | `#b88a2e` | `#ffffff` |

Card content layout (top to bottom):

```
[Number circle 32×32 — top-left]   [Status badge — top-right, rounded-full]
[gap 24px]
[Node title — Outfit 14px bold, navy, can wrap to 2 lines]
[Short description — Lato 11px, slate, 2 lines max with ellipsis]
[gap, push to bottom]
[OUTPUT label — Outfit 10px, uppercase, muted #8a92a3]
[Output deliverable name — Outfit 13px bold, navy]
```

Number circle: 32px diameter, the number "01" through "07" centered, Outfit 13px bold.
Status badge: rounded-full, padding 4px 10px, Outfit 10px bold uppercase letter-spacing 0.05em.

### 6.4 The 7 cards — exact content

| # | Title | Description (1 line, max ~80 chars) | Output (deliverable name) |
|---|-------|--------------------------------------|---------------------------|
| 01 | Key Business Information | Foundation — vision, services, current state, growth goals | Business Foundation |
| 02 | Ideal Client Profile | Who we're going after and how they buy | Defined ICPs |
| 03 | Competitive Analysis | Where we sit in the market and where the gaps are | Competitive Landscape Report |
| 04 | Positioning | The locked strategic direction everything downstream depends on | Positioning Guide |
| 05 | What Are We Selling | The offer architecture aligned to ICP and positioning | Offer Architecture |
| 06 | Messaging Playbook | How we communicate the positioning to each audience | Messaging Playbook |
| 07 | GTM Plan | Where, when, and how to take the strategy to market | Go-to-Market Plan |

If `EngagementNodeConfig.excluded === true` for any node, **omit it from the strip entirely**. The card row becomes 6-wide, not 7. Each remaining card stays `flex-1`.

### 6.5 Active card emphasis

The card whose `displayStatus === 'IN_PROGRESS'` gets two extras on top of the IN_PROGRESS color treatment:

- Card scales up by 4% (`scale-[1.04]`), with a slight transition
- Box-shadow: `0 4px 12px rgba(231,169,35,0.25)` (gold-tinted)

This is the equivalent of Viso's "WE ARE HERE" treatment.

### 6.6 Mobile behavior (<768px)

The strip collapses to an accordion:

- Headers stack vertically, each 56px tall
- Each header shows: number circle (24px, left), node title (Outfit 13px bold), status badge (right)
- The card whose `displayStatus === 'IN_PROGRESS'` is **expanded by default** on first render
- All other cards collapsed
- Tap header to expand: shows description + output, 80px additional height
- Smooth expand/collapse animation (`transition-all 200ms ease-out`)
- Only one card expands at a time (tapping another collapses the current and expands the new one)

### 6.7 Lock In feature — admin UX

In `/admin/nodes/[nodeKey]`:

- When `node.status === 'complete'` AND `node.lockedIn === false`: show a primary button labeled **"Lock In"** in the top-right of the editor
- When `node.lockedIn === true`: replace with two elements — a navy "Locked In" badge with a checkmark icon, and a smaller secondary "Unlock" button next to it
- **Lock In confirmation dialog:**
  - Title: "Lock in this node?"
  - Body: "This signals that **{Client Name}** has approved **{Node Title}**. Downstream nodes will read this as a confirmed dependency. Continue?"
  - Buttons: "Cancel" (secondary), "Lock In" (primary, navy bg)
- **Unlock confirmation dialog:**
  - Title: "Unlock this node?"
  - Body: "Unlocking will revert the status to 'Awaiting Approval' on the client portal. Downstream nodes are not affected by manual unlocks."
  - Buttons: "Cancel", "Unlock" (primary, red-bordered)

### 6.8 Cascade auto-unlock — engine update

Update `src/lib/cascade.ts`. When a node version is published with `cascadeTriggering = true`:

1. Existing flag propagation runs (downstream `complete` → `flagged`, `locked` → `cascading`) — unchanged
2. **NEW:** every downstream node where `lockedIn === true` is set to `lockedIn = false`, `lockedInAt = null`, `lockedInBy = null`
3. Both #1 and #2 must run inside a single `prisma.$transaction([...])` — both succeed or both fail

After the transaction, the publish route returns a summary used by the admin UI:

```ts
{
  cascadeTriggered: boolean,
  flaggedNodeIds: string[],
  unlockedNodeIds: string[],
  cascadingNodeIds: string[],
}
```

### 6.9 Admin signal banner

When the publish response indicates `unlockedNodeIds.length > 0` or `flaggedNodeIds.length > 0`, show a dismissable amber banner at the top of `/admin/nodes/[nodeKey]`:

> ⚠️ Cascade triggered: **{N} downstream nodes** were unlocked or flagged for re-review.
> Unlocked: {comma-separated node titles}
> Flagged: {comma-separated node titles}
> [Dismiss]

Banner persists until manually dismissed (sessionStorage flag), no notification system needed.

### 6.10 New API endpoints

#### `POST /api/nodes/[nodeKey]/lock-in`

```
Auth: admin only
Body: { engagementId: string }
Response 200: { node: { id, lockedIn: true, lockedInAt, lockedInBy } }
Response 400: { error: "Node must be complete to lock in" }
Response 403: { error: "Forbidden" }
```

Behavior: validates `node.status === 'complete'`. Sets `lockedIn = true`, `lockedInAt = now()`, `lockedInBy = session.user.id`.

#### `POST /api/nodes/[nodeKey]/unlock`

```
Auth: admin only
Body: { engagementId: string }
Response 200: { node: { id, lockedIn: false } }
Response 403: { error: "Forbidden" }
```

Behavior: sets `lockedIn = false`, `lockedInAt = null`, `lockedInBy = null`. Does NOT cascade.

### 6.11 Acceptance

- [ ] Top strip renders 7 cards with correct statuses derived from EP seed data
- [ ] On first load with default seed (KBI active, others locked), card 01 shows IN_PROGRESS treatment with scale + shadow
- [ ] Mobile: accordion shows IN_PROGRESS card expanded by default
- [ ] Admin can lock in a complete node; UI updates immediately with the navy "Locked In" badge + Unlock button
- [ ] Editing an upstream node and marking the new version cascade-triggering auto-unlocks all downstream `lockedIn` nodes AND flags `complete` ones in the same transaction
- [ ] Admin sees the banner with correct unlocked/flagged node lists
- [ ] **Unit test for `cascade.ts`:** test the transactional unlock+flag behavior. Cover: (a) no cascade triggers nothing, (b) cascade with no locked downstream nodes flags only, (c) cascade with locked downstream nodes both flags and unlocks, (d) transaction rollback if any step fails
- [ ] If `EngagementNodeConfig.excluded === true` on "What Are We Selling", strip shows 6 cards, not 7

---

## 7. Phase 4 — Rich text editor + bidirectional .docx sync (Change 1)

### 7.1 Editor — TipTap v2

Replace the plain content area in the admin section editor with TipTap.

**Install:**

```bash
npm install @tiptap/react@^2.10.0 @tiptap/pm@^2.10.0 @tiptap/starter-kit@^2.10.0 \
  @tiptap/extension-table@^2.10.0 @tiptap/extension-table-row@^2.10.0 \
  @tiptap/extension-table-cell@^2.10.0 @tiptap/extension-table-header@^2.10.0 \
  @tiptap/extension-link@^2.10.0 @tiptap/extension-underline@^2.10.0
```

**Pre-flight compatibility check:** before committing, do a 30-min spike — install in a feature branch, render a minimal editor, confirm no React 19 / Next.js 16 errors. If TipTap fails on this stack, the fallback is Lexical (`lexical@^0.20`, `@lexical/react`). Document whichever you ship.

### 7.2 Editor configuration

Create `src/components/RichTextEditor.tsx`:

```tsx
type Props = {
  initialHtml: string
  onChange: (html: string) => void
  placeholder?: string
}
```

**StarterKit overrides:**
- Disable Heading H1 entirely (`heading: { levels: [2, 3] }`) — H1 is the section divider for .docx parsing and must never appear inside section content
- Keep all other StarterKit extensions enabled

**Extensions added:**
- `Underline`
- `Link.configure({ openOnClick: false, HTMLAttributes: { target: '_blank', rel: 'noopener' } })`
- `Table.configure({ resizable: true })`, `TableRow`, `TableHeader`, `TableCell`

### 7.3 Toolbar

A horizontal toolbar above the editor. Buttons (in order):

| Button | Action | Icon (lucide-react) |
|--------|--------|---------------------|
| Bold | toggleBold | `Bold` |
| Italic | toggleItalic | `Italic` |
| Underline | toggleUnderline | `Underline` |
| H2 | toggleHeading({ level: 2 }) | text "H2" |
| H3 | toggleHeading({ level: 3 }) | text "H3" |
| Bullet list | toggleBulletList | `List` |
| Numbered list | toggleOrderedList | `ListOrdered` |
| Link | prompt for URL, setLink | `Link2` |
| Insert table | insertTable({ rows: 3, cols: 3, withHeaderRow: true }) | `Table` |
| Undo | undo | `Undo2` |
| Redo | redo | `Redo2` |

Active state: button background `bg-otm-light` with navy text. Inactive: white with slate text.

Toolbar fixed height 40px, gap-1 between buttons, button size 32×32px.

### 7.4 Content area styling

Wrap the editor's `EditorContent` with `class="prose-otm min-h-[400px] max-h-[700px] overflow-y-auto px-6 py-4 border border-gray-200 rounded-md"`.

Make sure `prose-otm` already styles `<table>`, `<tr>`, `<th>`, `<td>` — if not, add table styles to the existing `prose-otm` definition in `globals.css`:

```css
.prose-otm table { @apply w-full border-collapse my-4; }
.prose-otm th { @apply bg-otm-light text-otm-navy font-bold p-3 text-left border border-gray-300; }
.prose-otm td { @apply p-3 border border-gray-200; }
```

### 7.5 Paste sanitization

When content is pasted, run the resulting HTML through TipTap's built-in paste handlers AND strip H1 tags (downgrade to H2):

```ts
editor.setOptions({
  editorProps: {
    transformPastedHTML(html) {
      return html.replace(/<h1\b/gi, '<h2').replace(/<\/h1>/gi, '</h2>')
    }
  }
})
```

### 7.6 Save flow

The editor's `onChange` handler emits HTML. The parent admin form:

1. Captures HTML on each change (debounced 500ms — don't save on every keystroke)
2. On explicit "Save" button: passes through `sanitize-html` (existing config in `src/lib/data-store.ts`, extend allowed tags to include `<u>`, `<table>`, `<thead>`, `<tbody>`, `<tr>`, `<th>`, `<td>`)
3. Saves to `NodeSection.contentHtml`
4. **Sets `NodeVersion.docxOutOfSync = true`** on the current version

### 7.7 Bidirectional .docx sync — banner

In the admin node editor (`/admin/nodes/[nodeKey]`), at the top of the page:

```tsx
{currentVersion.docxOutOfSync && (
  <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-6 flex items-start gap-3">
    <AlertTriangle className="text-amber-600 mt-0.5" size={20} />
    <div className="flex-1">
      <p className="font-semibold text-amber-900">
        Portal edits made since last .docx export
      </p>
      <p className="text-sm text-amber-800 mt-1">
        Download the updated .docx to keep the source document aligned.
      </p>
    </div>
    <button onClick={regenerateDocx} className="...">
      Download Updated .docx
    </button>
  </div>
)}
```

Banner is **not dismissable**. Only way to clear it is to download.

### 7.8 Regenerate .docx — endpoint

#### `POST /api/nodes/[nodeKey]/regenerate-docx`

```
Auth: admin only
Body: { engagementId: string }
Response 200: file stream (Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document)
              with Content-Disposition: attachment; filename="{nodeKey}_updated.docx"
              Side effect: NodeVersion.docxOutOfSync = false, docxRegeneratedAt = now()
                           NodeVersion.documentUrl is updated to the new file path
Response 403: { error: "Forbidden" }
Response 500: { error: "Failed to generate .docx" }
```

**Implementation steps:**

1. Read current `NodeVersion` and all `NodeSection`s where `isEnabled = true`, ordered by `sortOrder`
2. Use the new `getNodeContentForExport()` helper (see §7.10) — single source of truth for "what's in this node"
3. Build .docx via `html-to-docx`:

```ts
import HTMLtoDOCX from 'html-to-docx'

const htmlBody = sections.map(s => `<h1>${s.displayName}</h1>${s.contentHtml}`).join('\n')
const fullHtml = `<!DOCTYPE html><html><body>${htmlBody}</body></html>`

const buffer = await HTMLtoDOCX(fullHtml, null, {
  table: { row: { cantSplit: true } },
  font: 'Lato',
  fontSize: 22, // half-points; 22 = 11pt
  margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }, // 1 inch (1440 twips)
  title: nodeTitle,
  creator: 'OTM Portal',
})
```

4. Save buffer to local filesystem at `/uploads/{engagementId}/{nodeKey}_v{versionNumber}_regenerated_{timestamp}.docx`
5. Update `NodeVersion.documentUrl` to the new filename
6. Set `docxOutOfSync = false`, `docxRegeneratedAt = now()`
7. Stream file in response

### 7.9 Known limitation — brand styling in .docx

`html-to-docx` will NOT preserve the OTM brand styling (heading colors, italic teal instruction text). The regenerated .docx will have plain styling.

**Acceptable trade-off this round.** Document this as a known limitation in `CLAUDE.md`. Do not sink more than one session into making it perfect — if a richer transformation is needed later, the path is the `docx` library (not `html-to-docx`) and rebuilding brand styling programmatically.

If you find `html-to-docx` produces unusable output (e.g. tables broken, lists missing), flag it back to the user before falling back. Don't silently swap libraries.

### 7.10 Reusable export helper

Create `src/lib/section-export.ts`:

```ts
export type ExportableSection = {
  templateId: string
  sectionKey: string
  displayName: string
  kind: 'CHAPTER' | 'FULL'
  contentHtml: string
  sortOrder: number
}

export type ExportableNode = {
  nodeId: string
  nodeKey: string
  displayName: string
  versionNumber: number
  sections: ExportableSection[]
}

export async function getNodeContentForExport(
  nodeId: string,
  opts: { layer?: 'CHAPTER' | 'FULL' | 'BOTH' } = {}
): Promise<ExportableNode> {
  // Fetch node + current version + enabled sections, ordered by sortOrder
  // Filter by `kind` if `layer` is set to CHAPTER or FULL
  // Return shape above
}
```

Both `regenerate-docx` and the future `generate-deck` endpoint must call this — never reimplement the query.

### 7.11 Conflict handling — re-uploading a fresh .docx with portal edits pending

When admin uploads a new .docx through the existing flow (`POST /api/upload`) AND the current `NodeVersion.docxOutOfSync === true`:

**Default behavior (chosen): warn and confirm.**

1. Server detects conflict on upload, returns `409 Conflict` with body `{ error: "PORTAL_EDITS_PENDING", message: "..." }`
2. Frontend catches the 409 and shows a confirmation dialog:
   - Title: "Overwrite portal edits?"
   - Body: "Portal edits have been made since the last .docx download. Uploading this new file will overwrite those edits. To preserve them, cancel and download the updated .docx first."
   - Buttons: "Cancel", "Overwrite Portal Edits" (red, destructive)
3. On confirm: upload retried with `?force=true` query param, which bypasses the 409 check
4. After overwrite, `docxOutOfSync = false`

### 7.12 Acceptance

- [ ] Spike confirms TipTap v2 + React 19 + Next.js 16 compatibility (or fallback documented)
- [ ] Editor renders with full toolbar; all buttons work; tables can be inserted/edited
- [ ] H1 button is absent; pasted H1 content is downgraded to H2
- [ ] Saving any section sets `docxOutOfSync = true` and the banner appears
- [ ] Clicking "Download Updated .docx" produces a downloadable file matching the current portal content
- [ ] Banner clears after successful download; `docxRegeneratedAt` is set
- [ ] Re-uploading a fresh .docx with pending portal edits triggers the 409 flow with confirmation dialog
- [ ] `getNodeContentForExport()` is implemented and used by `regenerate-docx`
- [ ] Tables in the editor render correctly on the client portal view (use `SectionHtml`, no changes needed there)

---

## 8. Phase 5 — Admin client profile management (Change 6)

### 8.1 Tabbed layout

Convert `/admin/engagements/[id]` from a single-pane node list to a tabbed view. Use a simple Tailwind tab pattern (no library — match repo conventions).

Tabs:

| Tab | URL | Content |
|-----|-----|---------|
| Overview | `?tab=overview` (default) | Engagement metadata + internal notes |
| Nodes | `?tab=nodes` | Existing node management view, **moved into this tab unchanged** |
| Users | `?tab=users` | User management (the new capability) |
| Settings | `?tab=settings` | Conditional toggles (combines old "Toggles") |
| Branding | `?tab=branding` | Logo upload |
| Assets | `?tab=assets` | File library |

URL query param drives active tab; tabs are server-rendered (RSC), no client state needed.

### 8.2 Overview tab

Sections:

```
[Engagement Name — editable inline]
[Lifecycle Stage — dropdown: Formation, Traction, Structure, Momentum, Scale-Ready, Accelerate+Exit]
[Created — read-only, date]
[Internal Notes — TipTap RichTextEditor surface from Phase 4]
```

Notes save on blur; lifecycle stage saves immediately on change.

### 8.3 Users tab — explicit requirement

Display: a table with columns `Name | Email | Status (Active/Inactive) | Last Login | Actions`.

Above the table: button **"+ Add Client User"**.

Per-row actions (icon buttons):
- Pencil → edit modal (name, email)
- Key → reset password modal
- UserMinus → deactivate (toggles to UserPlus to reactivate)
- Trash → unlink from engagement (with confirm dialog)

#### Add User modal

```
Title: Add Client User
Fields:
  - Name (required)
  - Email (required, validated)
  - Initial Password (required, min 8 chars, with "Generate Random" button)
Submit button: "Create & Add to Engagement"
```

On submit:
- POST to `/api/admin/engagements/[id]/users`
- Body: `{ name, email, password }`
- Server: creates User if email doesn't exist, hashes password via existing bcrypt flow, creates `EngagementUser` join row
- If email already exists on a User: returns 409, frontend shows "User exists. Add to this engagement?" with confirm button (which retries with `?addExisting=true`)

#### Reset Password modal

```
Title: Reset Password — {User Name}
Body: "Set a new password for this user. Share it with them out-of-band (email, Slack, etc.)."
Fields:
  - New Password (required, min 8 chars, with "Generate Random" button)
  - Confirm Password (must match)
Submit button: "Reset Password"
```

On submit:
- POST to `/api/admin/users/[userId]/reset-password`
- Body: `{ password }`
- Server: validates length, hashes via bcrypt, updates User
- Show "Copy Password" button after success in case admin needs to share immediately

#### Deactivate confirm

```
Title: Deactivate {User Name}?
Body: "This user will no longer be able to log in. You can reactivate them at any time."
Buttons: Cancel, Deactivate
```

On confirm: PATCH `/api/admin/users/[userId]` with `{ active: false }`. Server sets `active = false`, `deactivatedAt = now()`.

Update `src/lib/auth.ts` (or wherever NextAuth `authorize()` lives) to reject login attempts where `user.active === false` with a clear error message: "Account deactivated. Contact your OTM administrator."

#### Unlink confirm

```
Title: Remove {User Name} from this engagement?
Body: "The user account will not be deleted, but they will no longer have access to {Engagement Name}."
Buttons: Cancel, Remove
```

On confirm: DELETE `/api/admin/engagements/[id]/users/[userId]`. Server deletes the `EngagementUser` row, leaves the User row intact.

### 8.4 Users tab API endpoints

#### `POST /api/admin/engagements/[id]/users`
```
Auth: admin only
Body: { name: string, email: string, password: string, addExisting?: boolean }
Response 201: { user: { id, name, email, active } }
Response 409: { error: "USER_EXISTS", existingUserId: string }
Response 400: { error: "Validation failed", fields: [...] }
```

#### `POST /api/admin/users/[userId]/reset-password`
```
Auth: admin only
Body: { password: string }
Response 200: { success: true }
Response 400: { error: "Password must be at least 8 characters" }
```

#### `PATCH /api/admin/users/[userId]`
```
Auth: admin only
Body: { name?: string, email?: string, active?: boolean }
Response 200: { user: { id, name, email, active, deactivatedAt } }
```

#### `DELETE /api/admin/engagements/[id]/users/[userId]`
```
Auth: admin only
Response 200: { success: true }
Response 404: { error: "User not on engagement" }
```

### 8.5 Settings tab — conditional toggles

Two toggles, each backed by `EngagementNodeConfig`:

```
☐ Include "What Are We Selling" node
   When unchecked, this node is hidden from the client portal, top progression strip,
   and PDF export. Cascade dependencies skip it.

☐ Include Voice of Customer / ICP Alignment sections
   When unchecked, the VoC sections inside the ICP node are hidden on the client portal.
```

Toggle 1 implementation:
- On toggle off: upsert `EngagementNodeConfig { engagementId, nodeId: <whatAreWeSelling.id>, excluded: true }`
- On toggle on: delete the row (or set `excluded: false`)
- Updates flow through to: `CascadeNav`, `NodeProgressionStrip`, PDF generation, cascade dependency math

**Cascade dependency handling for excluded nodes:** the cascade engine treats an excluded node as transparent — downstream nodes that depend on it should skip it in dependency resolution. Specifically: if Node X depends on excluded Node Y, then Node X is treated as if it depends only on Node Y's dependencies (transitive skip).

**Test this**: with "What Are We Selling" excluded, GTM Plan should still unlock when its other dependency (Messaging Playbook) is complete.

Toggle 2: same `EngagementNodeConfig` pattern but at the section level — store as a per-section config or extend `EngagementNodeConfig` with a JSON `sectionToggles` field. **Recommendation:** add a JSON column to keep schema simple:

```prisma
model EngagementNodeConfig {
  // existing
  sectionToggles Json?  // e.g. { "voc_alignment": false }
}
```

Add this to the Phase 0 migration.

### 8.6 Branding tab

Single field: client logo upload.

```
[Drop zone or file picker]
Accepts: PNG, JPG, SVG
Max size: 2MB
Max dimensions: 1000×1000px
Preview: shows current logo at 120px height
Actions: Upload (replaces existing), Remove (clears clientLogoUrl)
```

On upload:
- POST to `/api/admin/engagements/[id]/logo` with multipart form
- Server validates file type, size, dimensions
- Saves to `/uploads/{engagementId}/logo_{timestamp}.{ext}`
- Updates `Engagement.clientLogoUrl`

Where logo renders: in the client portal header on `/portal` and `/portal/strategy`, replacing or alongside the OTM logo (recommend: client logo on left, OTM logo on right with separator). When `clientLogoUrl` is null, show only the OTM logo.

### 8.7 Assets tab

Engagement-scoped asset library.

UI: a list of uploaded files with columns `Filename | Type | Size | Uploaded By | Uploaded On | Actions`.

Above: drop zone supporting any file type up to 25MB. Multiple files can be uploaded at once.

Per-row actions: Download, Delete (admin only — client doesn't see delete).

Client-side surface: add a "Resources" section to `/portal` that lists `EngagementAsset`s, each with a download link. Read-only for the client.

API endpoints:

#### `POST /api/admin/engagements/[id]/assets`
```
Auth: admin only
Body: multipart form, file field
Response 201: { asset: { id, filename, url, mimeType, sizeBytes, uploadedAt } }
Response 413: { error: "File too large (max 25MB)" }
```

#### `DELETE /api/admin/engagements/[id]/assets/[assetId]`
```
Auth: admin only
Response 200: { success: true }
```

#### `GET /api/engagements/[id]/assets`
```
Auth: any user with access to engagement
Response 200: { assets: [...] }
```

### 8.8 Acceptance

- [ ] Six tabs render; URL query param drives active tab
- [ ] Overview: lifecycle stage dropdown saves on change; internal notes save on blur with TipTap
- [ ] Add user works; new user can log in with the password admin set
- [ ] Reset password works; old password rejected, new password accepted
- [ ] Deactivate works; deactivated user gets clear error on login attempt
- [ ] Unlink removes user from engagement but doesn't delete User row
- [ ] Toggle "What Are We Selling" off → it disappears from portal, strip, and PDF
- [ ] With "What Are We Selling" excluded, GTM Plan still unlocks when Messaging Playbook completes
- [ ] Logo upload renders in portal header
- [ ] Asset upload works; client sees Resources section on `/portal` with download links
- [ ] All endpoints reject non-admin requests with 403

---

## 9. Validation rules (apply consistently across all forms)

| Field | Rule |
|-------|------|
| Email | Standard regex, lowercased, max 254 chars |
| Password | Min 8 chars, max 128 chars, no other complexity rules this round |
| Name | 1-100 chars, trimmed |
| Filename | Sanitize: replace whitespace with `_`, strip non-alphanumeric except `_-.`, max 200 chars |
| URL (link in editor) | Must start with `http://`, `https://`, or `mailto:` |

---

## 10. Empty states (specify so they're not forgotten)

| Surface | Empty state |
|---------|-------------|
| Engagement with no users | "No client users yet. Click + Add Client User to invite the first one." |
| Engagement with no assets | "No shared assets yet. Drop files above to share with the client." |
| Node with no documentUrl | "(no source document attached)" muted note where download button would be |
| Strip with all nodes locked | Don't show empty state; the LOCKED cards ARE the state |
| Internal notes empty | TipTap shows placeholder: "Add private notes about this engagement..." |

---

## 11. Error handling baseline

For all new endpoints:

- **403**: any non-admin request to admin-only endpoint, or any cross-engagement access attempt
- **404**: resource doesn't exist (don't leak whether it's "doesn't exist" vs "you don't have access" — both return 404)
- **400**: validation failure, with `{ error: string, fields?: string[] }` shape
- **409**: conflicts (user exists, portal edits pending, etc.)
- **500**: unhandled — log full error server-side, return `{ error: "Internal server error" }` to client

Frontend: surface 4xx errors as inline form errors or toast messages. Surface 5xx as a generic toast: "Something went wrong. Please try again or contact support."

---

## 12. Visual QA — required after Phases 2, 3, 5

After each visual phase, run a subagent visual QA pass.

```bash
# Take screenshots — desktop and mobile widths
# /portal (desktop 1280px, mobile 380px)
# /portal/strategy (desktop, mobile)
# /admin/engagements/[id] each tab (desktop only)
```

Send the screenshots to a subagent with this prompt (adapt from pptx skill):

```
Visually inspect these screenshots for user-visible defects. Compare against the
reference images in docs/reference/ where applicable.

Look for:
- Overlapping elements
- Text overflow or cut off
- Misaligned columns or cards
- Inconsistent spacing
- Low-contrast text
- Buttons or interactive elements that look unclickable
- Mobile: cards stack correctly, no horizontal scroll, accordion default-expanded card is correct

For each screenshot, list user-visible issues. Skip cosmetic nitpicks.
```

Fix issues in one cycle. **Stop after one fix-and-verify pass** unless a new user-visible defect appears.

---

## 13. Open questions — log here, don't block

If you encounter a decision this brief doesn't cover, log it here and proceed with the most defensible default. Surface the list to the user when the round wraps for review.

### Round 2 implementation log

- **Migration tooling.** Brief says `prisma migrate dev --name round2_full`. Project has been using `prisma db push` end-to-end (no `prisma/migrations/` directory; `CLAUDE.md` documents the prod deploy flow as `db push` over a temporarily-public Postgres URL). Stayed on `db push` to match existing conventions and the deploy story. Open: do you want to formally adopt migrations? That's a baselining task in its own right.

- **Strip card min-width.** Brief §6.3 specifies `min-width: 160px on desktop`. With the existing 240px CascadeNav, 7 cards at 160 + gaps overflowed at 1400px viewport. Reduced to 140 + added `overflow-x-auto` fallback. Logged in `NodeProgressionStrip.tsx` with a comment.

- **Status badge style.** Brief §6.3 specifies `rounded-full, padding 4px 10px, Outfit 10px bold`. At 140-150px card width, "AWAITING APPROVAL" exceeded card content width and broke the pill. Switched to `rounded-md` + 9px font + 0.03em letter-spacing + allow wrap to two lines. Square-corner badge on the strip cards.

- **Conflict-on-reupload (§7.11).** Brief specifies a server-side 409 with `?force=true` query param. Implemented client-side gating instead: when `currentVersion.docxOutOfSync === true` and admin chooses a fresh `.docx`, the upload is intercepted before hitting `/api/upload` and a confirm dialog is shown; on confirm the upload proceeds. End-user behavior is identical. The brief's pattern would require making the generic `/api/upload` route node-aware.

- **Lock In / Unlock dialog colors.** Brief §6.7 calls Unlock confirm "red-bordered". Implemented as a white button with `#c84a3c` text + 1px border (outline-style destructive), since "red-bordered" was ambiguous between full-fill and outline. Visually clearly destructive while keeping primary visual weight on Cancel.

- **Cascade auto-unlock applies even to already-flagged nodes.** Test case `(c.2)` in `cascade.test.ts`: an upstream revision unlocks a downstream that's already flagged AND locked-in. Reasoning: the upstream change invalidates the prior client approval regardless of whether the downstream's status transitions from this specific cascade. Made explicit so this is intentional.

- **Excluded-node semantics.** Brief §15 risk #6 says excluded nodes should be treated as "complete + locked in" for downstream resolution. The existing engine has no auto-unlocking based on dependency satisfaction (admins flip status manually). Implemented transitive-skip: cascade flag propagation passes _through_ an excluded node without flagging it, but continues recursion to its dependents. Covered by `cascade.test.ts:excluded nodes are transparent`.

- **Color-source divergence.** `colors.md` and brief §6.3 specify hex values that diverge slightly from existing `globals.css` CSS variables (e.g., `--otm-gold` is `#e9aa22` vs brief's `#e7a923`). Used the brief's hex literals for the new strip + lifecycle pill since the brief is canonical for those components. Existing components untouched.

- **`html-to-docx` brand fidelity.** Confirmed by §7.9 that brand colors / italic teal instruction text won't survive the conversion. Endpoint is wired and functional but produces plain-styled docx. Acceptable per the brief; flagged here so future work knows where to start (rebuild via the lower-level `docx` library if needed).

- **Last-login tracking.** Added `User.lastLoginAt` (not in brief) and update it on successful login. Required for the Users tab "Last login" column the brief specifies in §8.3.

---

## 14. Test credentials

```
Admin:  admin@meetotm.com / admin123
Client: client@example.com / client123
```

Generic placeholders. Never use real client emails in seed/test data.

---

## 15. Risks tracked

| # | Risk | Mitigation |
|---|------|------------|
| 1 | `html-to-docx` doesn't preserve OTM brand styling | Accept; document; one-session time-box on improvements |
| 2 | TipTap incompatibility with React 19 / Next 16 | 30-min spike before commit; Lexical fallback documented |
| 3 | Cascade auto-unlock + flag must be transactional | `prisma.$transaction([...])`; unit tests in §6.11 |
| 4 | Admin password reset endpoint is sensitive | Always validate session role; never accept userId from request body without verifying admin |
| 5 | Excluded nodes break cascade dependency math | Transitive skip in dependency resolution; explicit test in §8.8 acceptance |
| 6 | Local filesystem storage on Railway doesn't survive horizontal scaling | Out of scope this round; flag in `CLAUDE.md` |

---

## 16. Out-of-scope reminders

If you find yourself reaching for any of these, stop and confirm:

- Deck export (next round; helper from §7.10 is the foundation)
- Email notifications, ClickUp, n8n integrations
- NextAuth v5 migration
- Magic links / SSO
- S3 / R2 file storage
- KBI baseline + milestone UI
- Stage 2 / Stage 3 portal content beyond placeholders
- Telemetry / observability
- Automated test suite beyond `cascade.ts`
