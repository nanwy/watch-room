import { describe, expect, test } from "vitest"

import { joinRoomSession } from "../src/sessions.js"

describe("joinRoomSession", () => {
  test("returns room state, online members, and latest chat messages", async () => {
    const prisma = makeSessionPrisma()

    await expect(joinRoomSession(prisma, {
      roomSlug: "room-123",
      clientId: "client-123",
      nickname: " Nia ",
      socketId: "socket-1",
    })).resolves.toMatchObject({
      room: { id: "room-1", slug: "room-123" },
      members: [{ clientId: "client-123", nickname: "Nia" }],
      messages: [{ id: "message-1" }],
    })
  })
})

function makeSessionPrisma() {
  return {
    room: {
      findUnique: async () => ({
        id: "room-1",
        slug: "room-123",
        currentAnime: { id: "anime-1" },
        currentEpisode: { id: "episode-1" },
        playbackState: { roomId: "room-1" },
      }),
    },
    roomMemberSession: {
      upsert: async () => undefined,
      findMany: async () => [
        {
          clientId: "client-123",
          nickname: "Nia",
          socketId: "socket-1",
          lastSeenAt: new Date(),
        },
      ],
    },
    chatMessage: {
      findMany: async () => [{ id: "message-1" }],
    },
  } as unknown as Parameters<typeof joinRoomSession>[0]
}
