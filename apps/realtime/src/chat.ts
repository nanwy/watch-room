import { chatMessageSchema, type ChatMessageInput } from "@workspace/shared/events"

import type { DbClient } from "@workspace/db/client"

export async function sendChatMessage(prisma: DbClient, input: ChatMessageInput) {
  const payload = chatMessageSchema.parse(input)
  return prisma.chatMessage.create({
    data: {
      room: { connect: { slug: payload.roomSlug } },
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
