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
  test("returns 404 when episode is missing", async () => {
    const handler = createMediaHandler({
      findEpisode: vi.fn().mockResolvedValue(null),
      getEnv: () => storageRoot,
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
      getEnv: () => storageRoot,
      getPrismaClient: () => ({}) as never,
    })
    const res = await handler(new Request("http://x"), { params: Promise.resolve({ episodeId: "b" }) })
    expect(res.status).toBe(200)
    expect(res.headers.get("content-length")).toBe("10")
    expect(res.headers.get("content-type")).toBe("video/mp4")
  })

  test("returns 206 for valid Range", async () => {
    const handler = createMediaHandler({
      findEpisode: vi.fn().mockResolvedValue({
        id: "b", storagePath: path.join(storageRoot, "anime_a", "episode_b.mp4"), mimeType: "video/mp4",
      }),
      getEnv: () => storageRoot,
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
      getEnv: () => storageRoot,
      getPrismaClient: () => ({}) as never,
    })
    const res = await handler(new Request("http://x"), { params: Promise.resolve({ episodeId: "b" }) })
    expect(res.status).toBe(404)
  })
})
