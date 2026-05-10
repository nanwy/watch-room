import { playbackControlSchema, type PlaybackControlInput } from "@workspace/shared/events"

import type { DbClient } from "@workspace/db/client"
import {
  assertEpisodeBelongsToAnime,
  updateRoomPlaybackState,
  updateRoomSelection,
} from "@workspace/db/rooms"

export async function applyPlaybackControl(prisma: DbClient, input: PlaybackControlInput) {
  const payload = playbackControlSchema.parse(input)
  const room = await prisma.room.findUnique({
    where: { slug: payload.roomSlug },
    include: {
      playbackState: true,
    },
  })

  if (!room) {
    throw new Error("Room not found.")
  }

  if (payload.type === "switchEpisode" || payload.type === "switchAnime") {
    await assertEpisodeBelongsToAnime(prisma, {
      animeId: payload.animeId,
      episodeId: payload.episodeId,
    })
    await updateRoomSelection(prisma, {
      roomId: room.id,
      animeId: payload.animeId,
      episodeId: payload.episodeId,
    })
    return updateRoomPlaybackState(prisma, {
      roomId: room.id,
      animeId: payload.animeId,
      episodeId: payload.episodeId,
      status: "paused",
      positionSeconds: 0,
      playbackRate: room.playbackState?.playbackRate ?? 1,
      updatedByClientId: payload.clientId,
    })
  }

  const animeId = room.playbackState?.animeId ?? room.currentAnimeId
  const episodeId = room.playbackState?.episodeId ?? room.currentEpisodeId
  const playbackRate = payload.type === "setPlaybackRate"
    ? payload.playbackRate
    : room.playbackState?.playbackRate ?? 1

  return updateRoomPlaybackState(prisma, {
    roomId: room.id,
    animeId,
    episodeId,
    status: payload.type === "play" ? "playing" : payload.type === "pause" ? "paused" : room.playbackState?.status ?? "paused",
    positionSeconds: payload.positionSeconds,
    playbackRate,
    updatedByClientId: payload.clientId,
  })
}
