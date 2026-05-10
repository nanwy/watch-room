export const CLIENT_ID_STORAGE_KEY = "watch-room.clientId"

export function getOrCreateClientId(storage: Storage = window.localStorage): string {
  const existing = storage.getItem(CLIENT_ID_STORAGE_KEY)
  if (existing && existing.length >= 8) return existing
  const id = generateClientId()
  storage.setItem(CLIENT_ID_STORAGE_KEY, id)
  return id
}

function generateClientId(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")
}
