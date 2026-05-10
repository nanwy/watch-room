"use client"
import type { ChatMessageInput } from "@workspace/shared/events"

export function ChatPanel(_props: {
  roomSlug: string
  clientId: string
  nickname: string
  onSend: (payload: ChatMessageInput) => void
}) {
  return <div className="text-xs text-muted-foreground">聊天即将上线…</div>
}
