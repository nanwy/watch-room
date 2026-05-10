import { describe, expect, test } from "vitest"

import { calculateEffectivePosition, shouldCorrectDrift } from "../src/playback.js"

describe("playback helpers", () => {
  test("advances playing state from the authoritative update time", () => {
    expect(calculateEffectivePosition({
      status: "playing",
      positionSeconds: 12,
      playbackRate: 1.5,
      updatedAtMs: 1_000,
      nowMs: 5_000,
    })).toBe(18)
  })

  test("keeps paused state at the stored position", () => {
    expect(calculateEffectivePosition({
      status: "paused",
      positionSeconds: 42,
      playbackRate: 2,
      updatedAtMs: 1_000,
      nowMs: 10_000,
    })).toBe(42)
  })

  test("corrects drift only when it exceeds the threshold", () => {
    expect(shouldCorrectDrift({
      localPositionSeconds: 10,
      authoritativePositionSeconds: 11.5,
    })).toBe(false)

    expect(shouldCorrectDrift({
      localPositionSeconds: 10,
      authoritativePositionSeconds: 11.51,
    })).toBe(true)
  })
})
