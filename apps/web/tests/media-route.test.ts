import { mkdirSync, writeFileSync, mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import { createMediaHandler } from "../app/api/media/[episodeId]/handler"

let storageRoot = ""

beforeEach(() => {
  storageRoot = mkdtempSync(path.join(tmpdir(), "media-route-"))
  mkdirSync(path.join(storageRoot, "anime_a"))
  writeFileSync(path.join(storageRoot, "anime_a", "episode_b.mp4"), Buffer.from("0123456789"))
})

afterEach(() => rmSync(storageRoot, { recursive: true, force: true }))

describe("GET /api/media/[episodeId]", () => {
  function getMediaEnv(key: string) {
    return key === "MEDIA_STORAGE_DIR" ? storageRoot : undefined
  }

  test("returns 404 when episode is missing", async () => {
    const handler = createMediaHandler({
      findEpisode: vi.fn().mockResolvedValue(null),
      getEnv: getMediaEnv,
      getPrismaClient: () => ({}) as never,
    })
    const res = await handler(new Request("http://x"), { params: Promise.resolve({ episodeId: "missing" }) })
    expect(res.status).toBe(404)
  })

  test("returns 200 with full body when no Range header", async () => {
    const handler = createMediaHandler({
      findEpisode: vi.fn().mockResolvedValue({
        id: "b", storagePath: path.join(storageRoot, "anime_a", "episode_b.mp4"), mimeType: "video/mp4",
      }),
      getEnv: getMediaEnv,
      getPrismaClient: () => ({}) as never,
    })
    const res = await handler(new Request("http://x"), { params: Promise.resolve({ episodeId: "b" }) })
    expect(res.status).toBe(200)
    expect(res.headers.get("content-length")).toBe("10")
    expect(res.headers.get("content-type")).toBe("video/mp4")
  })

  test("returns an internal Nginx redirect when accel redirect is enabled", async () => {
    const handler = createMediaHandler({
      findEpisode: vi.fn().mockResolvedValue({
        id: "b", storagePath: path.join(storageRoot, "anime_a", "episode_b.mp4"), mimeType: "video/mp4",
      }),
      getEnv: (key) => {
        if (key === "MEDIA_ACCEL_REDIRECT_PREFIX") return "/protected-media"
        return getMediaEnv(key)
      },
      getPrismaClient: () => ({}) as never,
    })
    const res = await handler(new Request("http://x"), { params: Promise.resolve({ episodeId: "b" }) })
    expect(res.status).toBe(200)
    expect(res.body).toBeNull()
    expect(res.headers.get("x-accel-redirect")).toBe("/protected-media/anime_a/episode_b.mp4")
    expect(res.headers.get("content-type")).toBe("video/mp4")
  })

  test("redirects remote media URLs without touching local storage", async () => {
    const handler = createMediaHandler({
      findEpisode: vi.fn().mockResolvedValue({
        id: "b", storagePath: "http://img.nanwayan.cn/oni1.mp4", mimeType: "video/mp4",
      }),
      getEnv: () => undefined,
      getPrismaClient: () => ({}) as never,
    })
    const res = await handler(new Request("http://x"), { params: Promise.resolve({ episodeId: "b" }) })
    expect(res.status).toBe(302)
    expect(res.headers.get("location")).toBe("http://img.nanwayan.cn/oni1.mp4")
  })

  test("returns an internal Nginx redirect for HLS media", async () => {
    const hlsRoot = path.join(storageRoot, "hls")
    mkdirSync(path.join(hlsRoot, "anime_a"), { recursive: true })
    writeFileSync(path.join(hlsRoot, "anime_a", "index.m3u8"), "#EXTM3U")
    const handler = createMediaHandler({
      findEpisode: vi.fn().mockResolvedValue({
        id: "b",
        storagePath: path.join(hlsRoot, "anime_a", "index.m3u8"),
        mimeType: "application/vnd.apple.mpegurl",
      }),
      getEnv: (key) => {
        if (key === "MEDIA_STORAGE_DIR") return storageRoot
        if (key === "MEDIA_HLS_DIR") return hlsRoot
        if (key === "MEDIA_HLS_ACCEL_REDIRECT_PREFIX") return "/protected-hls"
        return undefined
      },
      getPrismaClient: () => ({}) as never,
    })
    const res = await handler(new Request("http://x"), { params: Promise.resolve({ episodeId: "b" }) })
    expect(res.status).toBe(200)
    expect(res.headers.get("x-accel-redirect")).toBe("/protected-hls/anime_a/index.m3u8")
    expect(res.headers.get("content-type")).toBe("application/vnd.apple.mpegurl")
  })

  test("returns 206 for valid Range", async () => {
    const handler = createMediaHandler({
      findEpisode: vi.fn().mockResolvedValue({
        id: "b", storagePath: path.join(storageRoot, "anime_a", "episode_b.mp4"), mimeType: "video/mp4",
      }),
      getEnv: getMediaEnv,
      getPrismaClient: () => ({}) as never,
    })
    const req = new Request("http://x", { headers: { range: "bytes=2-5" } })
    const res = await handler(req, { params: Promise.resolve({ episodeId: "b" }) })
    expect(res.status).toBe(206)
    expect(res.headers.get("content-range")).toBe("bytes 2-5/10")
    expect(res.headers.get("content-length")).toBe("4")
  })

  test("rejects path traversal outside MEDIA_STORAGE_DIR", async () => {
    const handler = createMediaHandler({
      findEpisode: vi.fn().mockResolvedValue({
        id: "b", storagePath: "/etc/passwd", mimeType: "text/plain",
      }),
      getEnv: getMediaEnv,
      getPrismaClient: () => ({}) as never,
    })
    const res = await handler(new Request("http://x"), { params: Promise.resolve({ episodeId: "b" }) })
    expect(res.status).toBe(404)
  })
})
