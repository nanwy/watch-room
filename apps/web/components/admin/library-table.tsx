"use client"

import { useMutation } from "@tanstack/react-query"
import { Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@workspace/ui/components/alert-dialog"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"

type LibraryAnime = {
  id: string
  title: string
  episodes: Array<{
    id: string
    title: string
    episodeNumber: number | null
    mimeType: string
    playbackSupportStatus: "supported" | "maybeUnsupported"
    fileSizeBytes: string
  }>
}

type DeleteTarget =
  | { type: "episode"; id: string; title: string }
  | { type: "anime"; id: string; title: string }

async function deleteLibraryResource(input: { target: DeleteTarget; passcode: string }) {
  const path = input.target.type === "anime"
    ? `/api/admin/library/anime/${input.target.id}`
    : `/api/admin/library/episodes/${input.target.id}`
  const response = await fetch(path, {
    method: "DELETE",
    headers: { "x-admin-passcode": input.passcode },
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: string } | null
    throw new Error(payload?.error ?? "删除失败")
  }

  return response.json() as Promise<{ deleted: true }>
}

export function LibraryTable({ anime }: { anime: LibraryAnime[] }) {
  const router = useRouter()
  const [passcode, setPasscode] = useState("")
  const [target, setTarget] = useState<DeleteTarget | null>(null)
  const mutation = useMutation({
    mutationFn: deleteLibraryResource,
    onSuccess: () => {
      setTarget(null)
      router.refresh()
    },
  })

  if (anime.length === 0) {
    return (
      <div className="border-y py-12 text-sm text-muted-foreground">
        还没有导入任何媒体。
      </div>
    )
  }

  return (
    <AlertDialog open={target !== null} onOpenChange={(open) => {
      if (!open) {
        setTarget(null)
        mutation.reset()
      }
    }}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>动漫</TableHead>
            <TableHead>剧集</TableHead>
            <TableHead>格式</TableHead>
            <TableHead>状态</TableHead>
            <TableHead className="text-right">大小</TableHead>
            <TableHead className="w-28 text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {anime.flatMap((item) => item.episodes.map((episode, index) => (
            <TableRow key={episode.id}>
              <TableCell className="font-medium">
                {index === 0 ? (
                  <div className="flex items-center gap-2">
                    <span>{item.title}</span>
                    <AlertDialogTrigger asChild>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          setTarget({ type: "anime", id: item.id, title: item.title })
                          setPasscode("")
                          mutation.reset()
                        }}
                      >
                        <Trash2 />
                        整部
                      </Button>
                    </AlertDialogTrigger>
                  </div>
                ) : ""}
              </TableCell>
              <TableCell>
                <span className="text-muted-foreground">
                  {episode.episodeNumber ? `${episode.episodeNumber}. ` : ""}
                </span>
                {episode.title}
              </TableCell>
              <TableCell>{episode.mimeType}</TableCell>
              <TableCell>
                <Badge variant={episode.playbackSupportStatus === "supported" ? "secondary" : "outline"}>
                  {episode.playbackSupportStatus === "supported" ? "可播放" : "格式存疑"}
                </Badge>
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatBytes(episode.fileSizeBytes)}
              </TableCell>
              <TableCell className="text-right">
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                      setTarget({ type: "episode", id: episode.id, title: episode.title })
                      setPasscode("")
                      mutation.reset()
                    }}
                  >
                    <Trash2 />
                    删除
                  </Button>
                </AlertDialogTrigger>
              </TableCell>
            </TableRow>
          )))}
        </TableBody>
      </Table>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            删除{target?.type === "anime" ? "整部动漫" : "剧集"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {target ? `将从媒体库删除「${target.title}」，并删除受管媒体文件。已创建房间正在使用的资源不会被删除。` : ""}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="delete-passcode">管理员口令</label>
          <Input
            id="delete-passcode"
            type="password"
            value={passcode}
            autoComplete="current-password"
            onChange={(event) => setPasscode(event.target.value)}
          />
          <div className="min-h-5 text-sm text-destructive">
            {mutation.isError ? mutation.error.message : null}
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={mutation.isPending}>取消</AlertDialogCancel>
          <AlertDialogAction
            disabled={!target || !passcode || mutation.isPending}
            onClick={(event) => {
              event.preventDefault()
              if (!target || !passcode) return
              mutation.mutate({ target, passcode })
            }}
          >
            删除
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function formatBytes(value: string) {
  const bytes = Number.parseInt(value, 10)
  if (!Number.isFinite(bytes)) return "未知"
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}
