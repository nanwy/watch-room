import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import type { createRoom } from "@workspace/db/rooms"

import { createRoomRouteHandler } from "../app/api/admin/rooms/route"

const ORIGINAL_ENV = process.env

describe("admin room creation route", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    process.env = {
      ...ORIGINAL_ENV,
      ADMIN_PASSCODE: "secret",
    }
  })

  afterEach(() => {
    process.env = ORIGINAL_ENV
  })

  test("rejects requests without the admin passcode", async () => {
    const create = vi.fn()
    const handler = createRoomRouteHandler({
      create,
      getPrismaClient: vi.fn(),
    })

    const response = await handler(new Request("http://app.test/api/admin/rooms", {
      method: "POST",
      body: JSON.stringify({ animeId: "anime-1", episodeId: "episode-1" }),
    }))

    expect(response.status).toBe(401)
    expect(create).not.toHaveBeenCalled()
  })

  test("creates a room for valid admin requests", async () => {
    const prisma = {} as Parameters<typeof createRoom>[0]
    const create = vi.fn().mockResolvedValue({
      id: "room-1",
      slug: "abc123",
    })
    const handler = createRoomRouteHandler({
      create,
      getPrismaClient: vi.fn(() => prisma),
    })

    const response = await handler(new Request("http://app.test/api/admin/rooms", {
      method: "POST",
      headers: {
        "x-admin-passcode": "secret",
      },
      body: JSON.stringify({ animeId: "anime-1", episodeId: "episode-1" }),
    }))

    expect(response.status).toBe(201)
    await expect(response.json()).resolves.toEqual({
      id: "room-1",
      slug: "abc123",
      path: "/room/abc123",
    })
    expect(create).toHaveBeenCalledWith(prisma, {
      animeId: "anime-1",
      episodeId: "episode-1",
    })
  })

  test("rejects invalid payloads", async () => {
    const create = vi.fn()
    const handler = createRoomRouteHandler({
      create,
      getPrismaClient: vi.fn(),
    })

    const response = await handler(new Request("http://app.test/api/admin/rooms", {
      method: "POST",
      headers: {
        "x-admin-passcode": "secret",
      },
      body: JSON.stringify({ animeId: "" }),
    }))

    expect(response.status).toBe(400)
    expect(create).not.toHaveBeenCalled()
  })
})
