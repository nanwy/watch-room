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

  const library = anime.map((item) => ({
    id: item.id,
    title: item.title,
    episodes: item.episodes.map((episode) => ({
      id: episode.id,
      title: episode.title,
      episodeNumber: episode.episodeNumber,
      mimeType: episode.mimeType,
      playbackSupportStatus: episode.playbackSupportStatus,
      fileSizeBytes: episode.fileSizeBytes.toString(),
    })),
  }))
  const episodeCount = library.reduce((total, item) => total + item.episodes.length, 0)

  return (
    <main className="min-h-svh bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-8 lg:px-10">
        <header className="flex flex-col gap-6 border-b pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">媒体库</p>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">动漫库</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                扫描服务器导入目录，完成后即可在媒体库中选择剧集创建房间。
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6 text-sm">
            <div>
              <div className="text-2xl font-semibold tabular-nums">{library.length}</div>
              <div className="text-muted-foreground">动漫</div>
            </div>
            <div>
              <div className="text-2xl font-semibold tabular-nums">{episodeCount}</div>
              <div className="text-muted-foreground">剧集</div>
            </div>
          </div>
        </header>

        <section className="grid gap-4 border-b pb-8 lg:grid-cols-[1fr_28rem] lg:items-start">
          <div>
            <h2 className="text-base font-medium">扫描导入</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              读取 `MEDIA_IMPORT_DIR` 下的视频文件，导入媒体库，并把受管副本写入 `MEDIA_STORAGE_DIR`。
            </p>
          </div>
          <ImportScanButton />
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-base font-medium">已导入剧集</h2>
            <span className="text-sm text-muted-foreground">共 {episodeCount} 集</span>
          </div>
          <LibraryTable anime={library} />
        </section>
      </div>
    </main>
  )
}
