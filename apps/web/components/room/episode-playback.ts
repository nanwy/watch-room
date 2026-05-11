export type PlaybackLibraryAnime = {
  id: string
  episodes: Array<{ id: string }>
}

export function findNextEpisode(
  library: PlaybackLibraryAnime[],
  currentAnimeId: string,
  currentEpisodeId: string,
) {
  const anime = library.find((item) => item.id === currentAnimeId)
  if (!anime) return null

  const currentIndex = anime.episodes.findIndex((episode) => episode.id === currentEpisodeId)
  if (currentIndex < 0) return null

  const nextEpisode = anime.episodes[currentIndex + 1]
  return nextEpisode ? { animeId: anime.id, episodeId: nextEpisode.id } : null
}
