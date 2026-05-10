import { describe, expect, test } from "vitest"

import { sendChatMessage } from "../src/chat.js"

describe("sendChatMessage", () => {
  test("stores a trimmed chat message for an existing room", async () => {
    const prisma = makeChatPrisma()

    await expect(sendChatMessage(prisma, {
      roomSlug: "room-123",
      clientId: "client-123",
      nickname: " Nia ",
      body: " hello ",
    })).resolves.toMatchObject({
      roomId: "room-1",
      nickname: "Nia",
      body: "hello",
    })
  })

  test("rejects empty messages", async () => {
    const prisma = makeChatPrisma()

    await expect(sendChatMessage(prisma, {
      roomSlug: "room-123",
      clientId: "client-123",
      nickname: "Nia",
      body: " ",
    })).rejects.toThrow()
  })
})

function makeChatPrisma() {
  return {
    room: {
      findUnique: async () => ({ id: "room-1" }),
    },
    chatMessage: {
      create: async ({ data }: {
        data: {
          roomId: string
          clientId: string
          nickname: string
          body: string
        }
      }) => ({ id: "message-1", createdAt: new Date(), ...data }),
    },
  } as unknown as Parameters<typeof sendChatMessage>[0]
}
