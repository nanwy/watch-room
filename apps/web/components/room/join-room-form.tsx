"use client"
import { useState } from "react"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"

export function JoinRoomForm({ onJoin }: { onJoin: (nickname: string) => void }) {
  const [nickname, setNickname] = useState("")
  const trimmed = nickname.trim()
  return (
    <form
      className="mx-auto mt-24 flex w-full max-w-sm flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        if (trimmed.length === 0 || trimmed.length > 32) return
        onJoin(trimmed)
      }}
    >
      <h1 className="text-xl font-semibold">加入观影房间</h1>
      <Input
        autoFocus
        placeholder="你的昵称"
        maxLength={32}
        value={nickname}
        onChange={(event) => setNickname(event.target.value)}
      />
      <Button type="submit" disabled={trimmed.length === 0}>加入</Button>
    </form>
  )
}
