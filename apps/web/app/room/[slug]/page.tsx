import { notFound } from "next/navigation"

import { getPrisma } from "@workspace/db/client"
import { getRoomSnapshot } from "@workspace/db/rooms"

import { RoomShell } from "@/components/room/room-shell"

export const dynamic = "force-dynamic"

export default async function RoomPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const snapshot = await getRoomSnapshot(getPrisma(), slug)
  if (!snapshot) notFound()
  return <RoomShell snapshot={JSON.parse(JSON.stringify(snapshot))} />
}
