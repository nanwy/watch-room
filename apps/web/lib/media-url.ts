export function mediaUrl(episodeId: string): string {
  return `/api/media/${encodeURIComponent(episodeId)}`
}
