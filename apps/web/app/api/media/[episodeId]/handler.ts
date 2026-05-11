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

function isRemoteUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}

function trimSlashes(value: string) {
  return value.replace(/^\/+|\/+$/g, "")
}

function toAccelRedirectPath(prefix: string, relativePath: string) {
  const normalizedRelative = relativePath.split(path.sep).join("/")
  const encodedRelative = normalizedRelative
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")
  return `/${trimSlashes(prefix)}/${encodedRelative}`
}

function resolveLocalMedia(
  filePath: string,
  storageRoot: string,
  accelPrefix?: string,
) {
  const absoluteStorage = path.resolve(storageRoot)
  const absoluteFile = path.resolve(filePath)
  if (!absoluteFile.startsWith(absoluteStorage + path.sep) && absoluteFile !== absoluteStorage) {
    return null
  }

  const relativePath = path.relative(absoluteStorage, absoluteFile)
  return {
    absoluteFile,
    accelRedirectPath: accelPrefix ? toAccelRedirectPath(accelPrefix, relativePath) : null,
  }
}

export function createMediaHandler(deps: MediaDeps = defaultDeps) {
  return async function handler(
    request: Request,
    context: { params: Promise<{ episodeId: string }> },
  ) {
    const { episodeId } = await context.params
    const episode = await deps.findEpisode(deps.getPrismaClient(), episodeId)
    if (!episode) {
      return Response.json({ error: "Not found" }, { status: 404 })
    }

    if (isRemoteUrl(episode.storagePath)) {
      return Response.redirect(episode.storagePath, 302)
    }

    const mediaStorageRoot = deps.getEnv("MEDIA_STORAGE_DIR")
    if (!mediaStorageRoot) {
      return Response.json({ error: "Media storage not configured" }, { status: 500 })
    }

    const hlsStorageRoot = deps.getEnv("MEDIA_HLS_DIR")
    const hlsAccelPrefix = deps.getEnv("MEDIA_HLS_ACCEL_REDIRECT_PREFIX")
    const mediaAccelPrefix = deps.getEnv("MEDIA_ACCEL_REDIRECT_PREFIX")
    const resolved =
      hlsStorageRoot && hlsAccelPrefix
        ? resolveLocalMedia(episode.storagePath, hlsStorageRoot, hlsAccelPrefix)
          ?? resolveLocalMedia(episode.storagePath, mediaStorageRoot, mediaAccelPrefix)
        : resolveLocalMedia(episode.storagePath, mediaStorageRoot, mediaAccelPrefix)

    if (!resolved) {
      return Response.json({ error: "Not found" }, { status: 404 })
    }

    if (resolved.accelRedirectPath) {
      return new Response(null, {
        status: 200,
        headers: {
          "x-accel-redirect": resolved.accelRedirectPath,
          "content-type": episode.mimeType,
          "accept-ranges": "bytes",
          "cache-control": "private, max-age=3600",
        },
      })
    }

    let stat
    try {
      stat = statSync(resolved.absoluteFile)
    } catch {
      return Response.json({ error: "Not found" }, { status: 404 })
    }

    const totalSize = stat.size
    const rangeHeader = request.headers.get("range")
    if (!rangeHeader) {
      const stream = Readable.toWeb(createReadStream(resolved.absoluteFile)) as ReadableStream
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

    const stream = Readable.toWeb(createReadStream(resolved.absoluteFile, { start, end })) as ReadableStream
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
