import { mkdir, readFile, stat, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"

import { describe, expect, test } from "vitest"

import {
  discoverImportCandidates,
  importCandidates,
  normalizeImportKey,
  type ImportCandidate,
} from "../src/media-scanner.js"

describe("media scanner", () => {
  test("normalizes duplicate anime and episode keys within discovery", async () => {
    const root = await makeTempDir()
    const animeDir = path.join(root, "Example  Anime")
    await mkdir(animeDir, { recursive: true })
    await writeFile(path.join(animeDir, "Episode 01.mp4"), "one")
    await writeFile(path.join(animeDir, " episode   01 .webm"), "two")

    const candidates = await discoverImportCandidates(root)

    expect(candidates).toHaveLength(1)
    expect(normalizeImportKey(" Example   Anime ")).toBe("example anime")
  })

  test("skips persisted duplicates by source path and normalized anime episode pair", async () => {
    const sourceDir = await makeTempDir()
    const firstSourcePath = path.join(sourceDir, "Episode 01.mp4")
    const copySourcePath = path.join(sourceDir, "copy.mp4")
    await writeFile(firstSourcePath, "one")
    await writeFile(copySourcePath, "two")

    const first = makeCandidate({
      animeTitle: "Example Anime",
      episodeTitle: "Episode 01",
      sourcePath: firstSourcePath,
    })
    const samePair = makeCandidate({
      animeTitle: " example   anime ",
      episodeTitle: " episode 01 ",
      sourcePath: copySourcePath,
    })
    const samePath = makeCandidate({
      animeTitle: "Different Anime",
      episodeTitle: "Pilot",
      sourcePath: firstSourcePath,
    })

    const prisma = makeImportPrisma()

    const firstResult = await importCandidates([first], await makeTempDir(), prisma)
    const duplicateResult = await importCandidates([samePair, samePath], await makeTempDir(), prisma)

    expect(firstResult).toEqual({ imported: 1, skipped: 0, conflicts: [] })
    expect(duplicateResult).toEqual({ imported: 0, skipped: 2, conflicts: [] })
    expect(prisma.__animes).toEqual([
      expect.objectContaining({
        title: "Example Anime",
        normalizedTitle: "example anime",
      }),
    ])
    expect(prisma.__episodes).toHaveLength(1)
  })

  test("removes only the newly created storage file when episode create fails", async () => {
    const sourceDir = await makeTempDir()
    const storageDir = await makeTempDir()
    const sourcePath = path.join(sourceDir, "episode.mp4")
    await writeFile(sourcePath, "video")

    const keepPath = path.join(storageDir, "existing.mp4")
    await writeFile(keepPath, "keep")

    const prisma = makeImportPrisma({ failEpisodeCreate: true })

    await expect(importCandidates([
      makeCandidate({ sourcePath }),
    ], storageDir, prisma)).rejects.toThrow("episode create failed")

    await expect(readFile(keepPath, "utf8")).resolves.toBe("keep")
    await expect(stat(prisma.__lastStoragePath)).rejects.toThrow()
  })
})

function makeCandidate(overrides: Partial<ImportCandidate> = {}): ImportCandidate {
  return {
    animeTitle: "Example Anime",
    episodeTitle: "Episode 01",
    episodeNumber: 1,
    sourcePath: "/imports/Example Anime/Episode 01.mp4",
    extension: ".mp4",
    mimeType: "video/mp4",
    fileSizeBytes: 5n,
    playbackSupportStatus: "supported",
    ...overrides,
  }
}

async function makeTempDir() {
  const tempDir = path.join(os.tmpdir(), `watch-room-${crypto.randomUUID()}`)
  await mkdir(tempDir, { recursive: true })
  return tempDir
}

function makeImportPrisma(options: { failEpisodeCreate?: boolean } = {}) {
  const animes: Array<{ id: string, title: string, normalizedTitle: string }> = []
  const episodes: Array<{
    id: string
    animeId: string
    title: string
    normalizedTitle: string
    sourcePath: string
    storagePath: string
  }> = []

  const prisma = {
    __animes: animes,
    __episodes: episodes,
    __lastStoragePath: "",
    anime: {
      findUnique: async ({ where }: { where: { normalizedTitle?: string } }) => {
        if (!where.normalizedTitle) return null
        return animes.find((anime) => anime.normalizedTitle === where.normalizedTitle) ?? null
      },
      create: async ({ data }: { data: { title: string, normalizedTitle: string } }) => {
        const anime = { id: `anime-${animes.length + 1}`, ...data }
        animes.push(anime)
        return anime
      },
    },
    episode: {
      findUnique: async ({ where }: { where: { sourcePath: string } }) => {
        return episodes.find((episode) => episode.sourcePath === where.sourcePath) ?? null
      },
      findFirst: async ({ where }: {
        where: {
          animeId: string
          normalizedTitle: string
        }
      }) => {
        return episodes.find((episode) => episode.animeId === where.animeId
          && episode.normalizedTitle === where.normalizedTitle) ?? null
      },
      create: async ({ data }: {
        data: {
          animeId: string
          title: string
          normalizedTitle: string
          sourcePath: string
          storagePath: string
        }
      }) => {
        prisma.__lastStoragePath = data.storagePath
        if (options.failEpisodeCreate) throw new Error("episode create failed")
        const episode = { id: `episode-${episodes.length + 1}`, ...data }
        episodes.push(episode)
        return episode
      },
    },
  }

  return prisma as unknown as Parameters<typeof importCandidates>[2] & {
    __animes: typeof animes
    __episodes: typeof episodes
    __lastStoragePath: string
  }
}
