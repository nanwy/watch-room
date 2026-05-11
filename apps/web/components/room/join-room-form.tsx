"use client"
import { useState } from "react"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"

import { TvMascot } from "./tv-mascot"

export function JoinRoomForm({ onJoin }: { onJoin: (nickname: string) => void }) {
  const [nickname, setNickname] = useState("")
  const trimmed = nickname.trim()
  return (
    <form
      className="b-surface-translucent mx-auto flex w-full max-w-sm flex-col items-center gap-5 rounded-2xl px-6 py-10 shadow-[inset_0_1px_0_0_var(--ink-border)]"
      onSubmit={(event) => {
        event.preventDefault()
        if (trimmed.length === 0 || trimmed.length > 32) return
        onJoin(trimmed)
      }}
    >
      <TvMascot size={72} bob />
      <div className="text-center">
        <h1 className="text-xl font-semibold text-[var(--mist-100)]">放映室入口</h1>
        <p className="mt-1 text-sm text-[var(--mist-300)]">填个昵称，老二刺猿就可以进场了</p>
      </div>
      <Input
        autoFocus
        placeholder="你的昵称"
        maxLength={32}
        value={nickname}
        onChange={(event) => setNickname(event.target.value)}
        className="b-surface-translucent-input h-12 rounded-lg border-0 px-4 text-[15px] text-[var(--mist-100)] placeholder:text-[var(--mist-500)] focus-visible:border-0 focus-visible:ring-0 focus-visible:shadow-[inset_0_0_0_2px_var(--bilibili-cyan)]"
      />
      <Button
        type="submit"
        size="lg"
        disabled={trimmed.length === 0}
        className="w-full rounded-lg bg-[var(--bilibili-pink)] text-[var(--mist-100)] hover:bg-[var(--bilibili-pink-deep)] hover:shadow-[0_0_24px_oklch(0.71_0.18_358/0.35)] disabled:bg-[var(--ink-border)] disabled:text-[var(--mist-500)]"
      >
        加入放映室
      </Button>
    </form>
  )
}
