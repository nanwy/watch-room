import { afterEach, describe, expect, test } from "vitest"

import { getOrCreateClientId, CLIENT_ID_STORAGE_KEY } from "../lib/client-id"

const memoryStore = new Map<string, string>()
const storage = {
  getItem: (k: string) => memoryStore.get(k) ?? null,
  setItem: (k: string, v: string) => { memoryStore.set(k, v) },
  removeItem: (k: string) => { memoryStore.delete(k) },
} as unknown as Storage

afterEach(() => memoryStore.clear())

describe("getOrCreateClientId", () => {
  test("creates a new id and persists it", () => {
    const id = getOrCreateClientId(storage)
    expect(id).toMatch(/^[a-f0-9]{32}$/)
    expect(memoryStore.get(CLIENT_ID_STORAGE_KEY)).toBe(id)
  })

  test("reuses existing id", () => {
    memoryStore.set(CLIENT_ID_STORAGE_KEY, "existing-client-id-1234")
    expect(getOrCreateClientId(storage)).toBe("existing-client-id-1234")
  })
})
