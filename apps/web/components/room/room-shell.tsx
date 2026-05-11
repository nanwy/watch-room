"use client"
import { useEffect, useRef, useState } from "react"
import type { Socket } from "socket.io-client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"

import { JoinRoomForm } from "./join-room-form"
import { ConnectionStatus } from "./connection-status"
import { MemberList } from "./member-list"
import { WatchPlayer } from "./watch-player"
import { ChatPanel } from "./chat-panel"
import { EpisodeSwitcher } from "./episode-switcher"
import { RoomFooter } from "./room-footer"
import { getOrCreateClientId } from "@/lib/client-id"
import { createRoomSocket } from "@/lib/socket-client"
import { useRoomStore, type ChatMessage, type Member, type PlaybackState, type RoomSnapshot } from "@/store/room-store"

export function RoomShell({ snapshot }: { snapshot: RoomSnapshot }) {
  const [nickname, setNickname] = useState<string | null>(() =>
    typeof window === "undefined" ? null : window.localStorage.getItem("watch-room.nickname"),
  )
  const socketRef = useRef<Socket | null>(null)
  const setRoomState = useRoomStore((s) => s.setRoomState)
  const setPlaybackState = useRoomStore((s) => s.setPlaybackState)
  const setMembers = useRoomStore((s) => s.setMembers)
  const setHistory = useRoomStore((s) => s.setHistory)
  const reconcileChat = useRoomStore((s) => s.reconcileChat)
  const setConnectionStatus = useRoomStore((s) => s.setConnectionStatus)
  const members = useRoomStore((s) => s.members)
  const messages = useRoomStore((s) => s.messages)

  useEffect(() => { setRoomState(snapshot) }, [snapshot, setRoomState])

  useEffect(() => {
    if (!nickname) return
    const clientId = getOrCreateClientId()
    const socket = createRoomSocket()
    socketRef.current = socket

    socket.on("connect", () => {
      setConnectionStatus("connected")
      socket.emit("room:join", { roomSlug: snapshot.slug, clientId, nickname })
    })
    socket.on("disconnect", () => setConnectionStatus("reconnecting"))
    socket.io.on("reconnect_attempt", () => setConnectionStatus("reconnecting"))

    socket.on("room:state", (room: RoomSnapshot) => setRoomState(room))
    socket.on("room:members", (m: Member[]) => setMembers(m))
    socket.on("chat:history", (m: ChatMessage[]) => setHistory(m))
    socket.on("chat:message", (m: ChatMessage) => reconcileChat(m))
    socket.on("playback:state", (state: PlaybackState) => setPlaybackState(state))

    setConnectionStatus("connecting")
    socket.connect()
    return () => { socket.disconnect(); socketRef.current = null }
  }, [nickname, snapshot.slug, setRoomState, setPlaybackState, setMembers, setHistory, reconcileChat, setConnectionStatus])

  if (!nickname) {
    return (
      <div className="b-station flex min-h-screen flex-col">
        <div className="flex flex-1 items-center justify-center px-4">
          <JoinRoomForm
            onJoin={(name) => {
              window.localStorage.setItem("watch-room.nickname", name)
              getOrCreateClientId()
              setNickname(name)
            }}
          />
        </div>
        <RoomFooter />
      </div>
    )
  }

  const clientId = typeof window === "undefined" ? "" : (window.localStorage.getItem("watch-room.clientId") ?? "")
  const liveRoom = useRoomStore((s) => s.room) ?? snapshot

  return (
    <div className="b-station flex min-h-screen flex-col">
      <header className="b-surface-translucent-deep flex items-center justify-between gap-3 border-b border-[var(--ink-border)] px-4 py-3 lg:px-6">
        <div className="flex min-w-0 items-baseline gap-3">
          <h1 className="truncate text-lg font-semibold text-[var(--mist-100)]">{liveRoom.currentAnime.title}</h1>
          <span className="hidden font-mono text-xs tracking-wider text-[var(--mist-500)] sm:inline">BV·{liveRoom.slug}</span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <EpisodeSwitcher
            roomSlug={liveRoom.slug}
            clientId={clientId}
            onSwitch={(payload) => socketRef.current?.emit("playback:control", payload)}
          />
          <ConnectionStatus />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-screen-2xl flex-1 flex-col gap-4 px-3 py-3 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:px-6 lg:py-4">
        <section className="flex min-w-0 flex-col gap-3 lg:min-h-0">
          <WatchPlayer
            episodeId={liveRoom.currentEpisode.id}
            playbackSupportStatus={liveRoom.currentEpisode.playbackSupportStatus}
            clientId={clientId}
            onControl={(event) => {
              socketRef.current?.emit("playback:control", {
                roomSlug: liveRoom.slug,
                clientId,
                ...event,
              })
            }}
          />
        </section>

        <aside className="b-surface-translucent flex h-[60vh] min-h-[420px] flex-col overflow-hidden rounded-xl lg:h-[calc(100vh-128px)] lg:min-h-0">
          <Tabs defaultValue="chat" className="flex min-h-0 flex-1 flex-col">
            <TabsList
              variant="line"
              className="mx-3 mt-3 flex h-9 w-auto justify-start gap-6 border-b border-[var(--ink-border)] bg-transparent p-0"
            >
              <TabsTrigger
                value="chat"
                className="relative h-9 rounded-none border-0 px-0 text-sm text-[var(--mist-500)] data-[state=active]:text-[var(--mist-100)] hover:text-[var(--mist-100)] after:bottom-[-1px] after:h-[2px] after:bg-[var(--bilibili-pink)]"
              >
                聊天{messages.length > 0 ? `（${messages.length}）` : ""}
              </TabsTrigger>
              <TabsTrigger
                value="members"
                className="relative h-9 rounded-none border-0 px-0 text-sm text-[var(--mist-500)] data-[state=active]:text-[var(--mist-100)] hover:text-[var(--mist-100)] after:bottom-[-1px] after:h-[2px] after:bg-[var(--bilibili-pink)]"
              >
                成员（{members.length}）
              </TabsTrigger>
            </TabsList>
            <TabsContent value="chat" className="flex min-h-0 flex-1 flex-col px-0 pb-0">
              <ChatPanel
                roomSlug={snapshot.slug}
                clientId={clientId}
                nickname={nickname}
                onSend={(payload) => socketRef.current?.emit("chat:send", payload)}
              />
            </TabsContent>
            <TabsContent value="members" className="flex-1 px-3 pb-3">
              <MemberList />
            </TabsContent>
          </Tabs>
        </aside>
      </main>

      <RoomFooter />
    </div>
  )
}
