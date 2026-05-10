import { randomBytes } from "node:crypto"

import type { DbClient } from "./client.js"

export async function createRoom(
  prisma: DbClient,
  input: {
    animeId: string
    episodeId: string
  },
) {
  await assertEpisodeBelongsToAnime(prisma, input)

  const slug = await createUniqueRoomSlug(prisma)

  return prisma.room.create({
    data: {
      slug,
      currentAnimeId: input.animeId,
      currentEpisodeId: input.episodeId,
      playbackState: {
        create: {
          animeId: input.animeId,
          episodeId: input.episodeId,
          status: "paused",
          positionSeconds: 0,
          playbackRate: 1,
        },
      },
    },
    include: {
      currentAnime: true,
      currentEpisode: true,
      playbackState: true,
    },
  })
}

export async function assertEpisodeBelongsToAnime(
  prisma: DbClient,
  input: {
    animeId: string
    episodeId: string
  },
) {
  const episode = await prisma.episode.findFirst({
    where: {
      id: input.episodeId,
      animeId: input.animeId,
    },
  })

  if (!episode) {
    throw new Error("Episode does not exist for the selected anime.")
  }

  return episode
}

export async function updateRoomSelection(
  prisma: DbClient,
  input: {
    roomId: string
    animeId: string
    episodeId: string
  },
) {
  await assertEpisodeBelongsToAnime(prisma, input)

  return prisma.room.update({
    where: { id: input.roomId },
    data: {
      currentAnimeId: input.animeId,
      currentEpisodeId: input.episodeId,
    },
  })
}

export async function updateRoomPlaybackState(
  prisma: DbClient,
  input: {
    roomId: string
    animeId: string
    episodeId: string
    status: "playing" | "paused"
    positionSeconds: number
    playbackRate: number
    updatedByClientId?: string | null
  },
) {
  await assertEpisodeBelongsToAnime(prisma, input)

  return prisma.roomPlaybackState.update({
    where: { roomId: input.roomId },
    data: {
      animeId: input.animeId,
      episodeId: input.episodeId,
      status: input.status,
      positionSeconds: input.positionSeconds,
      playbackRate: input.playbackRate,
      updatedByClientId: input.updatedByClientId ?? null,
    },
  })
}

export async function getRoomSnapshot(prisma: DbClient, slug: string) {
  return prisma.room.findUnique({
    where: { slug },
    include: {
      currentAnime: true,
      currentEpisode: true,
      playbackState: true,
    },
  })
}

async function createUniqueRoomSlug(prisma: DbClient) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const slug = randomBytes(5).toString("base64url")
    const existing = await prisma.room.findUnique({ where: { slug } })
    if (!existing) return slug
  }

  throw new Error("Unable to create a unique room slug.")
}
