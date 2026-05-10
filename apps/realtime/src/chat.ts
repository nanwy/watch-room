import { chatMessageSchema, type ChatMessageInput } from "@workspace/shared/events"

import type { DbClient } from "@workspace/db/client"

export async function sendChatMessage(prisma: DbClient, input: ChatMessageInput) {
  const payload = chatMessageSchema.parse(input)
  const room = await prisma.room.findUnique({
    where: { slug: payload.roomSlug },
    select: { id: true },
  })

  if (!room) {
    throw new Error("Room not found.")
  }

  return prisma.chatMessage.create({
    data: {
      roomId: room.id,
      clientId: payload.clientId,
      nickname: payload.nickname.trim(),
      body: payload.body.trim(),
    },
  })
}

export async function getRecentChatMessages(
  prisma: DbClient,
  roomId: string,
  limit = 100,
) {
  return prisma.chatMessage.findMany({
    where: { roomId },
    orderBy: { createdAt: "desc" },
    take: limit,
  }).then((messages) => messages.reverse())
}
