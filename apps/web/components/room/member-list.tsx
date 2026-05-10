"use client"
import { useRoomStore } from "@/store/room-store"

export function MemberList() {
  const members = useRoomStore((s) => s.members)
  return (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold">在线（{members.length}）</h2>
      <ul className="space-y-1 text-sm">
        {members.map((m) => (
          <li key={m.clientId} className="truncate">{m.nickname}</li>
        ))}
      </ul>
    </div>
  )
}
