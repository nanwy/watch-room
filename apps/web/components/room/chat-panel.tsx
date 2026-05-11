"use client"
import { useEffect, useMemo, useRef, useState } from "react"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import type { ChatMessageInput } from "@workspace/shared/events"

import { TvMascot } from "./tv-mascot"
import { useRoomStore } from "@/store/room-store"

type DisplayMessage =
  | { kind: "chat"; id: string; clientId: string; nickname: string; body: string; createdAt: string; isSelf: boolean }
  | { kind: "system"; id: string; body: string; createdAt: string }

const HOST_PINK = "var(--bilibili-pink)"
const NAME_PALETTE = [
  "oklch(0.71 0.18 358)", // pink
  "oklch(0.69 0.13 226)", // cyan
  "oklch(0.82 0.16 90)",  // yellow
  "oklch(0.74 0.18 305)", // violet
  "oklch(0.78 0.16 150)", // green
] as const

const WELCOME_LINES = [
  "出现啦，放映室的新守护者",
  "老二刺猿前来报到",
  "前方高能预警，又一位同好入场",
  "干杯！(´∀`) 又有人来一起看了",
] as const

function hashColor(clientId: string) {
  let h = 0
  for (let i = 0; i < clientId.length; i++) h = (h * 31 + clientId.charCodeAt(i)) | 0
  return NAME_PALETTE[Math.abs(h) % NAME_PALETTE.length] as string
}

function createLocalMessageId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

export function ChatPanel({
  roomSlug,
  clientId,
  nickname,
  onSend,
}: {
  roomSlug: string
  clientId: string
  nickname: string
  onSend: (payload: ChatMessageInput) => void
}) {
  const messages = useRoomStore((s) => s.messages)
  const appendChat = useRoomStore((s) => s.appendChat)
  const members = useRoomStore((s) => s.members)
  const [draft, setDraft] = useState("")
  const [systemMessages, setSystemMessages] = useState<{ id: string; body: string; createdAt: string }[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)
  const knownMembersRef = useRef<Set<string>>(new Set())
  const selfFlashRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (knownMembersRef.current.size === 0) {
      knownMembersRef.current = new Set(members.map((m) => m.clientId))
      return
    }
    const seen = knownMembersRef.current
    const additions: typeof systemMessages = []
    for (const m of members) {
      if (!seen.has(m.clientId)) {
        const line = WELCOME_LINES[Math.floor(Math.random() * WELCOME_LINES.length)]
        additions.push({
          id: `sys-${m.clientId}-${Date.now()}`,
          body: `${line}：${m.nickname}`,
          createdAt: new Date().toISOString(),
        })
        seen.add(m.clientId)
      }
    }
    if (additions.length) {
      setSystemMessages((prev) => [...prev, ...additions].slice(-50))
    }
  }, [members])

  const display = useMemo<DisplayMessage[]>(() => {
    const chat: DisplayMessage[] = messages.map((m) => ({
      kind: "chat",
      id: m.id,
      clientId: m.clientId,
      nickname: m.nickname,
      body: m.body,
      createdAt: m.createdAt,
      isSelf: m.clientId === clientId,
    }))
    const sys: DisplayMessage[] = systemMessages.map((m) => ({
      kind: "system",
      id: m.id,
      body: m.body,
      createdAt: m.createdAt,
    }))
    return [...chat, ...sys].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  }, [messages, systemMessages, clientId])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [display.length])

  const hostId = members[0]?.clientId

  return (
    <div className="flex min-h-0 flex-1 flex-col-reverse lg:flex-col">
      <div ref={scrollRef} className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-3">
        {display.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 text-xs text-[var(--mist-500)]">
            <TvMascot size={48} bob />
            <span>还没有人开口，发条弹幕暖暖场</span>
            <span className="font-mono">{"( ゜- ゜)つロ"}</span>
          </div>
        ) : null}
        {display.map((m) => {
          if (m.kind === "system") {
            return (
              <div key={m.id} className="flex items-center justify-center gap-2 py-1.5 text-xs text-[var(--mist-500)]">
                <span className="h-px w-6 bg-[var(--ink-border)]" />
                <span>
                  <span className="mr-1">{"( ゜- ゜)つロ"}</span>
                  {m.body}
                </span>
                <span className="h-px w-6 bg-[var(--ink-border)]" />
              </div>
            )
          }
          const isHost = m.clientId === hostId
          const color = isHost ? HOST_PINK : hashColor(m.clientId)
          const shouldFlash = m.isSelf && !selfFlashRef.current.has(m.id)
          if (shouldFlash) selfFlashRef.current.add(m.id)
          return (
            <div
              key={m.id}
              className={`rounded-md px-2 py-1 ${shouldFlash ? "b-station-self-pulse" : ""}`}
            >
              <div className="flex items-baseline gap-2 leading-tight">
                <span
                  className="text-[13px] font-semibold tracking-wide"
                  style={{ color, textShadow: "0 1px 2px rgba(0,0,0,0.6), 0 0 4px rgba(0,0,0,0.4)" }}
                >
                  {m.nickname}
                </span>
                {isHost ? (
                  <span className="rounded-sm bg-[var(--bilibili-pink)] px-1 py-px text-[10px] font-bold text-[var(--mist-100)]">
                    主
                  </span>
                ) : null}
                <span className="font-mono text-[10px] text-[var(--mist-500)]">
                  {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <div className="text-[15px] leading-snug break-words text-[var(--mist-100)]">{m.body}</div>
            </div>
          )
        })}
      </div>
      <form
        className="b-surface-translucent-deep flex shrink-0 gap-2 border-y border-[var(--ink-border)] p-2 lg:border-b-0"
        onSubmit={(event) => {
          event.preventDefault()
          const trimmed = draft.trim()
          if (trimmed.length === 0 || trimmed.length > 1000) return
          appendChat({
            id: `local-${createLocalMessageId()}`,
            roomId: "",
            clientId,
            nickname,
            body: trimmed,
            createdAt: new Date().toISOString(),
          })
          onSend({ roomSlug, clientId, nickname, body: trimmed })
          setDraft("")
        }}
      >
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="发条友善的弹幕见证当下"
          maxLength={1000}
          className="b-surface-translucent-input h-10 flex-1 rounded-md border-0 px-3 text-sm text-[var(--mist-100)] placeholder:text-[var(--mist-500)] focus-visible:border-0 focus-visible:ring-0 focus-visible:shadow-[inset_0_0_0_2px_var(--bilibili-cyan)]"
        />
        <Button
          type="submit"
          disabled={draft.trim().length === 0}
          className="rounded-md bg-[var(--bilibili-pink)] text-[var(--mist-100)] hover:bg-[var(--bilibili-pink-deep)] hover:shadow-[0_0_24px_oklch(0.71_0.18_358/0.35)] disabled:bg-[var(--ink-border)] disabled:text-[var(--mist-500)]"
        >
          发送
        </Button>
      </form>
    </div>
  )
}
