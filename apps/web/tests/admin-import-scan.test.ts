import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import type { importCandidates } from "@workspace/db/media-scanner"

import { createImportScanHandler } from "../app/api/admin/import/scan/route"

const ORIGINAL_ENV = process.env

describe("admin import scan route", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    process.env = {
      ...ORIGINAL_ENV,
      ADMIN_PASSCODE: "secret",
      MEDIA_IMPORT_DIR: "/data/imports",
      MEDIA_STORAGE_DIR: "/data/media",
    }
  })

  afterEach(() => {
    process.env = ORIGINAL_ENV
  })

  test("rejects requests without the admin passcode", async () => {
    const discover = vi.fn()
    const handler = createImportScanHandler({
      discover,
      importDiscovered: vi.fn(),
      getPrismaClient: vi.fn(),
      getEnv: (key) => process.env[key],
    })

    const response = await handler(new Request("http://app.test/api/admin/import/scan", {
      method: "POST",
    }))

    expect(response.status).toBe(401)
    expect(discover).not.toHaveBeenCalled()
  })

  test("runs scan import for requests with the admin passcode", async () => {
    const candidates = [
      {
        animeTitle: "Example Anime",
        episodeTitle: "Episode 01",
        episodeNumber: 1,
        sourcePath: "/data/imports/Example Anime/Episode 01.mp4",
        extension: ".mp4",
        mimeType: "video/mp4",
        fileSizeBytes: 10n,
        playbackSupportStatus: "supported" as const,
      },
    ]
    const prisma = {} as Parameters<typeof importCandidates>[2]
    const discover = vi.fn().mockResolvedValue(candidates)
    const importDiscovered = vi.fn().mockResolvedValue({
      imported: 1,
      skipped: 0,
      conflicts: [],
    })
    const handler = createImportScanHandler({
      discover,
      importDiscovered,
      getPrismaClient: vi.fn(() => prisma),
      getEnv: (key) => process.env[key],
    })

    const response = await handler(new Request("http://app.test/api/admin/import/scan", {
      method: "POST",
      headers: {
        "x-admin-passcode": "secret",
      },
    }))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      candidates: 1,
      imported: 1,
      skipped: 0,
      conflicts: [],
    })
    expect(discover).toHaveBeenCalledWith("/data/imports")
    expect(importDiscovered).toHaveBeenCalledWith(candidates, "/data/media", prisma)
  })
})
