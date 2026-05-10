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
      roomSlug: "room-123",
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
    chatMessage: {
      create: async ({ data }: {
        data: {
          room: { connect: { slug: string } }
          clientId: string
          nickname: string
          body: string
        }
      }) => ({
        id: "message-1",
        createdAt: new Date(),
        roomSlug: data.room.connect.slug,
        clientId: data.clientId,
        nickname: data.nickname,
        body: data.body,
      }),
    },
  } as unknown as Parameters<typeof sendChatMessage>[0]
}
