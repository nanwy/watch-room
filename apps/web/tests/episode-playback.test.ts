import { describe, expect, test } from "vitest"

import { findNextEpisode } from "../components/room/episode-playback"

describe("findNextEpisode", () => {
  test("returns the next episode in the current anime", () => {
    expect(findNextEpisode([
      { id: "anime-1", episodes: [{ id: "ep-1" }, { id: "ep-2" }, { id: "ep-3" }] },
    ], "anime-1", "ep-2")).toEqual({ animeId: "anime-1", episodeId: "ep-3" })
  })

  test("returns null when the current episode is the last one", () => {
    expect(findNextEpisode([
      { id: "anime-1", episodes: [{ id: "ep-1" }] },
    ], "anime-1", "ep-1")).toBeNull()
  })
})
