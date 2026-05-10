import { createReadStream, statSync } from "node:fs"
import path from "node:path"
import { Readable } from "node:stream"

import { getPrisma } from "@workspace/db/client"

type Episode = { id: string; storagePath: string; mimeType: string }

export type MediaDeps = {
  findEpisode: (prisma: ReturnType<typeof getPrisma>, episodeId: string) => Promise<Episode | null>
  getEnv: (key: string) => string | undefined
  getPrismaClient: () => ReturnType<typeof getPrisma>
}

const defaultDeps: MediaDeps = {
  findEpisode: async (prisma, episodeId) =>
    prisma.episode.findUnique({
      where: { id: episodeId },
      select: { id: true, storagePath: true, mimeType: true },
    }),
  getEnv: (key) => process.env[key],
  getPrismaClient: getPrisma,
}

export function createMediaHandler(deps: MediaDeps = defaultDeps) {
  return async function handler(
    request: Request,
    context: { params: Promise<{ episodeId: string }> },
  ) {
    const { episodeId } = await context.params
    const storageRoot = deps.getEnv("MEDIA_STORAGE_DIR")
    if (!storageRoot) {
      return Response.json({ error: "Media storage not configured" }, { status: 500 })
    }

    const episode = await deps.findEpisode(deps.getPrismaClient(), episodeId)
    if (!episode) {
      return Response.json({ error: "Not found" }, { status: 404 })
    }

    const absoluteStorage = path.resolve(storageRoot)
    const absoluteFile = path.resolve(episode.storagePath)
    if (!absoluteFile.startsWith(absoluteStorage + path.sep) && absoluteFile !== absoluteStorage) {
      return Response.json({ error: "Not found" }, { status: 404 })
    }

    let stat
    try {
      stat = statSync(absoluteFile)
    } catch {
      return Response.json({ error: "Not found" }, { status: 404 })
    }

    const totalSize = stat.size
    const rangeHeader = request.headers.get("range")
    if (!rangeHeader) {
      const stream = Readable.toWeb(createReadStream(absoluteFile)) as ReadableStream
      return new Response(stream, {
        status: 200,
        headers: {
          "content-type": episode.mimeType,
          "content-length": String(totalSize),
          "accept-ranges": "bytes",
          "cache-control": "private, max-age=0",
        },
      })
    }

    const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader)
    if (!match) {
      return new Response(null, { status: 416, headers: { "content-range": `bytes */${totalSize}` } })
    }
    const start = match[1] === "" ? totalSize - Number(match[2]) : Number(match[1])
    const end = match[2] === "" ? totalSize - 1 : Math.min(Number(match[2]), totalSize - 1)
    if (Number.isNaN(start) || Number.isNaN(end) || start < 0 || start > end || start >= totalSize) {
      return new Response(null, { status: 416, headers: { "content-range": `bytes */${totalSize}` } })
    }

    const stream = Readable.toWeb(createReadStream(absoluteFile, { start, end })) as ReadableStream
    return new Response(stream, {
      status: 206,
      headers: {
        "content-type": episode.mimeType,
        "content-length": String(end - start + 1),
        "content-range": `bytes ${start}-${end}/${totalSize}`,
        "accept-ranges": "bytes",
        "cache-control": "private, max-age=0",
      },
    })
  }
}
