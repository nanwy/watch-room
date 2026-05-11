import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import { createDeleteRoomHandler } from "../app/api/admin/rooms/[roomId]/handler"

const ORIGINAL_ENV = process.env

describe("admin room delete route", () => {
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
    const prisma = {
      room: {
        findUnique: vi.fn(),
        delete: vi.fn(),
      },
    }
    const handler = createDeleteRoomHandler({
      getPrismaClient: () => prisma as never,
    })

    const response = await handler(new Request("http://app.test"), {
      params: Promise.resolve({ roomId: "room-1" }),
    })

    expect(response.status).toBe(401)
    expect(prisma.room.findUnique).not.toHaveBeenCalled()
  })

  test("returns 404 when the room does not exist", async () => {
    const prisma = {
      room: {
        findUnique: vi.fn().mockResolvedValue(null),
        delete: vi.fn(),
      },
    }
    const handler = createDeleteRoomHandler({
      getPrismaClient: () => prisma as never,
    })

    const response = await handler(new Request("http://app.test", {
      headers: { "x-admin-passcode": "secret" },
    }), {
      params: Promise.resolve({ roomId: "room-1" }),
    })

    expect(response.status).toBe(404)
    expect(prisma.room.delete).not.toHaveBeenCalled()
  })

  test("deletes an existing room", async () => {
    const prisma = {
      room: {
        findUnique: vi.fn().mockResolvedValue({ id: "room-1" }),
        delete: vi.fn().mockResolvedValue({}),
      },
    }
    const handler = createDeleteRoomHandler({
      getPrismaClient: () => prisma as never,
    })

    const response = await handler(new Request("http://app.test", {
      headers: { "x-admin-passcode": "secret" },
    }), {
      params: Promise.resolve({ roomId: "room-1" }),
    })

    expect(response.status).toBe(200)
    expect(prisma.room.delete).toHaveBeenCalledWith({ where: { id: "room-1" } })
  })
})
