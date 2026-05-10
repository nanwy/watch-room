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
            <p className="text-sm font-medium text-muted-foreground">Watch room</p>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">Create a room</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Choose the first episode. Everyone who opens the room link can watch, chat, and control playback.
              </p>
            </div>
          </div>
          <Button asChild variant="outline">
            <Link href="/admin/library">Media library</Link>
          </Button>
        </header>

        {hasEpisodes ? (
          <section className="border-b pb-8">
            <CreateRoomForm library={library} />
          </section>
        ) : (
          <section className="border-y py-12 text-sm text-muted-foreground">
            Import at least one episode before creating a room.
          </section>
        )}
      </div>
    </main>
  )
}
