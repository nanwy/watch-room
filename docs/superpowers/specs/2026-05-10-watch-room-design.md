# Watch Room Design

Date: 2026-05-10

## Goal

Build a private web watch room for a trusted group of friends. The app lets the owner maintain a central anime media library, create rooms from that library, share room links, watch synchronized video together, and chat in real time.

This is not a public streaming platform. The first version should optimize for simple single-server deployment, clear behavior, and reliable co-watching over broad account, moderation, or scaling features.

## Product Scope

The app has two main areas:

1. Media library management
2. Watch rooms

The media library stores anime grouped by series and episodes. Resources are prepared on the VPS before use. The first version does not upload large files through the browser. Instead, the owner places files in a server import directory and runs a scan from the management UI.

When creating a watch room, a user selects an anime and a default episode from the media library. The app creates a shareable room link. Friends open the link, enter a nickname, and join without registration.

Inside a room, all online members can control playback. Supported controls are play, pause, seek, playback rate changes, episode switching, and anime switching. The server keeps the authoritative room playback state. The last valid control event received by the server wins.

The room also includes a synchronized chat. Messages are broadcast live and stored so newly joined or reconnected clients can receive recent history.

The app should avoid a full account system, but management actions must not be exposed publicly. Media scanning and library maintenance should be protected by a single server-configured administrator passcode. Room joining remains login-free.

## Non-Goals

The first version will not include:

- Public user accounts
- Friend lists
- Role-based room permissions
- Paid access
- Danmaku comments
- Browser-based large video uploads
- P2P video transfer
- Server-side transcoding
- Mobile native apps
- Complex moderation tools
- Multi-server horizontal scaling

## Technology Stack

- Framework: Next.js 16 with App Router
- UI: shadcn/ui
- Client state: Zustand for complex room and realtime UI state
- API state: TanStack Query for server reads and mutations
- Database: PostgreSQL
- ORM: Prisma
- Realtime service: Socket.IO in a separate Node.js process
- Deployment: VPS with Docker Compose
- Media storage: local VPS disk mount
- Reverse proxy: Caddy or Nginx

Next.js handles pages, media library management, room creation, initial data loading, and non-realtime APIs. The Socket.IO service handles room membership, playback control broadcasts, chat broadcasts, online member state, and reconnect flows.

The realtime service should be a separate process instead of being embedded into the Next.js request lifecycle. Long-lived socket connections are central to this product, and a dedicated process keeps deployment and debugging straightforward.

Management pages and APIs should require an `ADMIN_PASSCODE` configured on the server. This is intentionally simpler than user accounts while still protecting import and library mutation endpoints on a public VPS.

## Deployment Shape

The Docker Compose setup should include:

- `web`: Next.js 16 app
- `realtime`: Socket.IO service
- `postgres`: PostgreSQL database
- `proxy`: Caddy or Nginx
- `media`: mounted host directory for video files

The proxy terminates HTTPS and routes:

- Browser page and API traffic to `web`
- WebSocket traffic to `realtime`
- Media file requests either to `web` for controlled streaming or directly to the media directory for simple static serving

For the trusted first version, direct proxy mapping for media files is acceptable. If stricter access control becomes necessary later, media URLs can move behind application validation or signed URLs.

## Media Import

The owner maintains an import directory on the server:

```text
/data/imports/
  Example Anime/
    S01E01.mp4
    S01E02.mp4
  Another Anime/
    01.mp4
    02.mp4
```

The management page provides a scan action. The scanner reads first-level directories as anime titles and video files inside them as episodes.

Initial rules:

- First-level directory name becomes the anime title.
- File name without extension becomes the episode title.
- If a number can be parsed from the file name, use it for episode ordering.
- If no number can be parsed, sort by file name.
- Supported import extensions are `.mp4`, `.webm`, `.mkv`, and `.mov`.
- Browser playback support is only expected for browser-compatible files, primarily MP4 and WebM.
- MKV may be imported but can be marked as potentially unsupported.
- Duplicate detection should prevent importing the same path or same normalized anime/episode pair twice.

After import, files should be moved or hard-linked into a managed media directory:

```text
/data/media/
  anime_<id>/
    episode_<id>.mp4
```

The database stores metadata. It should not store video file contents.

## Core Data Model

`Anime`

- `id`
- `title`
- `createdAt`
- `updatedAt`

`Episode`

- `id`
- `animeId`
- `title`
- `episodeNumber`
- `storagePath`
- `mimeType`
- `fileSizeBytes`
- `durationSeconds`
- `playbackSupportStatus`
- `createdAt`
- `updatedAt`

`Room`

- `id`
- `slug`
- `currentAnimeId`
- `currentEpisodeId`
- `createdAt`
- `updatedAt`
- `lastActiveAt`

`RoomPlaybackState`

- `roomId`
- `animeId`
- `episodeId`
- `status`: `playing` or `paused`
- `positionSeconds`
- `playbackRate`
- `updatedAt`
- `updatedByClientId`

`ChatMessage`

- `id`
- `roomId`
- `clientId`
- `nickname`
- `body`
- `createdAt`

`RoomMemberSession`

- `id`
- `roomId`
- `clientId`
- `nickname`
- `socketId`
- `connectedAt`
- `lastSeenAt`
- `disconnectedAt`

## Playback Synchronization

The server owns the authoritative playback state. Clients send control events to the realtime service. The realtime service validates the event, updates the room state, persists the meaningful state change, and broadcasts the new state to all connected clients in the room.

Control events include:

- `play`
- `pause`
- `seek`
- `setPlaybackRate`
- `switchEpisode`
- `switchAnime`

When a room is playing, the server does not need to write progress every second. It stores the position and timestamp from the last control event. When calculating the current effective position, it uses:

```text
effectivePosition = positionSeconds + (now - updatedAt) * playbackRate
```

Clients should periodically compare their local playback position with the authoritative effective position. If drift exceeds a threshold, such as 1.5 seconds, the client corrects its local video position.

If multiple people control playback at nearly the same time, the server processes events in arrival order. The last valid event received by the server wins.

## Chat Synchronization

Chat messages are sent through Socket.IO and persisted to PostgreSQL.

When a member joins or reconnects, the server sends the most recent 100 messages for that room. This simple rule avoids unbounded history loading while making refresh and reconnect behavior feel continuous.

Messages should have a maximum length. The first version can use a simple limit such as 1,000 characters. Empty messages are rejected.

## No-Login Identity and Reconnect

The app does not require accounts.

When a user first joins a room, they enter a nickname. The browser generates a `clientId` and stores it in `localStorage`. Socket connections include:

- `roomId`
- `nickname`
- `clientId`

If the socket disconnects, the client reconnects automatically with the same values. The server treats this as the same browser returning, refreshes the online member state, and sends:

- Current authoritative playback state
- Online member list
- Recent chat messages

If a user changes browser, clears local storage, or joins from another device, they are treated as a new member. This is acceptable for the private first version.

## Main User Flows

### Import Media

1. Owner copies anime folders into `/data/imports`.
2. Owner opens media management.
3. Owner runs scan import.
4. App displays imported anime and episodes.
5. Unsupported or questionable formats are visible in the library.

### Create Room

1. User opens create room page.
2. User chooses anime and starting episode.
3. App creates a room with initial paused playback state at position 0.
4. App shows or opens a shareable room link.

### Join Room

1. Friend opens room link.
2. Friend enters nickname.
3. Browser creates or reuses `clientId`.
4. App connects to realtime service.
5. Server sends room media, playback state, members, and recent chat.

### Watch Together

1. Any online member controls playback.
2. Client sends control event.
3. Server validates and updates authoritative state.
4. Server broadcasts state.
5. All clients update the player and continue drift correction.

### Chat

1. Member sends a message.
2. Server validates and stores the message.
3. Server broadcasts it to the room.
4. New or reconnected members receive recent history.

## Error Handling

If a media file is missing, the room should show that the resource is unavailable and refuse playback for that episode.

If a file format is unsupported by the browser, the player should show a clear unsupported format message. The first version should not attempt to transcode.

If Socket.IO disconnects, the UI should show a reconnecting state and retry automatically. On reconnect, the client should resync playback state and chat history.

If a control event is invalid, such as seeking beyond known media duration or switching to a missing episode, the server rejects it and sends the current authoritative state back to the sender.

If scan import finds duplicate files or duplicate normalized anime/episode entries, it should skip them or mark them as conflicts instead of creating duplicate library records.

If chat validation fails, the server rejects the message without broadcasting it.

## Testing and Acceptance Criteria

The first version is acceptable when these checks pass:

- A folder containing one anime with multiple episodes can be scanned into the media library.
- A room can be created from an imported anime and starting episode.
- A share link can be opened in two browser sessions with different nicknames.
- Chat messages appear in both sessions in real time.
- Refreshing or reconnecting a session restores recent chat messages.
- Play, pause, seek, playback rate changes, episode switches, and anime switches from either session synchronize to the other session.
- A reconnecting client receives the current effective playback position.
- Playback drift is corrected when it exceeds the configured threshold.
- Missing or unsupported media produces visible error states.
- Docker Compose can start the full app on a single VPS.

## Initial Implementation Order

1. Create Next.js 16 app structure with shadcn/ui.
2. Add PostgreSQL and Prisma models.
3. Build media scanner and media library pages.
4. Build room creation and room page shell.
5. Add Socket.IO realtime service.
6. Implement playback state synchronization.
7. Implement chat persistence and broadcast.
8. Add reconnect behavior using `clientId`.
9. Add Docker Compose and reverse proxy configuration.
10. Verify the acceptance criteria with two browser sessions.
