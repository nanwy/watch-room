# Watch Room Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a private Next.js 16 watch room app with a central anime media library, synchronized multi-user playback, no-login nickname entry, and persistent realtime chat.

**Current Baseline Note:** The shadcn-generated monorepo already contains partial data/shared/scanner/room service code: Prisma product models in `packages/db/prisma/schema.prisma`, shared playback math and event schemas in `packages/shared/src`, early media scanner/import behavior in `packages/db/src/media-scanner.ts`, and early room creation/snapshot behavior in `packages/db/src/rooms.ts`. Future tasks must inspect and extend this code instead of blindly recreating or overwriting it.

**Architecture:** Use a pnpm workspace with `apps/web` for Next.js 16, `apps/realtime` for a dedicated Socket.IO Node service, `packages/db` for Prisma schema/client, and `packages/shared` for shared validation/types. PostgreSQL persists media metadata, rooms, playback state, chat messages, and member sessions; video files stay on a mounted VPS directory and are scanned into the library from `/data/imports`.

**Tech Stack:** Next.js 16 App Router, React, shadcn/ui, Tailwind CSS, Zustand, TanStack Query, Socket.IO, PostgreSQL, Prisma, Zod, Vitest, Playwright, Docker Compose, Caddy.

**Baseline note:** Phase 0 was completed against the actual shadcn-generated pnpm/turbo monorepo. Future work must preserve the generated workspace shape and package names: `web`, `realtime`, `@workspace/db`, `@workspace/shared`, `@workspace/ui`, `@workspace/eslint-config`, and `@workspace/typescript-config`. Do not rename packages to older `@watch-room/*` names.

**Prisma baseline:** The database package uses Prisma 6 so `packages/db/prisma/schema.prisma` can keep the conventional `datasource db { url = env("DATABASE_URL") }` configuration. Prisma client generation is owned by `@workspace/db`.

---

## File Structure

Use the generated shadcn monorepo structure as the baseline and add product files within it:

```text
.
├── apps/
│   ├── web/
│   │   ├── app/
│   │   │   ├── (admin)/admin/library/page.tsx
│   │   │   ├── (admin)/admin/rooms/new/page.tsx
│   │   │   ├── api/admin/import/scan/route.ts
│   │   │   ├── api/admin/rooms/route.ts
│   │   │   ├── api/media/[episodeId]/route.ts
│   │   │   ├── room/[slug]/page.tsx
│   │   │   ├── globals.css
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── components/
│   │   │   ├── admin/import-scan-button.tsx
│   │   │   ├── admin/library-table.tsx
│   │   │   ├── room/chat-panel.tsx
│   │   │   ├── room/episode-switcher.tsx
│   │   │   ├── room/join-room-form.tsx
│   │   │   ├── room/member-list.tsx
│   │   │   ├── room/playback-sync-provider.tsx
│   │   │   └── room/watch-player.tsx
│   │   ├── lib/
│   │   │   ├── admin-auth.ts
│   │   │   ├── media-url.ts
│   │   │   └── socket-client.ts
│   │   ├── package.json
│   │   ├── playwright.config.ts
│   │   ├── tailwind.config.ts
│   │   └── vitest.config.ts
│   └── realtime/
│       ├── src/
│       │   ├── chat.ts
│       │   ├── env.ts
│       │   ├── playback.ts
│       │   ├── server.ts
│       │   └── sessions.ts
│       ├── tests/
│       │   ├── chat.test.ts
│       │   ├── playback.test.ts
│       │   └── sessions.test.ts
│       ├── package.json
│       └── vitest.config.ts
├── packages/
│   ├── db/
│   │   ├── prisma/schema.prisma
│   │   ├── src/client.ts
│   │   ├── src/media-scanner.ts
│   │   ├── src/rooms.ts
│   │   ├── tests/media-scanner.test.ts
│   │   └── package.json
│   ├── eslint-config/
│   ├── typescript-config/
│   ├── ui/
│   └── shared/
│       ├── src/events.ts
│       ├── src/playback.ts
│       ├── src/validation.ts
│       ├── tests/playback.test.ts
│       └── package.json
├── docker/
│   └── Caddyfile
├── docs/superpowers/specs/2026-05-10-watch-room-design.md
├── docs/superpowers/plans/2026-05-10-watch-room.md
├── docker-compose.yml
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.json
├── turbo.json
└── .env.example
```

Keep shared business rules out of React components. Put event schemas and playback math in `packages/shared`, database access and scanner behavior in `packages/db`, and socket orchestration in `apps/realtime`.

## Task 1: Bootstrap Workspace and Tooling (Historical, Complete)

This task is historical for this repository. The workspace was bootstrapped by `pnpm dlx shadcn@latest init`, not by manually creating the older package layout. Treat the checked-in generated files as the source of truth.

All Task 1 checkbox steps are complete and retained only as bootstrap history. Do not execute them again.

**Files:**

- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `apps/web/package.json`
- Create: `apps/realtime/package.json`
- Create: `packages/db/package.json`
- Create: `packages/shared/package.json`

- [x] **Step 1: Create the pnpm workspace files**

Use these package boundaries:

```json
{
  "private": true,
  "scripts": {
    "dev": "pnpm -r --parallel dev",
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "lint": "pnpm -r lint",
    "typecheck": "pnpm -r typecheck",
    "db:generate": "pnpm --filter @workspace/db prisma generate",
    "db:migrate": "pnpm --filter @workspace/db prisma migrate dev"
  },
  "devDependencies": {
    "typescript": "^5.9.0"
  },
  "packageManager": "pnpm@10.0.0"
}
```

`pnpm-workspace.yaml`:

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

- [x] **Step 2: Add environment template**

`.env.example` must include:

```bash
DATABASE_URL="postgresql://watch:watch@localhost:5432/watch_room"
ADMIN_PASSCODE="change-me"
MEDIA_IMPORT_DIR="/data/imports"
MEDIA_STORAGE_DIR="/data/media"
NEXT_PUBLIC_REALTIME_URL="http://localhost:4001"
WEB_ORIGIN="http://localhost:3000"
PORT="4001"
```

- [x] **Step 3: Install dependencies**

Run:

```bash
pnpm install
pnpm --filter @workspace/shared add zod
pnpm --filter @workspace/shared add -D vitest
pnpm --filter @workspace/db add @prisma/client zod
pnpm --filter @workspace/db add -D prisma vitest tsx
pnpm --filter realtime add @workspace/db @workspace/shared socket.io zod dotenv
pnpm --filter realtime add -D vitest tsx
pnpm --filter web add next@16 react react-dom @workspace/db @workspace/shared @tanstack/react-query zustand socket.io-client zod lucide-react
pnpm --filter web add -D tailwindcss postcss autoprefixer vitest @vitejs/plugin-react playwright
```

Expected: lockfile is created and all workspace packages install.

- [x] **Step 4: Verify workspace scripts**

Run:

```bash
pnpm -r typecheck
```

Expected: the command may initially report no source files for empty packages; it must not fail because of malformed package configuration.

- [x] **Step 5: Commit**

```bash
git add package.json pnpm-workspace.yaml tsconfig.base.json .gitignore .env.example apps packages pnpm-lock.yaml
git commit -m "chore: bootstrap watch room workspace"
```

## Next Active Task: Phase 1 / Data and Shared Domain

Continue with Task 2 as Phase 1 work. The next worker must validate and extend the existing `packages/db` and `packages/shared` code against the spec, not repeat bootstrap setup or blindly recreate files that already exist.

## Task 2: Add Prisma Schema and Shared Playback Rules

Phase 1 validation starts here. Before adding or replacing code, inspect the existing Prisma schema, shared playback math, event schemas, and validation files, then add missing tests and fill implementation gaps against the design spec. Treat the checked-in Phase 1 domain code as partial work to review and extend, not absent work to recreate.

**Files:**

- Inspect/modify: `packages/db/prisma/schema.prisma`
- Inspect/modify: `packages/db/src/client.ts`
- Inspect/modify: `packages/shared/src/playback.ts`
- Inspect/modify: `packages/shared/src/events.ts`
- Inspect/modify: `packages/shared/src/validation.ts`
- Create/modify: `packages/shared/tests/playback.test.ts`

- [ ] **Step 1: Add or verify playback math tests**

Add `packages/shared/tests/playback.test.ts` if it is missing, or review and extend the existing test file:

```ts
import { describe, expect, it } from "vitest";
import { calculateEffectivePosition } from "../src/playback";

describe("calculateEffectivePosition", () => {
  it("keeps paused rooms at the stored position", () => {
    expect(
      calculateEffectivePosition({
        status: "paused",
        positionSeconds: 42,
        playbackRate: 2,
        updatedAtMs: 1_000,
        nowMs: 6_000,
      }),
    ).toBe(42);
  });

  it("advances playing rooms by elapsed time and playback rate", () => {
    expect(
      calculateEffectivePosition({
        status: "playing",
        positionSeconds: 10,
        playbackRate: 1.5,
        updatedAtMs: 1_000,
        nowMs: 5_000,
      }),
    ).toBe(16);
  });
});
```

- [ ] **Step 2: Run playback tests against the current baseline**

Run:

```bash
pnpm --filter @workspace/shared test -- playback.test.ts
```

Expected: tests should either pass or expose specific gaps in the existing shared playback implementation. Use any failures to guide the next implementation step.

- [ ] **Step 3: Review and complete shared playback and event schemas**

`packages/shared/src/playback.ts`:

```ts
export type PlaybackStatus = "playing" | "paused";

export function calculateEffectivePosition(input: {
  status: PlaybackStatus;
  positionSeconds: number;
  playbackRate: number;
  updatedAtMs: number;
  nowMs: number;
}) {
  if (input.status === "paused") return input.positionSeconds;
  const elapsedSeconds = Math.max(0, input.nowMs - input.updatedAtMs) / 1000;
  return input.positionSeconds + elapsedSeconds * input.playbackRate;
}
```

`packages/shared/src/events.ts` should export Zod schemas for `joinRoom`, `chatMessage`, and playback control events. Preserve existing compatible exports and extend them where the spec requires more coverage.

- [ ] **Step 4: Review and complete Prisma schema**

Ensure `packages/db/prisma/schema.prisma` defines `Anime`, `Episode`, `Room`, `RoomPlaybackState`, `ChatMessage`, and `RoomMemberSession` matching the design spec. Use PostgreSQL, cuid IDs, indexes on `Room.slug`, `Episode.animeId`, `ChatMessage.roomId/createdAt`, and unique room playback state by `roomId`.

- [ ] **Step 5: Generate Prisma client**

Run:

```bash
pnpm --filter @workspace/db prisma generate
```

Expected: Prisma client generated successfully.

- [ ] **Step 6: Run tests**

Run:

```bash
pnpm --filter @workspace/shared test
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/db packages/shared
git commit -m "feat: add data model and playback rules"
```

## Task 3: Implement Media Scanner

The repository already contains an early media scanner. Review its current parsing, import behavior, and database interactions before changing it. Add missing tests first, then extend the existing scanner instead of replacing it wholesale unless the existing shape is incompatible with the spec.

**Files:**

- Inspect/modify: `packages/db/src/media-scanner.ts`
- Create/modify: `packages/db/tests/media-scanner.test.ts`
- Modify: `packages/db/src/client.ts`

- [ ] **Step 1: Add or extend scanner tests**

Test these cases:

- First-level directory becomes anime title.
- Video files become episodes.
- Episode number is parsed from `S01E02.mp4` and `02.mp4`.
- Unsupported files are ignored.
- Duplicate anime/episode normalized keys are skipped.

Use temporary directories from Node's `fs.mkdtemp`.

- [ ] **Step 2: Run scanner tests against the current baseline**

Run:

```bash
pnpm --filter @workspace/db test -- media-scanner.test.ts
```

Expected: tests should either pass or expose specific gaps in the existing media scanner. Use any failures to guide the implementation step.

- [ ] **Step 3: Review and complete scanner as pure discovery plus import action**

`discoverImportCandidates(importDir)` should return parsed candidates without touching the database.

`importCandidates(candidates, mediaStorageDir, prisma)` should create database rows and move or hard-link files into `/data/media/anime_<id>/episode_<id>.<ext>`.

Keep file parsing deterministic:

```ts
const SUPPORTED_EXTENSIONS = new Set([".mp4", ".webm", ".mkv", ".mov"]);
```

- [ ] **Step 4: Run scanner tests**

Run:

```bash
pnpm --filter @workspace/db test -- media-scanner.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/db/src/media-scanner.ts packages/db/tests/media-scanner.test.ts
git commit -m "feat: add media import scanner"
```

## Task 4: Build Next.js App Shell and shadcn/ui

**Files:**

- Create: `apps/web/app/layout.tsx`
- Create: `apps/web/app/page.tsx`
- Create: `apps/web/app/globals.css`
- Create: `apps/web/components/ui/*`
- Create: `apps/web/lib/admin-auth.ts`
- Modify: `apps/web/package.json`
- Modify: `apps/web/tailwind.config.ts`

- [ ] **Step 1: Initialize Next.js 16 app files**

Create a minimal App Router shell. The home page should link to media library management and room creation.

- [ ] **Step 2: Install and initialize shadcn/ui**

Run from `apps/web`:

```bash
pnpm dlx shadcn@latest init
pnpm dlx shadcn@latest add button input card table badge select textarea scroll-area
```

Expected: shadcn components are generated under `apps/web/components/ui`.

- [ ] **Step 3: Add admin passcode helper**

`apps/web/lib/admin-auth.ts` should expose a function that checks an `x-admin-passcode` header against `process.env.ADMIN_PASSCODE`. Use it in admin APIs only; do not add accounts.

- [ ] **Step 4: Run checks**

Run:

```bash
pnpm --filter web typecheck
pnpm --filter web lint
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web
git commit -m "feat: add Next.js shell and shadcn ui"
```

## Task 5: Add Media Library Management

**Files:**

- Create: `apps/web/app/(admin)/admin/library/page.tsx`
- Create: `apps/web/app/api/admin/import/scan/route.ts`
- Create: `apps/web/components/admin/import-scan-button.tsx`
- Create: `apps/web/components/admin/library-table.tsx`

- [ ] **Step 1: Write API tests or route-level tests for admin protection**

Test that scan import rejects missing or wrong `x-admin-passcode` and accepts the configured passcode.

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
pnpm --filter web test -- admin
```

Expected: FAIL before route exists.

- [ ] **Step 3: Implement scan route**

`POST /api/admin/import/scan` should:

1. Validate admin passcode.
2. Read `MEDIA_IMPORT_DIR` and `MEDIA_STORAGE_DIR`.
3. Call the scanner.
4. Return counts for imported, skipped, and conflicted files.

- [ ] **Step 4: Implement library page**

Show anime and episode rows with shadcn table components. Include scan button with a passcode input. Keep the UI operational and compact; this is an admin tool, not a marketing page.

- [ ] **Step 5: Run checks**

Run:

```bash
pnpm --filter web test
pnpm --filter web typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/app apps/web/components/admin apps/web/lib
git commit -m "feat: add media library management"
```

## Task 6: Add Room Creation

The repository already contains an early room service. Review its transaction boundaries, relationship validation, slug behavior, and playback-state initialization before changing it. Add missing tests first, then extend the existing service and web route/page to match the spec.

**Files:**

- Inspect/modify: `packages/db/src/rooms.ts`
- Create/modify: `packages/db/tests/rooms.test.ts`
- Create: `apps/web/app/(admin)/admin/rooms/new/page.tsx`
- Create: `apps/web/app/api/admin/rooms/route.ts`

- [ ] **Step 1: Write room creation tests**

Test that creating a room:

- Requires an existing episode.
- Creates `Room`.
- Creates initial `RoomPlaybackState` with `paused`, position `0`, rate `1`.
- Returns a stable shareable `slug`.

- [ ] **Step 2: Run room tests against the current baseline**

Run:

```bash
pnpm --filter @workspace/db test -- rooms.test.ts
```

Expected: tests should either pass or expose specific gaps in the existing room service. Use any failures to guide the implementation step.

- [ ] **Step 3: Review and complete room service**

`createRoom({ animeId, episodeId })` should validate relationships and create room plus playback state in a transaction.

- [ ] **Step 4: Implement room creation API and page**

Admin page lists anime and episodes, then creates a room. The result displays `/room/{slug}`.

- [ ] **Step 5: Run checks**

Run:

```bash
pnpm --filter @workspace/db test
pnpm --filter web typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/db/src/rooms.ts apps/web/app
git commit -m "feat: add room creation"
```

## Task 7: Implement Realtime Socket Service

**Files:**

- Create: `apps/realtime/src/env.ts`
- Create: `apps/realtime/src/server.ts`
- Create: `apps/realtime/src/playback.ts`
- Create: `apps/realtime/src/chat.ts`
- Create: `apps/realtime/src/sessions.ts`
- Create: `apps/realtime/tests/playback.test.ts`
- Create: `apps/realtime/tests/chat.test.ts`
- Create: `apps/realtime/tests/sessions.test.ts`

- [ ] **Step 1: Write unit tests for socket handlers without network**

Test pure service functions:

- Join returns current room state, members, and latest 100 messages.
- Chat rejects empty and overlong messages.
- Playback rejects invalid episode switches.
- Playback updates state with last valid event.

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
pnpm --filter realtime test
```

Expected: FAIL before service functions exist.

- [ ] **Step 3: Implement service modules**

Keep socket transport thin. `server.ts` should bind event names to functions from `playback.ts`, `chat.ts`, and `sessions.ts`.

Events:

```ts
"room:join"
"room:state"
"room:members"
"chat:send"
"chat:message"
"playback:control"
"playback:state"
```

- [ ] **Step 4: Run realtime tests**

Run:

```bash
pnpm --filter realtime test
pnpm --filter realtime typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/realtime packages/shared/src/events.ts
git commit -m "feat: add realtime room service"
```

## Task 8: Build Watch Room UI

**Files:**

- Create: `apps/web/app/room/[slug]/page.tsx`
- Create: `apps/web/components/room/join-room-form.tsx`
- Create: `apps/web/components/room/playback-sync-provider.tsx`
- Create: `apps/web/components/room/watch-player.tsx`
- Create: `apps/web/components/room/chat-panel.tsx`
- Create: `apps/web/components/room/member-list.tsx`
- Create: `apps/web/components/room/episode-switcher.tsx`
- Create: `apps/web/lib/socket-client.ts`
- Create: `apps/web/lib/media-url.ts`

- [ ] **Step 1: Write component tests for client identity**

Test that `clientId` is created once and reused from `localStorage`.

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
pnpm --filter web test -- room
```

Expected: FAIL before room components exist.

- [ ] **Step 3: Implement join flow**

Room page loads initial room metadata by slug. If no nickname is present, show join form. Store nickname and generated `clientId` in local storage after submit.

- [ ] **Step 4: Implement player synchronization**

Use the HTML `<video>` element. On local controls, emit playback control events. On remote authoritative state, update source, playback rate, paused/playing state, and seek when drift exceeds 1.5 seconds.

- [ ] **Step 5: Implement chat and member list**

Chat panel should render recent messages, send new messages, and show reconnecting state. Member list should show online nicknames from socket state.

- [ ] **Step 6: Run checks**

Run:

```bash
pnpm --filter web test
pnpm --filter web typecheck
pnpm --filter web lint
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/web/app/room apps/web/components/room apps/web/lib
git commit -m "feat: add synchronized watch room ui"
```

## Task 9: Serve Media Files

**Files:**

- Create: `apps/web/app/api/media/[episodeId]/route.ts`
- Modify: `apps/web/lib/media-url.ts`

- [ ] **Step 1: Write route tests for media lookup**

Test that the media route:

- Returns 404 for unknown episode.
- Returns 404 for missing file.
- Sets content type for known episode.
- Supports range requests if feasible in this task.

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
pnpm --filter web test -- media
```

Expected: FAIL before route exists.

- [ ] **Step 3: Implement media route**

Read the episode by ID, resolve `storagePath`, ensure it stays under `MEDIA_STORAGE_DIR`, and stream the file. Implement HTTP range support because video seeking depends on it.

- [ ] **Step 4: Run checks**

Run:

```bash
pnpm --filter web test
pnpm --filter web typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/api/media apps/web/lib/media-url.ts
git commit -m "feat: serve episode media with range support"
```

## Task 10: Add Docker Compose and Proxy

**Files:**

- Create: `docker-compose.yml`
- Create: `docker/Caddyfile`
- Create: `apps/web/Dockerfile`
- Create: `apps/realtime/Dockerfile`
- Modify: `.env.example`

- [ ] **Step 1: Add Compose services**

Compose should define `web`, `realtime`, `postgres`, and `proxy`. Mount host directories:

```yaml
volumes:
  - ./data/imports:/data/imports
  - ./data/media:/data/media
```

- [ ] **Step 2: Add Caddy routes**

Route `/socket.io/*` to realtime, everything else to web. Keep media served by the web route first, since the app route implements range support and path validation.

- [ ] **Step 3: Build containers**

Run:

```bash
docker compose build
```

Expected: all images build.

- [ ] **Step 4: Start stack**

Run:

```bash
docker compose up -d
docker compose ps
```

Expected: all services are healthy or running.

- [ ] **Step 5: Commit**

```bash
git add docker-compose.yml docker apps/web/Dockerfile apps/realtime/Dockerfile .env.example
git commit -m "chore: add single-server deployment"
```

## Task 11: End-to-End Verification

**Files:**

- Create: `apps/web/e2e/watch-room.spec.ts`
- Modify: `apps/web/playwright.config.ts`
- Create: `scripts/seed-demo-media.ts`

- [ ] **Step 1: Add demo media seed script**

Create a tiny browser-playable sample media fixture or document how to place a local test MP4 under `data/imports/Test Anime/01.mp4`. Do not commit large video files.

- [ ] **Step 2: Write Playwright flow**

Test:

1. Scan import.
2. Create room.
3. Open two browser contexts.
4. Join with two nicknames.
5. Send chat from one context and see it in the other.
6. Trigger play/pause/seek and observe synchronized state.

- [ ] **Step 3: Run full checks**

Run:

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm --filter web exec playwright test
```

Expected: PASS.

- [ ] **Step 4: Manual verification**

Open two browser sessions at the generated room URL. Verify playback controls, chat, refresh recovery, and disconnect/reconnect behavior.

- [ ] **Step 5: Commit**

```bash
git add apps/web/e2e apps/web/playwright.config.ts scripts
git commit -m "test: add watch room end-to-end coverage"
```

## Implementation Notes

- Do not implement browser uploads in the first version.
- Do not add user accounts.
- Keep all room members able to control playback.
- Use Zustand for complex client-side room and realtime state.
- Use TanStack Query for API reads and mutations.
- Use `ADMIN_PASSCODE` only for management pages and mutation APIs.
- Keep video files outside the database.
- Prefer pure unit tests for playback math, event validation, scanner parsing, and service decisions before wiring UI.
- Use Playwright only after the main flows exist.
- Avoid committing large media fixtures.

## Final Verification

Before declaring the feature complete, run:

```bash
pnpm test
pnpm typecheck
pnpm lint
docker compose build
docker compose up -d
docker compose ps
```

Then verify manually with two browser sessions:

- Import one anime with at least two episodes.
- Create a room.
- Join with two nicknames.
- Send chat both directions.
- Play, pause, seek, change speed, switch episode, and switch anime.
- Refresh one browser and confirm recent chat plus current playback state return.
- Stop and restart the realtime service and confirm the client reconnects.
