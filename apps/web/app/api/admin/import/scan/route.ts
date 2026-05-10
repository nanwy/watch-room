import { getPrisma } from "@workspace/db/client"
import {
  discoverImportCandidates,
  importCandidates,
  type ImportResult,
} from "@workspace/db/media-scanner"

import { isAdminRequest, unauthorizedResponse } from "../../../../../lib/admin-auth"

export const runtime = "nodejs"

type ImportScanDeps = {
  discover: typeof discoverImportCandidates
  importDiscovered: typeof importCandidates
  getPrismaClient: () => Parameters<typeof importCandidates>[2]
  getEnv: (key: string) => string | undefined
}

const defaultDeps: ImportScanDeps = {
  discover: discoverImportCandidates,
  importDiscovered: importCandidates,
  getPrismaClient: getPrisma,
  getEnv: (key) => process.env[key],
}

export function createImportScanHandler(deps: ImportScanDeps = defaultDeps) {
  return async function handleImportScan(request: Request) {
    if (!isAdminRequest(request)) {
      return unauthorizedResponse()
    }

    const importDir = deps.getEnv("MEDIA_IMPORT_DIR")
    const storageDir = deps.getEnv("MEDIA_STORAGE_DIR")

    if (!importDir || !storageDir) {
      return Response.json(
        { error: "MEDIA_IMPORT_DIR and MEDIA_STORAGE_DIR must be configured" },
        { status: 500 },
      )
    }

    const candidates = await deps.discover(importDir)
    const result: ImportResult = await deps.importDiscovered(
      candidates,
      storageDir,
      deps.getPrismaClient(),
    )

    return Response.json({
      candidates: candidates.length,
      imported: result.imported,
      skipped: result.skipped,
      conflicts: result.conflicts,
    })
  }
}

export const POST = createImportScanHandler()
