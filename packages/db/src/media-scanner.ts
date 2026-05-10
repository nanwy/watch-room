import { randomUUID } from "node:crypto"
import { mkdir, readdir, stat, link, copyFile, unlink } from "node:fs/promises"
import path from "node:path"

import type { DbClient } from "./client.js"

const SUPPORTED_EXTENSIONS = new Set([".mp4", ".webm", ".mkv", ".mov"])

const MIME_BY_EXTENSION = new Map([
  [".mp4", "video/mp4"],
  [".webm", "video/webm"],
  [".mkv", "video/x-matroska"],
  [".mov", "video/quicktime"],
])

export type ImportCandidate = {
  animeTitle: string
  episodeTitle: string
  episodeNumber: number | null
  sourcePath: string
  extension: string
  mimeType: string
  fileSizeBytes: bigint
  playbackSupportStatus: "supported" | "maybeUnsupported"
}

export type ImportResult = {
  imported: number
  skipped: number
  conflicts: string[]
}

export async function discoverImportCandidates(importDir: string) {
  const candidates: ImportCandidate[] = []
  const seenKeys = new Set<string>()
  const animeEntries = await readdir(importDir, { withFileTypes: true }).catch(() => [])

  for (const animeEntry of animeEntries) {
    if (!animeEntry.isDirectory()) continue
    const animeTitle = animeEntry.name.trim()
    if (!animeTitle) continue

    const animeDir = path.join(importDir, animeEntry.name)
    const fileEntries = await readdir(animeDir, { withFileTypes: true })

    for (const fileEntry of fileEntries) {
      if (!fileEntry.isFile()) continue

      const extension = path.extname(fileEntry.name).toLowerCase()
      if (!SUPPORTED_EXTENSIONS.has(extension)) continue

      const episodeTitle = path.basename(fileEntry.name, extension).trim()
      const key = `${normalizeImportKey(animeTitle)}:${normalizeImportKey(episodeTitle)}`
      if (seenKeys.has(key)) continue
      seenKeys.add(key)

      const sourcePath = path.join(animeDir, fileEntry.name)
      const fileStat = await stat(sourcePath)

      candidates.push({
        animeTitle,
        episodeTitle,
        episodeNumber: parseEpisodeNumber(episodeTitle),
        sourcePath,
        extension,
        mimeType: MIME_BY_EXTENSION.get(extension) ?? "application/octet-stream",
        fileSizeBytes: BigInt(fileStat.size),
        playbackSupportStatus: extension === ".mp4" || extension === ".webm" ? "supported" : "maybeUnsupported",
      })
    }
  }

  return candidates.sort((a, b) => {
    const animeSort = a.animeTitle.localeCompare(b.animeTitle)
    if (animeSort !== 0) return animeSort
    return (a.episodeNumber ?? Number.MAX_SAFE_INTEGER) - (b.episodeNumber ?? Number.MAX_SAFE_INTEGER)
      || a.episodeTitle.localeCompare(b.episodeTitle)
  })
}

export async function importCandidates(
  candidates: ImportCandidate[],
  mediaStorageDir: string,
  prisma: DbClient,
): Promise<ImportResult> {
  const result: ImportResult = { imported: 0, skipped: 0, conflicts: [] }

  for (const candidate of candidates) {
    const normalizedAnimeTitle = normalizeImportKey(candidate.animeTitle)
    const normalizedEpisodeTitle = normalizeImportKey(candidate.episodeTitle)
    const existingSourceEpisode = await prisma.episode.findUnique({
      where: { sourcePath: candidate.sourcePath },
    })

    if (existingSourceEpisode) {
      result.skipped += 1
      continue
    }

    const existingAnime = await prisma.anime.findUnique({
      where: { normalizedTitle: normalizedAnimeTitle },
    })
    let createdAnimeId: string | null = null
    const anime = existingAnime ?? await prisma.anime.create({
      data: {
        title: candidate.animeTitle.trim(),
        normalizedTitle: normalizedAnimeTitle,
      },
    })
    if (!existingAnime) createdAnimeId = anime.id

    const existingEpisode = await prisma.episode.findFirst({
      where: {
        animeId: anime.id,
        normalizedTitle: normalizedEpisodeTitle,
      },
    })

    if (existingEpisode) {
      result.skipped += 1
      continue
    }

    const animeDir = path.join(mediaStorageDir, `anime_${anime.id}`)
    const storagePath = path.join(animeDir, `episode_${randomUUID()}${candidate.extension}`)

    let storageCreated = false
    try {
      await mkdir(animeDir, { recursive: true })
      await link(candidate.sourcePath, storagePath)
      storageCreated = true
    } catch {
      try {
        await copyFile(candidate.sourcePath, storagePath)
        storageCreated = true
      } catch (error) {
        if (createdAnimeId) {
          await prisma.anime.delete({ where: { id: createdAnimeId } }).catch(() => undefined)
        }
        throw error
      }
    }

    try {
      await prisma.episode.create({
        data: {
          animeId: anime.id,
          title: candidate.episodeTitle.trim(),
          normalizedTitle: normalizedEpisodeTitle,
          episodeNumber: candidate.episodeNumber,
          sourcePath: candidate.sourcePath,
          storagePath,
          mimeType: candidate.mimeType,
          fileSizeBytes: candidate.fileSizeBytes,
          playbackSupportStatus: candidate.playbackSupportStatus,
        },
      })
    } catch (error) {
      if (storageCreated) {
        await unlink(storagePath).catch(() => undefined)
      }
      throw error
    }

    result.imported += 1
  }

  return result
}

function parseEpisodeNumber(title: string) {
  const seasonEpisode = title.match(/S\d+E(\d+)/i)
  if (seasonEpisode?.[1]) return Number.parseInt(seasonEpisode[1], 10)

  const firstNumber = title.match(/\d+/)
  return firstNumber?.[0] ? Number.parseInt(firstNumber[0], 10) : null
}

export function normalizeImportKey(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ")
}
