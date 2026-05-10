"use client"
import { useEffect, useRef, useState } from "react"
import { useStore } from "zustand/react"

import { JoinRoomForm } from "./join-room-form"
import { ConnectionStatus } from "./connection-status"
import { MemberList } from "./member-list"
import { WatchPlayer } from "./watch-player"
import { ChatPanel } from "./chat-panel"
import { EpisodeSwitcher } from "./episode-switcher"
import { getOrCreateClientId } from "@/lib/client-id"
import { createRoomSocket } from "@/lib/socket-client"
import { useRoomStore, type ChatMessage, type Member, type PlaybackState, type RoomSnapshot } from "@/store/room-store"
import type { Socket } from "socket.io-client"

export function RoomShell({ snapshot }: { snapshot: RoomSnapshot }) {
  const [nickname, setNickname] = useState<string | null>(() =>
    typeof window === "undefined" ? null : window.localStorage.getItem("watch-room.nickname"),
  )
  const socketRef = useRef<Socket | null>(null)
  const setRoomState = useStore(useRoomStore, (s) => s.setRoomState)
  const setPlaybackState = useStore(useRoomStore, (s) => s.setPlaybackState)
  const setMembers = useStore(useRoomStore, (s) => s.setMembers)
  const setHistory = useStore(useRoomStore, (s) => s.setHistory)
  const appendChat = useStore(useRoomStore, (s) => s.appendChat)
  const setConnectionStatus = useStore(useRoomStore, (s) => s.setConnectionStatus)

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
    socket.on("room:members", (members: Member[]) => setMembers(members))
    socket.on("chat:history", (messages: ChatMessage[]) => setHistory(messages))
    socket.on("chat:message", (message: ChatMessage) => appendChat(message))
    socket.on("playback:state", (state: PlaybackState) => setPlaybackState(state))

    setConnectionStatus("connecting")
    socket.connect()
    return () => { socket.disconnect(); socketRef.current = null }
  }, [nickname, snapshot.slug, setRoomState, setPlaybackState, setMembers, setHistory, appendChat, setConnectionStatus])

  if (!nickname) {
    return (
      <JoinRoomForm
        onJoin={(name) => {
          window.localStorage.setItem("watch-room.nickname", name)
          getOrCreateClientId()
          setNickname(name)
        }}
      />
    )
  }

  const clientId = typeof window === "undefined" ? "" : (window.localStorage.getItem("watch-room.clientId") ?? "")

  return (
    <main className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-6 p-6 lg:grid-cols-[2fr_1fr]">
      <section className="space-y-4">
        <ConnectionStatus />
        <WatchPlayer
          episodeId={snapshot.currentEpisode.id}
          onControl={(event) => {
            socketRef.current?.emit("playback:control", {
              roomSlug: snapshot.slug,
              clientId,
              ...event,
            })
          }}
        />
        <EpisodeSwitcher
          roomSlug={snapshot.slug}
          clientId={clientId}
          onSwitch={(payload) => socketRef.current?.emit("playback:control", payload)}
        />
      </section>
      <aside className="flex flex-col gap-6">
        <MemberList />
        <ChatPanel
          roomSlug={snapshot.slug}
          clientId={clientId}
          nickname={nickname}
          onSend={(payload) => socketRef.current?.emit("chat:send", payload)}
        />
      </aside>
    </main>
  )
}
