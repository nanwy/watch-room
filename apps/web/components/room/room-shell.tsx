"use client"
import { useState } from "react"

import { JoinRoomForm } from "./join-room-form"
import { getOrCreateClientId } from "@/lib/client-id"
import type { RoomSnapshot } from "@/store/room-store"

export function RoomShell({ snapshot }: { snapshot: RoomSnapshot }) {
  const [nickname, setNickname] = useState<string | null>(null)

  if (!nickname) {
    return (
      <JoinRoomForm
        onJoin={(name) => {
          getOrCreateClientId()
          window.localStorage.setItem("watch-room.nickname", name)
          setNickname(name)
        }}
      />
    )
  }

  return (
    <div className="p-6 text-sm">
      已加入房间 <strong>{snapshot.slug}</strong>，昵称：<strong>{nickname}</strong>，正在连接…
    </div>
  )
}
