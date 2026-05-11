"use client"
import { useEffect, useState } from "react"
import { useQuery } from "@tanstack/react-query"

import type { PlaybackControlInput } from "@workspace/shared/events"
import { Button } from "@workspace/ui/components/button"
import { Popover, PopoverContent, PopoverTrigger } from "@workspace/ui/components/popover"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@workspace/ui/components/sheet"

import { useRoomStore } from "@/store/room-store"

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`)
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener("change", update)
    return () => mq.removeEventListener("change", update)
  }, [breakpoint])
  return isMobile
}

type LibraryAnime = {
  id: string
  title: string
  episodes: { id: string; title: string; episodeNumber: number | null }[]
}

type Props = {
  roomSlug: string
  clientId: string
  onSwitch: (payload: PlaybackControlInput) => void
}

export function EpisodeSwitcher({ roomSlug, clientId, onSwitch }: Props) {
  const room = useRoomStore((s) => s.room)
  const setIsSwitching = useRoomStore((s) => s.setIsSwitching)
  const [open, setOpen] = useState(false)
  const isMobile = useIsMobile()
  const { data } = useQuery<LibraryAnime[]>({
    queryKey: ["library"],
    queryFn: async () => {
      const res = await fetch("/api/library")
      if (!res.ok) throw new Error(`library fetch failed: ${res.status}`)
      return res.json()
    },
  })

  if (!room || !data) return null
  const currentRoom = room
  const currentAnime = data.find((a) => a.id === currentRoom.currentAnime.id) ?? data[0]
  if (!currentAnime) return null
  const currentEpisode = currentAnime.episodes.find((e) => e.id === currentRoom.currentEpisode.id)
  const currentLabel = currentEpisode
    ? `${currentEpisode.episodeNumber !== null ? `第${currentEpisode.episodeNumber}话 · ` : ""}${currentEpisode.title}`
    : currentAnime.title

  function handlePick(animeId: string, episodeId: string, kind: "anime" | "episode") {
    if (animeId === currentRoom.currentAnime.id && episodeId === currentRoom.currentEpisode.id) {
      setOpen(false)
      return
    }
    setIsSwitching(true)
    onSwitch({
      type: kind === "anime" ? "switchAnime" : "switchEpisode",
      roomSlug,
      clientId,
      animeId,
      episodeId,
    })
    setOpen(false)
  }

  const list = (
    <EpisodeList
      library={data}
      currentAnimeId={currentAnime.id}
      currentEpisodeId={currentRoom.currentEpisode.id}
      onPick={handlePick}
    />
  )

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            type="button"
            size="sm"
            aria-label="切换剧集"
            className="rounded-full border-0 bg-[var(--ink-deeper)] px-3 text-xs font-medium text-[var(--mist-100)] hover:bg-[var(--ink-surface-hover)]"
          >
            <ListIcon />
            <span className="ml-1.5 max-w-[140px] truncate">{currentLabel}</span>
          </Button>
        </SheetTrigger>
        <SheetContent
          side="bottom"
          className="max-h-[80vh] border-[var(--ink-border)] bg-[var(--ink-surface)] p-0 text-[var(--mist-100)]"
        >
          <SheetTitle className="px-4 pt-4 text-base font-semibold text-[var(--mist-100)]">选集</SheetTitle>
          <div className="overflow-y-auto pb-6">{list}</div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          size="sm"
          className="max-w-[min(360px,32vw)] rounded-full border-0 bg-[var(--ink-deeper)] text-xs font-medium text-[var(--mist-100)] hover:bg-[var(--ink-surface-hover)]"
        >
          <ListIcon />
          <span className="ml-1.5 truncate">{currentLabel}</span>
          <ChevronDown />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[400px] max-w-[90vw] border-[var(--ink-border)] bg-[var(--ink-surface)] p-0 text-[var(--mist-100)]"
      >
        {list}
      </PopoverContent>
    </Popover>
  )
}

function EpisodeList({
  library,
  currentAnimeId,
  currentEpisodeId,
  onPick,
}: {
  library: LibraryAnime[]
  currentAnimeId: string
  currentEpisodeId: string
  onPick: (animeId: string, episodeId: string, kind: "anime" | "episode") => void
}) {
  const [selectedAnimeId, setSelectedAnimeId] = useState(currentAnimeId)
  useEffect(() => {
    setSelectedAnimeId(currentAnimeId)
  }, [currentAnimeId])
  const selected = library.find((a) => a.id === selectedAnimeId) ?? library[0]
  if (!selected) return null
  return (
    <div className="flex max-h-[60vh] flex-col">
      <div className="border-b border-[var(--ink-border)] px-3 pt-3 pb-2">
        <p className="mb-2 text-[10px] font-medium tracking-wider text-[var(--mist-500)] uppercase">番剧</p>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {library.map((a) => {
            const active = a.id === selectedAnimeId
            return (
              <Button
                key={a.id}
                type="button"
                size="xs"
                onClick={() => setSelectedAnimeId(a.id)}
                className={`shrink-0 border-0 ${
                  active
                    ? "bg-[var(--bilibili-pink)] text-[var(--mist-100)] hover:bg-[var(--bilibili-pink-deep)]"
                    : "bg-[var(--ink-deeper)] text-[var(--mist-300)] hover:bg-[var(--ink-surface-hover)] hover:text-[var(--mist-100)]"
                }`}
              >
                {a.title}
              </Button>
            )
          })}
        </div>
      </div>
      <ul className="flex-1 overflow-y-auto p-2">
        {selected.episodes.length === 0 ? (
          <li className="px-3 py-6 text-center text-xs text-[var(--mist-500)]">这一集还没上传，鸽了</li>
        ) : (
          selected.episodes.map((e) => {
            const isCurrent = e.id === currentEpisodeId && selected.id === currentAnimeId
            return (
              <li key={e.id}>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() =>
                    onPick(selected.id, e.id, selected.id === currentAnimeId ? "episode" : "anime")
                  }
                  className={`flex h-auto w-full justify-start gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-normal whitespace-normal ${
                    isCurrent
                      ? "bg-[var(--bilibili-pink-glow)] text-[var(--mist-100)] hover:bg-[var(--bilibili-pink-glow)]"
                      : "text-[var(--mist-100)] hover:bg-[var(--ink-surface-hover)] hover:text-[var(--mist-100)]"
                  }`}
                >
                  <span
                    className={`inline-flex size-7 shrink-0 items-center justify-center rounded-md font-mono text-xs ${
                      isCurrent
                        ? "bg-[var(--bilibili-pink)] text-[var(--mist-100)]"
                        : "bg-[var(--ink-deeper)] text-[var(--mist-300)]"
                    }`}
                  >
                    {e.episodeNumber !== null ? String(e.episodeNumber).padStart(2, "0") : "·"}
                  </span>
                  <span className="flex-1 truncate">{e.title}</span>
                  {isCurrent ? (
                    <span className="ml-auto text-[10px] font-medium text-[var(--bilibili-pink)]">播放中</span>
                  ) : null}
                </Button>
              </li>
            )
          })
        )}
      </ul>
    </div>
  )
}

function ChevronDown() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M4 6l4 4 4-4" stroke="var(--bilibili-pink)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ListIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 6h16M4 12h16M4 18h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
