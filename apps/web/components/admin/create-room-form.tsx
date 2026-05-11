"use client"

import { useMutation } from "@tanstack/react-query"
import { Clapperboard } from "lucide-react"
import Link from "next/link"
import { useMemo, useState } from "react"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"

type RoomLibrary = Array<{
  id: string
  title: string
  episodes: Array<{
    id: string
    title: string
    episodeNumber: number | null
  }>
}>

type CreatedRoom = {
  id: string
  slug: string
  path: string
}

async function createWatchRoom(input: {
  passcode: string
  animeId: string
  episodeId: string
}): Promise<CreatedRoom> {
  const response = await fetch("/api/admin/rooms", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-admin-passcode": input.passcode,
    },
    body: JSON.stringify({
      animeId: input.animeId,
      episodeId: input.episodeId,
    }),
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: string } | null
    throw new Error(payload?.error ?? "创建房间失败")
  }

  return response.json() as Promise<CreatedRoom>
}

export function CreateRoomForm({ library }: { library: RoomLibrary }) {
  const firstAnime = library[0]
  const [passcode, setPasscode] = useState("")
  const [animeId, setAnimeId] = useState(firstAnime?.id ?? "")
  const selectedAnime = useMemo(
    () => library.find((anime) => anime.id === animeId) ?? library[0],
    [animeId, library],
  )
  const [episodeId, setEpisodeId] = useState(firstAnime?.episodes[0]?.id ?? "")
  const mutation = useMutation({ mutationFn: createWatchRoom })

  const canSubmit = Boolean(passcode && animeId && episodeId && !mutation.isPending)

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-medium">管理员口令</span>
          <Input
            type="password"
            value={passcode}
            autoComplete="current-password"
            onChange={(event) => setPasscode(event.target.value)}
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium">动漫</span>
          <Select
            value={animeId}
            onValueChange={(nextAnimeId) => {
              const nextAnime = library.find((anime) => anime.id === nextAnimeId)
              setAnimeId(nextAnimeId)
              setEpisodeId(nextAnime?.episodes[0]?.id ?? "")
              mutation.reset()
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="选择动漫" />
            </SelectTrigger>
            <SelectContent>
              {library.map((anime) => (
                <SelectItem key={anime.id} value={anime.id}>
                  {anime.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
      </div>

      <label className="space-y-2">
        <span className="text-sm font-medium">起始剧集</span>
        <Select
          value={episodeId}
          onValueChange={(nextEpisodeId) => {
            setEpisodeId(nextEpisodeId)
            mutation.reset()
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="选择起始剧集" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>{selectedAnime?.title ?? "剧集"}</SelectLabel>
              {(selectedAnime?.episodes ?? []).map((episode) => (
                <SelectItem key={episode.id} value={episode.id}>
                  {episode.episodeNumber ? `${episode.episodeNumber}. ` : ""}
                  {episode.title}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </label>

      <div className="flex flex-col gap-3 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-h-5 text-sm text-muted-foreground">
          {mutation.isError ? mutation.error.message : null}
          {mutation.isSuccess ? (
            <Link className="font-medium text-foreground underline-offset-4 hover:underline" href={mutation.data.path}>
              {mutation.data.path}
            </Link>
          ) : null}
        </div>
        <Button
          type="button"
          disabled={!canSubmit}
          onClick={() => mutation.mutate({ passcode, animeId, episodeId })}
        >
          <Clapperboard />
          创建房间
        </Button>
      </div>
    </div>
  )
}
