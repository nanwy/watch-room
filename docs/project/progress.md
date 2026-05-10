# Watch Room Progress

Last updated: 2026-05-10 17:07 CST

## Current Status

The product requirements are confirmed. The project has been created as a shadcn/ui monorepo with a Next.js 16 web app, shared UI package, database package, shared types package, and realtime service package.

Phase 0 baseline cleanup is complete at the bootstrap/infrastructure level. Core product features are not complete yet.

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

The generated project has a clean baseline ready for commit on this branch.

## Known Technical Issues

- Prisma has been pinned to Prisma 6 in `@workspace/db` so `schema.prisma` can keep the conventional `DATABASE_URL` datasource.
- `pnpm typecheck` passes across the workspace.
- `pnpm lint` passes across the workspace.
- The previous plan used package names like `@watch-room/*`; the plan has been updated so future work follows the generated `@workspace/*`, `web`, and `realtime` package names.
- Product features are still intentionally unimplemented after Phase 0.

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

- [ ] Finalize Prisma schema for:
  - `Anime`
  - `Episode`
  - `Room`
  - `RoomPlaybackState`
  - `ChatMessage`
  - `RoomMemberSession`
- [ ] Generate Prisma client successfully.
- [ ] Add shared playback math:
  - effective position calculation
  - drift correction threshold
- [ ] Add shared Zod schemas for:
  - room join
  - chat message
  - playback controls
- [ ] Add unit tests for playback math and validation.

### Phase 2: Media Library

- [ ] Implement server folder scanner.
- [ ] Parse anime from first-level folder names.
- [ ] Parse episodes from supported video files.
- [ ] Detect episode number from filenames when possible.
- [ ] Skip unsupported files.
- [ ] Prevent duplicate anime/episode imports.
- [ ] Add admin scan API protected by `ADMIN_PASSCODE`.
- [ ] Build media library admin page with shadcn/ui.

### Phase 3: Room Creation

- [ ] Build room creation service.
- [ ] Create room with initial paused playback state.
- [ ] Add admin room creation API.
- [ ] Build room creation page using TanStack Query mutations.
- [ ] Display shareable room URL.

### Phase 4: Realtime Service

- [ ] Implement Socket.IO server.
- [ ] Implement nickname/clientId room join.
- [ ] Track online member sessions.
- [ ] Broadcast member list updates.
- [ ] Persist and broadcast chat messages.
- [ ] Load recent 100 chat messages on join/reconnect.
- [ ] Validate playback control events.
- [ ] Persist authoritative playback state.
- [ ] Broadcast playback state updates.

### Phase 5: Watch Room UI

- [ ] Build nickname join flow.
- [ ] Store `clientId` and nickname locally.
- [ ] Add TanStack Query provider.
- [ ] Add Zustand store for room UI/realtime state.
- [ ] Build video player with synchronized controls.
- [ ] Build anime/episode switcher.
- [ ] Build chat panel.
- [ ] Build online member list.
- [ ] Show reconnecting/disconnected states.
- [ ] Correct playback drift over threshold.

### Phase 6: Media Serving

- [ ] Add episode media route.
- [ ] Validate file path stays inside media directory.
- [ ] Return correct content type.
- [ ] Implement HTTP range requests for seeking.
- [ ] Show unsupported/missing media states in room UI.

### Phase 7: Deployment

- [ ] Add Dockerfile for web app.
- [ ] Add Dockerfile for realtime service.
- [ ] Add Docker Compose services:
  - web
  - realtime
  - postgres
  - proxy
- [ ] Mount media directories:
  - `/data/imports`
  - `/data/media`
- [ ] Add Caddy reverse proxy config.
- [ ] Document VPS environment setup.

### Phase 8: Verification

- [ ] Unit tests pass.
- [ ] Typecheck passes.
- [ ] Lint passes.
- [ ] Docker Compose builds.
- [ ] Two browser sessions can join the same room.
- [ ] Chat syncs both ways.
- [ ] Playback controls sync both ways.
- [ ] Episode switching syncs.
- [ ] Refresh/reconnect restores playback state and recent chat.

## Immediate Next Step

The next engineering step is Phase 1: Data and Shared Domain.
