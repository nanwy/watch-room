import { Badge } from "@workspace/ui/components/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"

type LibraryAnime = {
  id: string
  title: string
  episodes: Array<{
    id: string
    title: string
    episodeNumber: number | null
    mimeType: string
    playbackSupportStatus: "supported" | "maybeUnsupported"
    fileSizeBytes: bigint
  }>
}

export function LibraryTable({ anime }: { anime: LibraryAnime[] }) {
  if (anime.length === 0) {
    return (
      <div className="border-y py-12 text-sm text-muted-foreground">
        No media has been imported yet.
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Anime</TableHead>
          <TableHead>Episode</TableHead>
          <TableHead>Format</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Size</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {anime.flatMap((item) => item.episodes.map((episode, index) => (
          <TableRow key={episode.id}>
            <TableCell className="font-medium">
              {index === 0 ? item.title : ""}
            </TableCell>
            <TableCell>
              <span className="text-muted-foreground">
                {episode.episodeNumber ? `${episode.episodeNumber}. ` : ""}
              </span>
              {episode.title}
            </TableCell>
            <TableCell>{episode.mimeType}</TableCell>
            <TableCell>
              <Badge variant={episode.playbackSupportStatus === "supported" ? "secondary" : "outline"}>
                {episode.playbackSupportStatus === "supported" ? "Playable" : "Check format"}
              </Badge>
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatBytes(episode.fileSizeBytes)}
            </TableCell>
          </TableRow>
        )))}
      </TableBody>
    </Table>
  )
}

function formatBytes(value: bigint) {
  const bytes = Number(value)
  if (!Number.isFinite(bytes)) return "Unknown"
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}
