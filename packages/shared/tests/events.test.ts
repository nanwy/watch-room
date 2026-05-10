import { describe, expect, test } from "vitest"

import { chatMessageSchema, joinRoomSchema, playbackControlSchema } from "../src/events.js"

describe("event schemas", () => {
  test("trims and validates nickname and chat body", () => {
    expect(joinRoomSchema.parse({
      roomSlug: "room-123",
      clientId: "client-123",
      nickname: "  Maki  ",
    }).nickname).toBe("Maki")

    expect(chatMessageSchema.parse({
      roomSlug: "room-123",
      clientId: "client-123",
      nickname: "Maki",
      body: "  hello  ",
    }).body).toBe("hello")
  })

  test("rejects invalid playback rate and negative positions", () => {
    expect(() => playbackControlSchema.parse({
      type: "setPlaybackRate",
      roomSlug: "room-123",
      clientId: "client-123",
      positionSeconds: 0,
      playbackRate: 3.5,
    })).toThrow()

    expect(() => playbackControlSchema.parse({
      type: "seek",
      roomSlug: "room-123",
      clientId: "client-123",
      positionSeconds: -1,
    })).toThrow()
  })
})
