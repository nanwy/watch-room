import { getPrisma } from "@workspace/db/client"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const anime = await getPrisma().anime.findMany({
    orderBy: { title: "asc" },
    include: { episodes: { orderBy: [{ episodeNumber: "asc" }, { title: "asc" }] } },
  })
  return Response.json(anime)
}
