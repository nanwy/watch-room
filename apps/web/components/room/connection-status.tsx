"use client"
import { useRoomStore } from "@/store/room-store"

const LABELS = {
  disconnected: { text: "信号丢了，鸽了", dot: "var(--mist-500)" },
  connecting: { text: "正在连接…", dot: "var(--bilibili-cyan)" },
  reconnecting: { text: "重连中…", dot: "var(--danwei-yellow)" },
  connected: { text: "同步中", dot: "var(--online-green)" },
} as const

export function ConnectionStatus() {
  const status = useRoomStore((s) => s.connectionStatus)
  const meta = LABELS[status]
  return (
    <div className="flex items-center gap-2 rounded-full bg-[var(--ink-deeper)] px-3 py-1.5 text-xs text-[var(--mist-300)]">
      <span className="inline-block size-2 rounded-full" style={{ background: meta.dot }} />
      {meta.text}
    </div>
  )
}
