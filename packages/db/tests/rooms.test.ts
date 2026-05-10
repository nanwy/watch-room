import { describe, expect, test } from "vitest"

import {
  assertEpisodeBelongsToAnime,
  updateRoomPlaybackState,
  updateRoomSelection,
} from "../src/rooms.js"

describe("room services", () => {
  test("asserts the selected episode belongs to the selected anime", async () => {
    const prisma = makeRoomPrisma()

    await expect(assertEpisodeBelongsToAnime(prisma, {
      animeId: "anime-1",
      episodeId: "episode-1",
    })).resolves.toEqual({ id: "episode-1", animeId: "anime-1" })

    await expect(assertEpisodeBelongsToAnime(prisma, {
      animeId: "anime-2",
      episodeId: "episode-1",
    })).rejects.toThrow("Episode does not exist for the selected anime.")
  })

  test("updates room selection only for matching anime episode pairs", async () => {
    const prisma = makeRoomPrisma()

    await expect(updateRoomSelection(prisma, {
      roomId: "room-1",
      animeId: "anime-2",
      episodeId: "episode-1",
    })).rejects.toThrow("Episode does not exist for the selected anime.")

    await expect(updateRoomSelection(prisma, {
      roomId: "room-1",
      animeId: "anime-1",
      episodeId: "episode-1",
    })).resolves.toMatchObject({
      id: "room-1",
      currentAnimeId: "anime-1",
      currentEpisodeId: "episode-1",
    })
  })

  test("updates playback state only for matching anime episode pairs", async () => {
    const prisma = makeRoomPrisma()

    await expect(updateRoomPlaybackState(prisma, {
      roomId: "room-1",
      animeId: "anime-2",
      episodeId: "episode-1",
      status: "playing",
      positionSeconds: 12,
      playbackRate: 1,
      updatedByClientId: "client-123",
    })).rejects.toThrow("Episode does not exist for the selected anime.")

    await expect(updateRoomPlaybackState(prisma, {
      roomId: "room-1",
      animeId: "anime-1",
      episodeId: "episode-1",
      status: "playing",
      positionSeconds: 12,
      playbackRate: 1,
      updatedByClientId: "client-123",
    })).resolves.toMatchObject({
      roomId: "room-1",
      animeId: "anime-1",
      episodeId: "episode-1",
      status: "playing",
    })
  })
})

function makeRoomPrisma() {
  return {
    episode: {
      findFirst: async ({ where }: { where: { id: string, animeId: string } }) => {
        if (where.id === "episode-1" && where.animeId === "anime-1") {
          return { id: "episode-1", animeId: "anime-1" }
        }
        return null
      },
    },
    room: {
      update: async ({ where, data }: {
        where: { id: string }
        data: { currentAnimeId: string, currentEpisodeId: string }
      }) => ({ id: where.id, ...data }),
    },
    roomPlaybackState: {
      update: async ({ where, data }: {
        where: { roomId: string }
        data: {
          animeId: string
          episodeId: string
          status: string
          positionSeconds: number
          playbackRate: number
          updatedByClientId: string | null
        }
      }) => ({ roomId: where.roomId, ...data }),
    },
  } as unknown as Parameters<typeof assertEpisodeBelongsToAnime>[0]
}
