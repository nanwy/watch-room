import { rm } from "node:fs/promises"
import path from "node:path"

import { getPrisma } from "@workspace/db/client"

import { isAdminRequest, unauthorizedResponse } from "../../../../../../lib/admin-auth"

type PrismaClient = ReturnType<typeof getPrisma>
type EpisodeForDelete = {
  id: string
  animeId: string
  storagePath: string
}

export type DeleteEpisodeDeps = {
  getEnv: (key: string) => string | undefined
  getPrismaClient: () => PrismaClient
  removeFile: (filePath: string) => Promise<void>
}

const defaultDeps: DeleteEpisodeDeps = {
  getEnv: (key) => process.env[key],
  getPrismaClient: getPrisma,
  removeFile: (filePath) => rm(filePath, { force: true }),
}

function isInsideStorage(storageRoot: string, filePath: string) {
  const absoluteStorage = path.resolve(storageRoot)
  const absoluteFile = path.resolve(filePath)
  return absoluteFile === absoluteStorage || absoluteFile.startsWith(absoluteStorage + path.sep)
}

export function createDeleteEpisodeHandler(deps: DeleteEpisodeDeps = defaultDeps) {
  return async function handleDeleteEpisode(
    request: Request,
    context: { params: Promise<{ episodeId: string }> },
  ) {
    if (!isAdminRequest(request)) {
      return unauthorizedResponse()
    }

    const storageRoot = deps.getEnv("MEDIA_STORAGE_DIR")
    if (!storageRoot) {
      return Response.json({ error: "MEDIA_STORAGE_DIR must be configured" }, { status: 500 })
    }

    const { episodeId } = await context.params
    const prisma = deps.getPrismaClient()
    const episode = await prisma.episode.findUnique({
      where: { id: episodeId },
      select: { id: true, animeId: true, storagePath: true },
    }) as EpisodeForDelete | null

    if (!episode) {
      return Response.json({ error: "Episode not found" }, { status: 404 })
    }

    if (!isInsideStorage(storageRoot, episode.storagePath)) {
      return Response.json({ error: "Episode file is outside MEDIA_STORAGE_DIR" }, { status: 409 })
    }

    const [roomCount, stateCount] = await Promise.all([
      prisma.room.count({ where: { currentEpisodeId: episode.id } }),
      prisma.roomPlaybackState.count({ where: { episodeId: episode.id } }),
    ])
    if (roomCount > 0 || stateCount > 0) {
      return Response.json({ error: "Episode is used by an existing room" }, { status: 409 })
    }

    await prisma.episode.delete({ where: { id: episode.id } })
    await deps.removeFile(episode.storagePath)

    const remainingEpisodes = await prisma.episode.count({ where: { animeId: episode.animeId } })
    if (remainingEpisodes === 0) {
      const [animeRoomCount, animeStateCount] = await Promise.all([
        prisma.room.count({ where: { currentAnimeId: episode.animeId } }),
        prisma.roomPlaybackState.count({ where: { animeId: episode.animeId } }),
      ])
      if (animeRoomCount === 0 && animeStateCount === 0) {
        await prisma.anime.delete({ where: { id: episode.animeId } })
      }
    }

    return Response.json({ deleted: true })
  }
}
