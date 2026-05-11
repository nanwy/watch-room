import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import { createDeleteAnimeHandler } from "../app/api/admin/library/anime/[animeId]/handler"
import {
  createDeleteEpisodeHandler,
  createUpdateEpisodeHandler,
} from "../app/api/admin/library/episodes/[episodeId]/handler"

const ORIGINAL_ENV = process.env

describe("admin library delete routes", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    process.env = {
      ...ORIGINAL_ENV,
      ADMIN_PASSCODE: "secret",
    }
  })

  afterEach(() => {
    process.env = ORIGINAL_ENV
  })

  test("rejects episode deletion without the admin passcode", async () => {
    const prisma = {
      episode: { findUnique: vi.fn() },
    }
    const handler = createDeleteEpisodeHandler({
      getEnv: () => "/media",
      getPrismaClient: () => prisma as never,
      removeFile: vi.fn(),
    })

    const response = await handler(new Request("http://app.test"), {
      params: Promise.resolve({ episodeId: "episode-1" }),
    })

    expect(response.status).toBe(401)
    expect(prisma.episode.findUnique).not.toHaveBeenCalled()
  })

  test("deletes an episode and its managed file", async () => {
    const removeFile = vi.fn().mockResolvedValue(undefined)
    const prisma = {
      episode: {
        findUnique: vi.fn().mockResolvedValue({
          id: "episode-1",
          animeId: "anime-1",
          storagePath: "/media/anime/episode.mp4",
        }),
        delete: vi.fn().mockResolvedValue({}),
        count: vi.fn().mockResolvedValue(1),
      },
      room: { count: vi.fn().mockResolvedValue(0) },
      roomPlaybackState: { count: vi.fn().mockResolvedValue(0) },
      anime: { delete: vi.fn() },
    }
    const handler = createDeleteEpisodeHandler({
      getEnv: () => "/media",
      getPrismaClient: () => prisma as never,
      removeFile,
    })

    const response = await handler(new Request("http://app.test", {
      headers: { "x-admin-passcode": "secret" },
    }), {
      params: Promise.resolve({ episodeId: "episode-1" }),
    })

    expect(response.status).toBe(200)
    expect(prisma.episode.delete).toHaveBeenCalledWith({ where: { id: "episode-1" } })
    expect(removeFile).toHaveBeenCalledWith("/media/anime/episode.mp4")
  })

  test("updates an episode title and episode number", async () => {
    const prisma = {
      episode: {
        update: vi.fn().mockResolvedValue({
          id: "episode-1",
          title: "05.小生意気ロマンティックが止まらない",
          normalizedTitle: "05.小生意気ロマンティックが止まらない",
          episodeNumber: 5,
        }),
      },
    }
    const handler = createUpdateEpisodeHandler({
      getPrismaClient: () => prisma as never,
    })

    const response = await handler(new Request("http://app.test", {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        "x-admin-passcode": "secret",
      },
      body: JSON.stringify({
        title: " 05.小生意気ロマンティックが止まらない ",
        episodeNumber: 5,
      }),
    }), {
      params: Promise.resolve({ episodeId: "episode-1" }),
    })

    expect(response.status).toBe(200)
    expect(prisma.episode.update).toHaveBeenCalledWith({
      where: { id: "episode-1" },
      data: {
        title: "05.小生意気ロマンティックが止まらない",
        normalizedTitle: "05.小生意気ロマンティックが止まらない",
        episodeNumber: 5,
      },
      select: {
        id: true,
        title: true,
        episodeNumber: true,
      },
    })
    await expect(response.json()).resolves.toMatchObject({
      id: "episode-1",
      title: "05.小生意気ロマンティックが止まらない",
      episodeNumber: 5,
    })
  })

  test("rejects episode deletion when the file is outside storage", async () => {
    const prisma = {
      episode: {
        findUnique: vi.fn().mockResolvedValue({
          id: "episode-1",
          animeId: "anime-1",
          storagePath: "/tmp/episode.mp4",
        }),
      },
      room: { count: vi.fn() },
      roomPlaybackState: { count: vi.fn() },
    }
    const handler = createDeleteEpisodeHandler({
      getEnv: () => "/media",
      getPrismaClient: () => prisma as never,
      removeFile: vi.fn(),
    })

    const response = await handler(new Request("http://app.test", {
      headers: { "x-admin-passcode": "secret" },
    }), {
      params: Promise.resolve({ episodeId: "episode-1" }),
    })

    expect(response.status).toBe(409)
    expect(prisma.room.count).not.toHaveBeenCalled()
  })

  test("deletes an anime and all managed episode files", async () => {
    const removeFile = vi.fn().mockResolvedValue(undefined)
    const prisma = {
      anime: {
        findUnique: vi.fn().mockResolvedValue({
          id: "anime-1",
          episodes: [
            { storagePath: "/media/anime/01.mp4" },
            { storagePath: "/media/anime/02.mp4" },
          ],
        }),
        delete: vi.fn().mockResolvedValue({}),
      },
      room: { count: vi.fn().mockResolvedValue(0) },
      roomPlaybackState: { count: vi.fn().mockResolvedValue(0) },
    }
    const handler = createDeleteAnimeHandler({
      getEnv: () => "/media",
      getPrismaClient: () => prisma as never,
      removeFile,
    })

    const response = await handler(new Request("http://app.test", {
      headers: { "x-admin-passcode": "secret" },
    }), {
      params: Promise.resolve({ animeId: "anime-1" }),
    })

    expect(response.status).toBe(200)
    expect(prisma.anime.delete).toHaveBeenCalledWith({ where: { id: "anime-1" } })
    expect(removeFile).toHaveBeenCalledWith("/media/anime/01.mp4")
    expect(removeFile).toHaveBeenCalledWith("/media/anime/02.mp4")
  })
})
