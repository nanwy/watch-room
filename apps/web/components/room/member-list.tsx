"use client"
import { useRoomStore } from "@/store/room-store"

const NAME_PALETTE = [
  "oklch(0.71 0.18 358)",
  "oklch(0.69 0.13 226)",
  "oklch(0.82 0.16 90)",
  "oklch(0.74 0.18 305)",
  "oklch(0.78 0.16 150)",
] as const

function hashColor(clientId: string) {
  let h = 0
  for (let i = 0; i < clientId.length; i++) h = (h * 31 + clientId.charCodeAt(i)) | 0
  return NAME_PALETTE[Math.abs(h) % NAME_PALETTE.length] as string
}

function initial(nickname: string) {
  return nickname.trim().slice(0, 1) || "?"
}

export function MemberList() {
  const members = useRoomStore((s) => s.members)
  const hostId = members[0]?.clientId
  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-[var(--mist-100)]">在场</h2>
        <span className="font-mono text-xs text-[var(--mist-500)]">{members.length} 位</span>
      </div>
      {members.length === 0 ? (
        <p className="text-xs text-[var(--mist-500)]">还没人来，鸽了</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {members.map((m) => {
            const isHost = m.clientId === hostId
            const color = isHost ? "var(--bilibili-pink)" : hashColor(m.clientId)
            return (
              <li
                key={m.clientId}
                className="inline-flex items-center gap-2 rounded-full bg-[var(--ink-deeper)] py-1 pr-3 pl-1"
              >
                <span className="relative inline-block">
                  <span
                    className="inline-flex size-6 items-center justify-center rounded-full text-[11px] font-semibold text-[var(--mist-100)]"
                    style={{ background: color }}
                  >
                    {initial(m.nickname)}
                  </span>
                  <span className="absolute -right-0.5 -bottom-0.5 inline-block size-2 rounded-full bg-[var(--online-green)] ring-2 ring-[var(--ink-deeper)]" />
                </span>
                <span className="max-w-[120px] truncate text-[13px] font-medium text-[var(--mist-100)]">
                  {m.nickname}
                </span>
                {isHost ? (
                  <span className="rounded-sm bg-[var(--bilibili-pink)] px-1 py-px text-[10px] font-bold text-[var(--mist-100)]">
                    主
                  </span>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
