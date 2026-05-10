import { create, type StoreApi } from "zustand"

export type ConnectionStatus = "disconnected" | "connecting" | "connected" | "reconnecting"

export type RoomSnapshot = {
  id: string
  slug: string
  currentAnime: { id: string; title: string }
  currentEpisode: { id: string; title: string; animeId: string; playbackSupportStatus: "supported" | "maybeUnsupported" }
  playbackState: PlaybackState | null
}

export type PlaybackState = {
  roomId: string
  animeId: string
  episodeId: string
  status: "playing" | "paused"
  positionSeconds: number
  playbackRate: number
  updatedAt: string
  updatedByClientId: string | null
}

export type Member = { clientId: string; nickname: string; lastSeenAt: string | Date; socketId: string | null }

export type ChatMessage = {
  id: string
  roomId: string
  clientId: string
  nickname: string
  body: string
  createdAt: string
}

type RoomStore = {
  connectionStatus: ConnectionStatus
  room: RoomSnapshot | null
  playbackState: PlaybackState | null
  members: Member[]
  messages: ChatMessage[]
  setConnectionStatus: (s: ConnectionStatus) => void
  setRoomState: (room: RoomSnapshot) => void
  setPlaybackState: (state: PlaybackState) => void
  setMembers: (members: Member[]) => void
  setHistory: (messages: ChatMessage[]) => void
  appendChat: (message: ChatMessage) => void
}

const MAX_MESSAGES = 100

export function createRoomStore(): StoreApi<RoomStore> {
  return create<RoomStore>((set) => ({
    connectionStatus: "disconnected",
    room: null,
    playbackState: null,
    members: [],
    messages: [],
    setConnectionStatus: (s) => set({ connectionStatus: s }),
    setRoomState: (room) => set({ room, playbackState: room.playbackState ?? null }),
    setPlaybackState: (state) => set({ playbackState: state }),
    setMembers: (members) => set({ members }),
    setHistory: (messages) => set({ messages: messages.slice(-MAX_MESSAGES) }),
    appendChat: (message) =>
      set((s) => ({ messages: [...s.messages, message].slice(-MAX_MESSAGES) })),
  }))
}

export const useRoomStore = createRoomStore()
