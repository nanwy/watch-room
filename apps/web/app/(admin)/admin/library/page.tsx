import { getPrisma } from "@workspace/db/client"

import { ImportScanButton } from "@/components/admin/import-scan-button"
import { LibraryTable } from "@/components/admin/library-table"

export const dynamic = "force-dynamic"

export default async function LibraryPage() {
  const anime = await getPrisma().anime.findMany({
    orderBy: { title: "asc" },
    include: {
      episodes: {
        orderBy: [
          { episodeNumber: "asc" },
          { title: "asc" },
        ],
      },
    },
  })

  const episodeCount = anime.reduce((total, item) => total + item.episodes.length, 0)

  return (
    <main className="min-h-svh bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-8 lg:px-10">
        <header className="flex flex-col gap-6 border-b pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">Media library</p>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">Anime archive</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Scan the server import folder, then use this library when creating watch rooms.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6 text-sm">
            <div>
              <div className="text-2xl font-semibold tabular-nums">{anime.length}</div>
              <div className="text-muted-foreground">Anime</div>
            </div>
            <div>
              <div className="text-2xl font-semibold tabular-nums">{episodeCount}</div>
              <div className="text-muted-foreground">Episodes</div>
            </div>
          </div>
        </header>

        <section className="grid gap-4 border-b pb-8 lg:grid-cols-[1fr_28rem] lg:items-start">
          <div>
            <h2 className="text-base font-medium">Scan imports</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Reads `MEDIA_IMPORT_DIR`, imports supported video files, and stores managed copies under `MEDIA_STORAGE_DIR`.
            </p>
          </div>
          <ImportScanButton />
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-base font-medium">Imported episodes</h2>
            <span className="text-sm text-muted-foreground">{episodeCount} total</span>
          </div>
          <LibraryTable anime={anime} />
        </section>
      </div>
    </main>
  )
}
