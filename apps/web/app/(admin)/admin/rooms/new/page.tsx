import Link from "next/link"

import { getPrisma } from "@workspace/db/client"
import { Button } from "@workspace/ui/components/button"

import { CreateRoomForm } from "@/components/admin/create-room-form"

export const dynamic = "force-dynamic"

export default async function NewRoomPage() {
  const library = await getPrisma().anime.findMany({
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
  const hasEpisodes = library.some((anime) => anime.episodes.length > 0)

  return (
    <main className="min-h-svh bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-10 px-6 py-8 lg:px-10">
        <header className="flex flex-col gap-6 border-b pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">观影房间</p>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">创建房间</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                选择起始剧集。打开房间链接的人都可以一起观看、聊天和控制播放。
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/admin/rooms">房间列表</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin/library">媒体库</Link>
            </Button>
          </div>
        </header>

        {hasEpisodes ? (
          <section className="border-b pb-8">
            <CreateRoomForm library={library} />
          </section>
        ) : (
          <section className="border-y py-12 text-sm text-muted-foreground">
            请先导入至少一集后再创建房间。
          </section>
        )}
      </div>
    </main>
  )
}
