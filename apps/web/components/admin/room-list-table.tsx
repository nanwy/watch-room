"use client"

import { useMutation } from "@tanstack/react-query"
import { Trash2 } from "lucide-react"
import Link from "next/link"
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

type RoomListItem = {
  id: string
  slug: string
  currentAnime: { title: string }
  currentEpisode: { title: string; episodeNumber: number | null }
  createdAt: string
  lastActiveAt: string
  _count: { chatMessages: number; memberSessions: number }
}

async function deleteRoom(input: { roomId: string; passcode: string }) {
  const response = await fetch(`/api/admin/rooms/${input.roomId}`, {
    method: "DELETE",
    headers: { "x-admin-passcode": input.passcode },
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: string } | null
    throw new Error(payload?.error ?? "删除房间失败")
  }

  return response.json() as Promise<{ deleted: true }>
}

export function RoomListTable({ rooms }: { rooms: RoomListItem[] }) {
  const router = useRouter()
  const [passcode, setPasscode] = useState("")
  const [target, setTarget] = useState<RoomListItem | null>(null)
  const mutation = useMutation({
    mutationFn: deleteRoom,
    onSuccess: () => {
      setTarget(null)
      router.refresh()
    },
  })

  if (rooms.length === 0) {
    return (
      <div className="border-y py-12 text-sm text-muted-foreground">
        还没有创建任何房间。
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
            <TableHead>房间</TableHead>
            <TableHead>当前播放</TableHead>
            <TableHead className="text-right">聊天</TableHead>
            <TableHead className="text-right">成员</TableHead>
            <TableHead>最后活跃</TableHead>
            <TableHead className="w-24 text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rooms.map((room) => (
            <TableRow key={room.id}>
              <TableCell className="font-medium">
                <Link className="underline-offset-4 hover:underline" href={`/room/${room.slug}`}>
                  {room.slug}
                </Link>
              </TableCell>
              <TableCell>
                <div>{room.currentAnime.title}</div>
                <div className="text-sm text-muted-foreground">
                  {room.currentEpisode.episodeNumber !== null ? `${room.currentEpisode.episodeNumber}. ` : ""}
                  {room.currentEpisode.title}
                </div>
              </TableCell>
              <TableCell className="text-right tabular-nums">{room._count.chatMessages}</TableCell>
              <TableCell className="text-right tabular-nums">{room._count.memberSessions}</TableCell>
              <TableCell>{formatDate(room.lastActiveAt)}</TableCell>
              <TableCell className="text-right">
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                      setTarget(room)
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
          ))}
        </TableBody>
      </Table>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>删除房间</AlertDialogTitle>
          <AlertDialogDescription>
            {target ? `将删除房间「${target.slug}」以及它的播放状态、聊天记录和成员会话。媒体库资源不会被删除。` : ""}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="delete-room-passcode">管理员口令</label>
          <Input
            id="delete-room-passcode"
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
              mutation.mutate({ roomId: target.id, passcode })
            }}
          >
            删除
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}
