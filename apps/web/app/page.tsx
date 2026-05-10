import { Button } from "@workspace/ui/components/button"
import Link from "next/link"

export default function Page() {
  return (
    <div className="flex min-h-svh p-6">
      <div className="flex max-w-md min-w-0 flex-col gap-4 text-sm leading-loose">
        <div>
          <h1 className="font-medium">观影房间</h1>
          <p>管理媒体库，创建房间分享给好友。</p>
          <div className="mt-2 flex gap-2">
            <Button asChild>
              <Link href="/admin/rooms/new">创建房间</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin/library">媒体库</Link>
            </Button>
          </div>
        </div>
        <div className="text-muted-foreground font-mono text-xs">
          （按 <kbd>d</kbd> 切换深色模式）
        </div>
      </div>
    </div>
  )
}
