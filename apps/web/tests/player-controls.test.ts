import { describe, expect, test } from "vitest"

import { shouldCaptureTouchTap } from "../components/room/player-controls-behavior"

describe("player controls touch tap handling", () => {
  test("captures the first tap on touch devices while controls are hidden", () => {
    expect(shouldCaptureTouchTap(true, false)).toBe(true)
  })

  test("does not block taps when controls are already visible", () => {
    expect(shouldCaptureTouchTap(true, true)).toBe(false)
  })

  test("does not affect non-touch devices", () => {
    expect(shouldCaptureTouchTap(false, false)).toBe(false)
    expect(shouldCaptureTouchTap(false, true)).toBe(false)
  })
})
