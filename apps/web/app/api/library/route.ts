import { getPrisma } from "@workspace/db/client"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const anime = await getPrisma().anime.findMany({
    orderBy: { title: "asc" },
    select: {
      id: true,
      title: true,
      episodes: {
        orderBy: [{ episodeNumber: "asc" }, { title: "asc" }],
        select: {
          id: true,
          title: true,
          episodeNumber: true,
          mimeType: true,
          playbackSupportStatus: true,
        },
      },
    },
  })
  return Response.json(anime)
}
