import { describe, expect, test, vi } from "vitest"

import { broadcastMembersAfterDisconnect } from "../src/sessions.js"

describe("broadcastMembersAfterDisconnect", () => {
  test("persists disconnect and emits room:members for affected rooms", async () => {
    const emit = vi.fn()
    const updateMany = vi.fn().mockResolvedValue({ count: 1 })
    const prisma = {
      roomMemberSession: {
        findMany: vi.fn().mockResolvedValueOnce([
          { roomId: "room-1", room: { slug: "abc-123" } },
        ]),
        updateMany,
      },
    } as never

    await broadcastMembersAfterDisconnect(prisma, "socket-x", {
      to: (slug: string) => ({ emit: (event: string, payload: unknown) => emit(slug, event, payload) }),
      getOnlineMembers: async () => [{ clientId: "c1", nickname: "n", socketId: null, lastSeenAt: new Date() }],
    })

    expect(updateMany).toHaveBeenCalledWith({
      where: { socketId: "socket-x", disconnectedAt: null },
      data: expect.objectContaining({ socketId: null, disconnectedAt: expect.any(Date) }),
    })
    expect(emit).toHaveBeenCalledWith("abc-123", "room:members", expect.any(Array))
  })
})
