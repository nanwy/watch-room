import { Button } from "@workspace/ui/components/button"
import Link from "next/link"

export default function Page() {
  return (
    <div className="flex min-h-svh p-6">
      <div className="flex max-w-md min-w-0 flex-col gap-4 text-sm leading-loose">
        <div>
          <h1 className="font-medium">Watch room</h1>
          <p>Manage the media library, then create a room to share.</p>
          <div className="mt-2 flex gap-2">
            <Button asChild>
              <Link href="/admin/rooms/new">Create room</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin/library">Media library</Link>
            </Button>
          </div>
        </div>
        <div className="text-muted-foreground font-mono text-xs">
          (Press <kbd>d</kbd> to toggle dark mode)
        </div>
      </div>
    </div>
  )
}
