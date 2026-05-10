import { describe, expect, test } from "vitest"

import { createRoomStore } from "../store/room-store"

describe("room store", () => {
  test("starts disconnected with no members", () => {
    const store = createRoomStore()
    expect(store.getState().connectionStatus).toBe("disconnected")
    expect(store.getState().members).toEqual([])
  })

  test("setRoomState applies authoritative playback", () => {
    const store = createRoomStore()
    store.getState().setRoomState({
      id: "r", slug: "abc-123",
      currentAnime: { id: "a", title: "Anime" },
      currentEpisode: { id: "e", title: "Ep1", animeId: "a", playbackSupportStatus: "supported" },
      playbackState: { roomId: "r", animeId: "a", episodeId: "e", status: "paused", positionSeconds: 0, playbackRate: 1, updatedAt: new Date().toISOString(), updatedByClientId: null },
    } as never)
    expect(store.getState().room?.slug).toBe("abc-123")
    expect(store.getState().playbackState?.status).toBe("paused")
  })

  test("appendChat trims to 100 entries", () => {
    const store = createRoomStore()
    for (let i = 0; i < 110; i += 1) {
      store.getState().appendChat({ id: `m${i}`, roomId: "r", clientId: "c", nickname: "n", body: `${i}`, createdAt: new Date().toISOString() })
    }
    expect(store.getState().messages.length).toBe(100)
    expect(store.getState().messages[0]?.body).toBe("10")
  })
})
