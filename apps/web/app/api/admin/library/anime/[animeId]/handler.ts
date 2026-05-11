import { rm } from "node:fs/promises"
import path from "node:path"

import { getPrisma } from "@workspace/db/client"

import { isAdminRequest, unauthorizedResponse } from "../../../../../../lib/admin-auth"

type PrismaClient = ReturnType<typeof getPrisma>
type EpisodeFile = { storagePath: string }

export type DeleteAnimeDeps = {
  getEnv: (key: string) => string | undefined
  getPrismaClient: () => PrismaClient
  removeFile: (filePath: string) => Promise<void>
}

const defaultDeps: DeleteAnimeDeps = {
  getEnv: (key) => process.env[key],
  getPrismaClient: getPrisma,
  removeFile: (filePath) => rm(filePath, { force: true }),
}

function isInsideStorage(storageRoot: string, filePath: string) {
  const absoluteStorage = path.resolve(storageRoot)
  const absoluteFile = path.resolve(filePath)
  return absoluteFile === absoluteStorage || absoluteFile.startsWith(absoluteStorage + path.sep)
}

export function createDeleteAnimeHandler(deps: DeleteAnimeDeps = defaultDeps) {
  return async function handleDeleteAnime(
    request: Request,
    context: { params: Promise<{ animeId: string }> },
  ) {
    if (!isAdminRequest(request)) {
      return unauthorizedResponse()
    }

    const storageRoot = deps.getEnv("MEDIA_STORAGE_DIR")
    if (!storageRoot) {
      return Response.json({ error: "MEDIA_STORAGE_DIR must be configured" }, { status: 500 })
    }

    const { animeId } = await context.params
    const prisma = deps.getPrismaClient()
    const anime = await prisma.anime.findUnique({
      where: { id: animeId },
      select: {
        id: true,
        episodes: { select: { storagePath: true } },
      },
    }) as { id: string; episodes: EpisodeFile[] } | null

    if (!anime) {
      return Response.json({ error: "Anime not found" }, { status: 404 })
    }

    const unsafeEpisode = anime.episodes.find((episode) => !isInsideStorage(storageRoot, episode.storagePath))
    if (unsafeEpisode) {
      return Response.json({ error: "Anime contains a file outside MEDIA_STORAGE_DIR" }, { status: 409 })
    }

    const [roomCount, stateCount] = await Promise.all([
      prisma.room.count({ where: { currentAnimeId: anime.id } }),
      prisma.roomPlaybackState.count({ where: { animeId: anime.id } }),
    ])
    if (roomCount > 0 || stateCount > 0) {
      return Response.json({ error: "Anime is used by an existing room" }, { status: 409 })
    }

    await prisma.anime.delete({ where: { id: anime.id } })
    await Promise.all(anime.episodes.map((episode) => deps.removeFile(episode.storagePath)))

    return Response.json({ deleted: true, episodes: anime.episodes.length })
  }
}
