import { joinRoomSchema, type JoinRoomInput } from "@workspace/shared/events"

import type { DbClient } from "@workspace/db/client"
import { getRecentChatMessages } from "./chat.js"

export type JoinRoomSessionInput = JoinRoomInput & {
  socketId: string
}

export async function joinRoomSession(prisma: DbClient, input: JoinRoomSessionInput) {
  const payload = joinRoomSchema.parse(input)
  const room = await prisma.room.findUnique({
    where: { slug: payload.roomSlug },
    include: {
      currentAnime: true,
      currentEpisode: true,
      playbackState: true,
    },
  })

  if (!room) {
    throw new Error("Room not found.")
  }

  await prisma.roomMemberSession.upsert({
    where: {
      roomId_clientId: {
        roomId: room.id,
        clientId: payload.clientId,
      },
    },
    create: {
      roomId: room.id,
      clientId: payload.clientId,
      nickname: payload.nickname.trim(),
      socketId: input.socketId,
      disconnectedAt: null,
    },
    update: {
      nickname: payload.nickname.trim(),
      socketId: input.socketId,
      lastSeenAt: new Date(),
      disconnectedAt: null,
    },
  })

  const [members, messages] = await Promise.all([
    getOnlineMembers(prisma, room.id),
    getRecentChatMessages(prisma, room.id),
  ])

  return {
    room,
    members,
    messages,
  }
}

export async function getOnlineMembers(prisma: DbClient, roomId: string) {
  return prisma.roomMemberSession.findMany({
    where: {
      roomId,
      disconnectedAt: null,
    },
    orderBy: { connectedAt: "asc" },
    select: {
      clientId: true,
      nickname: true,
      socketId: true,
      lastSeenAt: true,
    },
  })
}

export type MembersBroadcaster = {
  to: (slug: string) => { emit: (event: string, payload: unknown) => void }
  getOnlineMembers: (prisma: DbClient, roomId: string) => Promise<unknown[]>
}

export async function broadcastMembersAfterDisconnect(
  prisma: DbClient,
  socketId: string,
  io: MembersBroadcaster,
) {
  const affected = await prisma.roomMemberSession.findMany({
    where: { socketId, disconnectedAt: null },
    select: { roomId: true, room: { select: { slug: true } } },
  })

  if (affected.length === 0) return

  await prisma.roomMemberSession.updateMany({
    where: { socketId, disconnectedAt: null },
    data: { socketId: null, disconnectedAt: new Date(), lastSeenAt: new Date() },
  })

  const seen = new Set<string>()
  for (const row of affected) {
    if (seen.has(row.room.slug)) continue
    seen.add(row.room.slug)
    const members = await io.getOnlineMembers(prisma, row.roomId)
    io.to(row.room.slug).emit("room:members", members)
  }
}
