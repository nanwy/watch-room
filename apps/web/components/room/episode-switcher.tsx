"use client"
import { useQuery } from "@tanstack/react-query"

import type { PlaybackControlInput } from "@workspace/shared/events"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"

import { useRoomStore } from "@/store/room-store"

type LibraryAnime = {
  id: string
  title: string
  episodes: { id: string; title: string; episodeNumber: number | null }[]
}

export function EpisodeSwitcher({
  roomSlug, clientId, onSwitch,
}: {
  roomSlug: string
  clientId: string
  onSwitch: (payload: PlaybackControlInput) => void
}) {
  const room = useRoomStore((s) => s.room)
  const { data } = useQuery<LibraryAnime[]>({
    queryKey: ["library"],
    queryFn: async () => {
      const res = await fetch("/api/library")
      if (!res.ok) throw new Error(`library fetch failed: ${res.status}`)
      return res.json()
    },
  })

  if (!room || !data) return null
  const animeOptions = data
  const currentAnime = data.find((a) => a.id === room.currentAnime.id) ?? data[0]
  if (!currentAnime) return null

  return (
    <div className="flex flex-wrap gap-3 text-sm">
      <label className="flex items-center gap-2">
        <span className="text-muted-foreground">动漫</span>
        <Select
          value={room.currentAnime.id}
          onValueChange={(nextAnimeId) => {
            const next = animeOptions.find((a) => a.id === nextAnimeId)
            const firstEpisode = next?.episodes[0]
            if (!next || !firstEpisode) return
            onSwitch({
              type: "switchAnime",
              roomSlug, clientId,
              animeId: next.id,
              episodeId: firstEpisode.id,
            })
          }}
        >
          <SelectTrigger className="w-48" size="sm">
            <SelectValue placeholder="选择动漫" />
          </SelectTrigger>
          <SelectContent>
            {animeOptions.map((a) => (
              <SelectItem key={a.id} value={a.id}>{a.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>
      <label className="flex items-center gap-2">
        <span className="text-muted-foreground">剧集</span>
        <Select
          value={room.currentEpisode.id}
          onValueChange={(nextEpisodeId) => {
            onSwitch({
              type: "switchEpisode",
              roomSlug, clientId,
              animeId: currentAnime.id,
              episodeId: nextEpisodeId,
            })
          }}
        >
          <SelectTrigger className="w-64" size="sm">
            <SelectValue placeholder="选择剧集" />
          </SelectTrigger>
          <SelectContent>
            {currentAnime.episodes.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {e.episodeNumber !== null ? `${String(e.episodeNumber).padStart(2, "0")}. ` : ""}{e.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>
    </div>
  )
}
