"use client"
import { useEffect, useRef, useState } from "react"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import type { ChatMessageInput } from "@workspace/shared/events"

import { useRoomStore } from "@/store/room-store"

export function ChatPanel({
  roomSlug, clientId, nickname, onSend,
}: {
  roomSlug: string
  clientId: string
  nickname: string
  onSend: (payload: ChatMessageInput) => void
}) {
  const messages = useRoomStore((s) => s.messages)
  const appendChat = useRoomStore((s) => s.appendChat)
  const [draft, setDraft] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages.length])

  return (
    <div className="flex h-[480px] flex-col rounded-md border">
      <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto p-3 text-sm">
        {messages.map((m) => (
          <div key={m.id} className="leading-snug">
            <span className="font-semibold">{m.nickname}</span>{" "}
            <span className="text-muted-foreground">{m.body}</span>
          </div>
        ))}
        {messages.length === 0 && (
          <div className="text-muted-foreground text-xs">还没有消息。</div>
        )}
      </div>
      <form
        className="flex gap-2 border-t p-2"
        onSubmit={(event) => {
          event.preventDefault()
          const trimmed = draft.trim()
          if (trimmed.length === 0 || trimmed.length > 1000) return
          appendChat({
            id: `local-${crypto.randomUUID()}`,
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
        <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="说点什么" maxLength={1000} />
        <Button type="submit" disabled={draft.trim().length === 0}>发送</Button>
      </form>
    </div>
  )
}
