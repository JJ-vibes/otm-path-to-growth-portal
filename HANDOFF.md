# Handoff brief — OTM portal, Round 2 + follow-ups

> Paste this into a new Claude Code chat to pick up where we left off. Pair with `CLAUDE.md`, `AGENTS.md`, `PROJECT_BRIEF_R2.md`, and `PLATFORM_OVERVIEW.md`.

**Repo:** `oldtownmedia/otm-path-to-growth-portal` · `main`
**Live:** https://otm-path-to-growth-portal-production.up.railway.app
**Latest commit at handoff:** `16ac0c5`

---

## Critical context the agent must internalize first

1. **This is Next.js 16 with Turbopack.** Read `AGENTS.md`. APIs differ from training data.
   - `proxy.ts` not `middleware.ts` (export is `proxy()` not `middleware()`)
   - **Any `useSearchParams()` in a client tree must be wrapped in `<Suspense>` at the page level**, otherwise the production build fails (`/portal/strategy` already hit this). Run `npx next build` locally before pushing — dev mode does NOT catch this.
   - Prisma 7 needs the `@prisma/adapter-pg` driver adapter pattern
   - Prisma client lives at `src/generated/prisma/client.ts` (gitignored)

2. **Production schema pushes:** run `npm run db:push:prod`. The public Railway URL is in `.env.railway` (gitignored). **Do not** ask the user to enable/disable public networking — it stays enabled.

3. **User's collaboration preferences (from memory):**
   - Make decisions and act; only ask the user when their physical action is required.
   - Never use real client emails in seed/test data — `client@example.com` style placeholders only.
   - User does not use AskUserQuestion — ask in plain text.
   - Terse responses. End-of-turn = 1-2 sentences.
   - Don't add comments unless they explain non-obvious WHY.

4. **Multi-step DB writes must use `prisma.$transaction([...])`.** A real bug bit us: the original `/api/engagements` POST did 10+ sequential creates without a transaction; partial failures left orphaned engagements while the client saw "Failed to create". Now wrapped. Apply the same pattern to any new multi-write endpoint.

5. **`next build` before pushing.** Two prod-only failures slipped through dev: the Prisma JSON type error (commit `6ae3e04`), the Suspense bailout (commit `928732e`). Both would have been caught by a local `next build`. Make this part of the loop.

---

## What's been done since the original Round 2 ship

The original Round 2 brief (`PROJECT_BRIEF_R2.md`) is fully implemented. Commits since the main Round 2 commit:

| Commit | Why |
|---|---|
| `d9ddcb6` | Original Round 2 (lock-in, strip, TipTap, admin tabs, cascade auto-unlock, etc.) |
| `6ae3e04` | TS build fix — Prisma `InputJsonValue` typing, `lockedIn` plumbing |
| `128e88b` | `npm run db:push:prod` script + `.env.railway` workflow |
| `3a54b23` | Visual QA fix — strip card overflow at desktop |
| `5b4c81a` | YOU ARE HERE pill repositioned to bottom (gold-bordered TRACTION rect); CascadeNav locked-in/in-progress visuals; **dropped Assets feature entirely** (per user); deleted dead `LifecycleBar.tsx` and `StageCard.tsx` |
| `24fb0b2` | `/portal/strategy?node=<key>` URL routing for browser back nav |
| `5a8b97e` | Engagement create wrapped in `$transaction`; admin DELETE endpoint with type-to-confirm |
| `928732e` | Suspense boundary around `useSearchParams` (fixed broken prod build) |
| `16ac0c5` | Shared `AdminTopBar` across all `/admin/*` pages; TipTap placeholder + click-anywhere-to-focus |

### Visual QA pass also ran
Compared screenshots at desktop + mobile against `docs/reference/`. Only one defect was found and fixed (strip overflow). Reference images all match.

### Open questions log
See `PROJECT_BRIEF_R2.md §13` — 10 documented deviations from the original brief, each with rationale (e.g., kept `db push` instead of `migrate dev`, status-badge sizing reduced from spec, conflict-on-reupload guarded client-side instead of server 409).

---

## What's still pending

### 1. Logo upload — keep or drop? (decision, not work)
The user has now asked twice what the Branding-tab logo upload is for. They previously asked the same about Assets and we ripped it out. They haven't yet said "remove" for logo. I last asked, no answer yet. **Default if user pushes: rip it out the same way.**

What removal would entail:
- Drop `Engagement.clientLogoUrl` column (push schema local + prod)
- Remove `BrandingTab.tsx` and the `Branding` tab from `/admin/engagements/[id]/page.tsx`
- Remove the `clientLogoUrl` rendering in `TopBar.tsx`
- Remove the `/api/admin/engagements/[id]/logo` route
- Remove the `clientLogoUrl` field from `getEngagementFresh` and `Engagement` interface in `src/data/engagement.ts`

### 2. Production deploy timing
Latest commits push triggers Railway redeploy. After `16ac0c5` lands the user should be able to:
- Click "Prove the Strategy" and have it actually load (was failing on broken build pre-`928732e`)
- See the new admin top nav
- Type into Internal Notes (placeholder + click-to-focus)

Tell user to hard-refresh once Railway shows the deploy as Active.

### 3. Things the user asked about but I haven't tackled yet
None pending as of `16ac0c5`. Last user message was the multi-question one I just answered. Wait for next ask.

---

## Risks / things to watch

1. **Railway build can silently fail and leave prod on the old code.** The user described "Prove the Strategy isn't loading" symptom; root cause was a build failure 4 commits back. If a deploy fails, ask the user to check Railway's deploy log. The build runs `prisma generate && next build` — both can fail.

2. **`useSearchParams`, `useRouter`, `usePathname` in client components require Suspense at page level.** When adding new client routing logic, check `next build` output.

3. **`prisma.$transaction` is required for multi-write API routes.** Existing routes that do multiple `prisma.x.create()`/`update()` calls without a transaction are bugs waiting to happen. Audit:
   - `src/app/api/admin/engagements/[id]/users/route.ts` — POST does `user.create` then `engagementUser.upsert` — partial failure could leak. Low impact.
   - `src/lib/data-store.ts:applyCascadeResults` — already uses `$transaction`. Good.
   - `src/lib/data-store.ts:updateNode` — does multiple writes (mark old version not-current, create new version, create sections). NOT in a transaction. Real risk: a publish failing mid-way could leave two `isCurrent: true` versions or sections without parent. **Worth fixing.**

4. **`html-to-docx` does not preserve OTM brand styling.** Documented in `PROJECT_BRIEF_R2.md §13`. The regenerated `.docx` files are plain-styled. If the user starts using this feature heavily, they'll notice.

5. **`updateNode` in `src/lib/data-store.ts` always sets `docxOutOfSync = true`** unless `documentUrl` is being updated. If admin clicks "Save" on a section with no actual content change, this still flips the flag. Probably fine but worth knowing.

6. **Single Railway region, no documented backup story.** Not addressed in this round. Mentioned in `PLATFORM_OVERVIEW.md §8` as a constraint.

7. **No telemetry / observability.** Same — flagged but not built.

8. **Build artifacts (`/uploads/`) live on the Railway filesystem.** Will not survive moving off Railway or horizontal scale. Out of scope for now; flagged in `PROJECT_BRIEF_R2.md §15`.

---

## Working environment notes

- **Test creds:** `admin@meetotm.com` / `admin123`, `client@example.com` / `client123`
- **Local dev:** `npm run dev` (Turbopack); local Prisma Postgres via `npx prisma dev --non-interactive`
- **Tests:** `npm test` (Vitest, 7 cascade.ts tests)
- **Memory dir:** `/Users/dee/.claude/projects/-Users-dee-GitHub-otm-path-to-growth-portal/memory/` — has `feedback_real_data.md`, `feedback_autonomous.md`, `project_overview.md`, `project_railway_db_push.md`. Read `MEMORY.md` first.
- **Working tree on handoff:** clean, in sync with `origin/main`.

---

## How to start in a fresh chat

1. `git log --oneline -15` — see context up to `16ac0c5`.
2. Read `CLAUDE.md`, `AGENTS.md`, `PROJECT_BRIEF_R2.md` (especially §13 open questions).
3. Read this file.
4. Wait for the user's next ask. They were last weighing the logo-upload decision.

If they say "delete the logo thing": follow the bullet list in §1 above, push, run `npm run db:push:prod`.

If they ask anything else: standard flow — verify locally with `next build`, push, refresh prod.
