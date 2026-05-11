import Link from "next/link"

import { getPrisma } from "@workspace/db/client"
import { Button } from "@workspace/ui/components/button"

import { RoomListTable } from "@/components/admin/room-list-table"

export const dynamic = "force-dynamic"

export default async function RoomsPage() {
  const rooms = await getPrisma().room.findMany({
    orderBy: { lastActiveAt: "desc" },
    include: {
      currentAnime: { select: { title: true } },
      currentEpisode: { select: { title: true, episodeNumber: true } },
      _count: { select: { chatMessages: true, memberSessions: true } },
    },
  })
  const roomList = rooms.map((room) => ({
    id: room.id,
    slug: room.slug,
    currentAnime: room.currentAnime,
    currentEpisode: room.currentEpisode,
    createdAt: room.createdAt.toISOString(),
    lastActiveAt: room.lastActiveAt.toISOString(),
    _count: room._count,
  }))

  return (
    <main className="min-h-svh bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-8 lg:px-10">
        <header className="flex flex-col gap-6 border-b pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">观影房间</p>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">房间列表</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                查看已创建房间，删除不再使用的房间记录。删除房间不会删除媒体库资源。
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/admin/library">媒体库</Link>
            </Button>
            <Button asChild>
              <Link href="/admin/rooms/new">创建房间</Link>
            </Button>
          </div>
        </header>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-base font-medium">已创建房间</h2>
            <span className="text-sm text-muted-foreground">共 {roomList.length} 个</span>
          </div>
          <RoomListTable rooms={roomList} />
        </section>
      </div>
    </main>
  )
}
