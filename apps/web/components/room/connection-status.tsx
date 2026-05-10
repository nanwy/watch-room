"use client"
import { useStore } from "zustand/react"

import { useRoomStore } from "@/store/room-store"

const LABELS = {
  disconnected: "已断开",
  connecting: "连接中…",
  reconnecting: "重连中…",
  connected: "已连接",
} as const

export function ConnectionStatus() {
  const status = useStore(useRoomStore, (s) => s.connectionStatus)
  if (status === "connected") return null
  return (
    <div className="rounded-md border bg-muted px-3 py-2 text-xs text-muted-foreground">
      {LABELS[status]}
    </div>
  )
}
