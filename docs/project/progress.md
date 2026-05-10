# Watch Room Progress

Last updated: 2026-05-10 20:45 CST

## Current Status

The product requirements are confirmed. The project has been created as a shadcn/ui monorepo with a Next.js 16 web app, shared UI package, database package, shared types package, and realtime service package.

Phase 0 baseline cleanup is complete. The committed baseline also already contains partial product-domain work in the data/shared layers and early database services. Treat that code as existing Phase 1/2/3 work that needs validation and review, not as pending work to recreate.

Current branch: `codex/watch-room`

## Confirmed Product Decisions

- Private watch room for the owner and trusted friends.
- No public account system.
- Friends join a room by opening a shared link and entering a nickname.
- Browser stores a local `clientId` for reconnect identity.
- All room members can control playback.
- Server keeps authoritative playback state.
- Last valid playback control event received by the server wins.
- Chat is realtime and persisted.
- Joining, refreshing, or reconnecting loads current playback state and recent chat history.
- Media is organized as anime series and episodes.
- Media files are placed on the server before import.
- Import flow scans a server folder instead of uploading large files through the browser.
- Admin/media management is protected by a single `ADMIN_PASSCODE`, not full login.
- Browser playback expects MP4/WebM first; MKV may be detected but not transcoded.

## Confirmed Technical Decisions

- App framework: Next.js 16 with App Router.
- UI: shadcn/ui.
- Monorepo: shadcn-generated pnpm/turbo workspace.
- Database: PostgreSQL.
- ORM: Prisma.
- Realtime: Socket.IO in a separate Node service.
- Complex client state: Zustand.
- API/query/mutation layer: TanStack Query.
- Deployment target: single VPS.
- Deployment shape: Docker Compose.
- Reverse proxy: Caddy or Nginx, with Caddy preferred unless a later deployment constraint changes this.
- Media storage: local VPS disk mount.

## Repository State

The project currently contains:

- `apps/web`: Next.js 16 web app.
- `apps/realtime`: Node/Socket.IO service shell.
- `packages/ui`: shadcn/ui component package.
- `packages/db`: Prisma/database package.
- `packages/shared`: shared validation and playback/event types.
- `docs/superpowers/specs/2026-05-10-watch-room-design.md`: approved design spec.
- `docs/superpowers/plans/2026-05-10-watch-room.md`: initial implementation plan.

The generated project has a clean baseline committed on this branch, with partial product-domain artifacts already present.

## Known Technical Issues

- Prisma has been pinned to Prisma 6 in `@workspace/db` so `schema.prisma` can keep the conventional `DATABASE_URL` datasource.
- `pnpm typecheck` passes across the workspace.
- `pnpm lint` passes across the workspace.
- The previous plan used package names like `@watch-room/*`; the plan has been updated so future work follows the generated `@workspace/*`, `web`, and `realtime` package names.
- Product-domain code already exists in the baseline:
  - `packages/db/prisma/schema.prisma` defines `Anime`, `Episode`, `Room`, `RoomPlaybackState`, `ChatMessage`, and `RoomMemberSession`.
  - `packages/shared/src/playback.ts` implements playback position and drift helper logic.
  - `packages/shared/src/events.ts` implements room join, chat message, and playback control schemas.
  - `packages/db/src/media-scanner.ts` implements early scanner/import behavior.
  - `packages/db/src/rooms.ts` implements early room creation and snapshot behavior.
- This existing domain code still needs focused tests and review before Phase 1/2/3 are marked complete.
- Media import duplicate detection now persists normalized anime and episode keys plus source paths, so duplicate checks survive separate scan/import runs.
- Room anime/episode consistency is enforced through `packages/db/src/rooms.ts` service helpers for room creation, room selection updates, and playback-state updates. Direct Prisma writes can still bypass this invariant until a later migration adds schema-level composite relations.

## Timeline

### 2026-05-10

- Requirements gathered:
  - Central anime media library.
  - Watch rooms created from existing media.
  - Shared room links.
  - Nickname-only room joining.
  - Multi-user playback control.
  - Realtime chat with history.
  - No broad public-user system.
- Architecture selected:
  - Next.js 16, shadcn/ui, PostgreSQL, Prisma, Socket.IO, Docker Compose, VPS.
- Design spec written:
  - `docs/superpowers/specs/2026-05-10-watch-room-design.md`
- Initial implementation plan written:
  - `docs/superpowers/plans/2026-05-10-watch-room.md`
- User simplified bootstrap direction:
  - Use `pnpm dlx shadcn@latest init` generated project instead of hand-building workspace from scratch.
- User added technical constraints:
  - Use Zustand for complex client state.
  - Use TanStack Query for API queries and mutations.
- Current progress document created:
  - `docs/project/progress.md`
- Phase 0 baseline cleanup completed:
  - Prisma downgraded/aligned to Prisma 6 in `@workspace/db`.
  - Prisma client generation verified.
  - Web dependencies include Zustand and TanStack Query.
  - Root flat ESLint config added for non-UI packages.
  - Generated shadcn UI typecheck issues fixed.
  - `pnpm install`, `pnpm typecheck`, and `pnpm lint` verified.
- Baseline state corrected:
  - Existing Prisma schema, shared playback/event code, media scanner, and room service code are now tracked as partial Phase 1/2/3 progress instead of ignored baseline contents.
- Domain baseline hardened:
  - Added focused shared playback and event validation tests.
  - Added focused media scanner/import tests for normalized duplicates and failed-write storage cleanup.
  - Added compensation for newly created anime rows when media storage preparation fails.
  - Added focused room service tests for anime/episode consistency on room and playback updates.
  - Added persisted normalized import keys and source-path tracking to the Prisma schema.

## Todo

### Phase 0: Baseline Cleanup

- [x] Commit the generated shadcn/Next.js monorepo baseline.
- [x] Update implementation plan to match actual package names and structure:
  - `web`
  - `realtime`
  - `@workspace/db`
  - `@workspace/shared`
  - `@workspace/ui`
- [x] Add Zustand and TanStack Query to the documented architecture.
- [x] Decide Prisma version path:
  - Selected Prisma 6 for simpler conventional `schema.prisma` setup.
- [x] Restore green baseline:
  - `pnpm install`
  - `pnpm typecheck`
  - `pnpm lint`

### Phase 1: Data and Shared Domain

- [x] Add initial Prisma schema for:
  - `Anime`
  - `Episode`
  - `Room`
  - `RoomPlaybackState`
  - `ChatMessage`
  - `RoomMemberSession`
- [x] Review/finalize Prisma schema against the design spec and migration expectations:
  - Normalized anime/episode import keys and source-path uniqueness added for duplicate prevention.
  - Room/playback anime/episode consistency documented as a service-level invariant for now.
- [x] Generate Prisma client successfully.
- [x] Add shared playback math:
  - effective position calculation
  - drift correction threshold
- [x] Add shared Zod schemas for:
  - room join
  - chat message
  - playback controls
- [x] Add/verify unit tests for playback math and validation.
- [x] Review shared schema/event exports for realtime and web API compatibility.

### Phase 2: Media Library

- [x] Add early server folder scanner/import implementation.
- [x] Parse anime from first-level folder names.
- [x] Parse episodes from supported video files.
- [x] Detect episode number from filenames when possible.
- [x] Skip unsupported files.
- [x] Prevent duplicate anime/episode imports.
- [x] Review scanner/import boundaries, path handling, duplicate behavior, and storage semantics before marking Phase 2 complete.
- [x] Add/verify media scanner tests.
- [x] Add admin scan API protected by `ADMIN_PASSCODE`.
- [x] Build media library admin page with shadcn/ui.

### Phase 3: Room Creation

- [x] Add early room creation service.
- [x] Create room with initial paused playback state.
- [x] Review room service boundaries, snapshot shape, slug behavior, and transaction assumptions before marking Phase 3 complete.
- [x] Add/verify room service tests.
- [x] Add admin room creation API.
- [x] Build room creation page using TanStack Query mutations.
- [x] Display shareable room URL.

### Phase 4: Realtime Service

- [x] Implement Socket.IO server.
- [x] Implement nickname/clientId room join.
- [x] Track online member sessions.
- [x] Broadcast member list updates.
- [x] Persist and broadcast chat messages.
- [x] Load recent 100 chat messages on join/reconnect.
- [x] Validate playback control events.
- [x] Persist authoritative playback state.
- [x] Broadcast playback state updates.

### Phase 5: Watch Room UI

- [x] Build nickname join flow.
- [x] Store `clientId` and nickname locally.
- [x] Add TanStack Query provider.
- [x] Add Zustand store for room UI/realtime state.
- [x] Build video player with synchronized controls.
- [x] Build anime/episode switcher.
- [x] Build chat panel.
- [x] Build online member list.
- [x] Show reconnecting/disconnected states.
- [x] Correct playback drift over threshold.

### Phase 6: Media Serving

- [x] Add episode media route.
- [x] Validate file path stays inside media directory.
- [x] Return correct content type.
- [x] Implement HTTP range requests for seeking.
- [x] Show unsupported/missing media states in room UI.

### Phase 7: Deployment

- [x] Add Dockerfile for web app.
- [x] Add Dockerfile for realtime service.
- [x] Add Docker Compose services:
  - web
  - realtime
  - postgres
  - proxy
- [x] Mount media directories:
  - `/data/imports`
  - `/data/media`
- [x] Add Caddy reverse proxy config.
- [x] Document VPS environment setup.

### Phase 8: Verification

- [x] Unit tests pass.
- [x] Typecheck passes.
- [x] Lint passes.
- [ ] Docker Compose builds. (manual: requires Docker installed on host)
- [ ] Two browser sessions can join the same room. (manual via Playwright e2e or hand-driven check)
- [ ] Chat syncs both ways. (manual)
- [ ] Playback controls sync both ways. (manual)
- [ ] Episode switching syncs. (manual)
- [ ] Refresh/reconnect restores playback state and recent chat. (manual)

## Immediate Next Step

Phases 4–7 implementation work is complete. Phase 8 acceptance work that requires running services (Docker build, two-browser sync via Playwright) is left as a manual verification step on the deployment host:

- Run `docker compose build` once Docker is available on the target VPS.
- Place an MP4 under `MEDIA_IMPORT_DIR/<动漫名>/<剧集>.mp4`, start `apps/web` and `apps/realtime`, and either:
  - run `pnpm --filter web e2e` for the Playwright two-browser smoke test, or
  - open the room URL in two browser windows and exercise chat / play / pause / seek / episode switch / reconnect manually.

### 2026-05-10 (Phase 4–7 implementation)

- Realtime hardening: introduced `broadcastMembersAfterDisconnect` and removed the legacy `disconnectSocketSession` so the online member list refreshes when sockets drop.
- Public room snapshot API (`GET /api/rooms/[slug]/snapshot`) added so the SSR room page can hydrate by slug without admin auth.
- Browser identity (`apps/web/lib/client-id.ts`), socket factory (`socket-client.ts`), and media URL helper (`media-url.ts`) added with unit tests.
- Zustand room store (`apps/web/store/room-store.ts`) holds connection status, room snapshot, playback state, members, and chat history (capped at 100).
- Room page (`/room/[slug]`) renders nickname join flow first, then a connected room shell with `WatchPlayer` (drift-corrected video at 1.5 s threshold), `MemberList`, `ConnectionStatus`, `ChatPanel`, and `EpisodeSwitcher` (uses `/api/library`).
- Media streaming route (`/api/media/[episodeId]`) supports HTTP Range with traversal protection.
- UI copy across admin and room surfaces now Chinese-first.
- Docker Compose deployment files added: per-app Dockerfiles, `docker-compose.yml`, `docker/Caddyfile`, deployment notes.
- Playwright E2E scaffolding added (`apps/web/e2e/`); requires running services and an MP4 to execute.
- Mobile Safari playback behavior adjusted: the room video now opts into inline playback and hides supported native fullscreen/PiP/remote-playback controls to avoid iOS forcing system fullscreen on play.
