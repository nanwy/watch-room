import { describe, expect, test } from "vitest"

import { applyPlaybackControl } from "../src/playback.js"

describe("applyPlaybackControl", () => {
  test("updates play state with the current room media", async () => {
    const prisma = makePlaybackPrisma()

    await expect(applyPlaybackControl(prisma, {
      type: "play",
      roomSlug: "room-123",
      clientId: "client-123",
      positionSeconds: 12,
    })).resolves.toMatchObject({
      roomId: "room-1",
      animeId: "anime-1",
      episodeId: "episode-1",
      status: "playing",
      positionSeconds: 12,
    })
  })

  test("switches episode only after anime episode validation", async () => {
    const prisma = makePlaybackPrisma()

    await expect(applyPlaybackControl(prisma, {
      type: "switchEpisode",
      roomSlug: "room-123",
      clientId: "client-123",
      animeId: "anime-2",
      episodeId: "episode-1",
    })).rejects.toThrow("Episode does not exist for the selected anime.")
  })
})

function makePlaybackPrisma() {
  return {
    room: {
      findUnique: async () => ({
        id: "room-1",
        slug: "room-123",
        currentAnimeId: "anime-1",
        currentEpisodeId: "episode-1",
        playbackState: {
          roomId: "room-1",
          animeId: "anime-1",
          episodeId: "episode-1",
          status: "paused",
          positionSeconds: 0,
          playbackRate: 1,
        },
      }),
      update: async ({ where, data }: {
        where: { id: string }
        data: { currentAnimeId: string, currentEpisodeId: string }
      }) => ({ id: where.id, ...data }),
    },
    episode: {
      findFirst: async ({ where }: { where: { id: string, animeId: string } }) => {
        if (where.id === "episode-1" && where.animeId === "anime-1") {
          return { id: "episode-1", animeId: "anime-1" }
        }
        return null
      },
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
  } as unknown as Parameters<typeof applyPlaybackControl>[0]
}
