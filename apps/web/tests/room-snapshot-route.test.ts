import { describe, expect, test, vi } from "vitest"

import { createRoomSnapshotHandler } from "../app/api/rooms/[slug]/snapshot/handler.js"

describe("GET /api/rooms/[slug]/snapshot", () => {
  test("returns 404 when slug is unknown", async () => {
    const handler = createRoomSnapshotHandler({
      getSnapshot: vi.fn().mockResolvedValue(null),
      getPrismaClient: () => ({}) as never,
    })
    const res = await handler(new Request("http://x"), { params: Promise.resolve({ slug: "nope" }) })
    expect(res.status).toBe(404)
  })

  test("returns the snapshot when found", async () => {
    const snapshot = { id: "r1", slug: "abc-123", currentAnime: { id: "a", title: "T" }, currentEpisode: { id: "e" }, playbackState: { status: "paused" } }
    const handler = createRoomSnapshotHandler({
      getSnapshot: vi.fn().mockResolvedValue(snapshot),
      getPrismaClient: () => ({}) as never,
    })
    const res = await handler(new Request("http://x"), { params: Promise.resolve({ slug: "abc-123" }) })
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ slug: "abc-123" })
  })
})
