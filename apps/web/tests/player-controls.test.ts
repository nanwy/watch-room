import { describe, expect, test } from "vitest"

import {
  getFullscreenAction,
  shouldCaptureTouchTap,
} from "../components/room/player-controls-behavior"

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

describe("player controls fullscreen handling", () => {
  test("prefers standard fullscreen when available", () => {
    expect(getFullscreenAction({
      isDocumentFullscreen: false,
      canRequestContainerFullscreen: true,
      canEnterWebKitVideoFullscreen: true,
    })).toBe("requestContainerFullscreen")
  })

  test("falls back to iOS Safari video fullscreen", () => {
    expect(getFullscreenAction({
      isDocumentFullscreen: false,
      canRequestContainerFullscreen: false,
      canEnterWebKitVideoFullscreen: true,
    })).toBe("enterWebKitVideoFullscreen")
  })

  test("exits standard fullscreen when already fullscreen", () => {
    expect(getFullscreenAction({
      isDocumentFullscreen: true,
      canRequestContainerFullscreen: true,
      canEnterWebKitVideoFullscreen: true,
    })).toBe("exitDocumentFullscreen")
  })
})
