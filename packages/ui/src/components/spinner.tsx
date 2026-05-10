import { cn } from "@workspace/ui/lib/utils"
import { HugeiconsIcon, type HugeiconsIconProps } from "@hugeicons/react"
import { Loading03Icon } from "@hugeicons/core-free-icons"

function Spinner({
  className,
  ...props
}: Omit<HugeiconsIconProps, "icon" | "strokeWidth">) {
  return (
    <HugeiconsIcon icon={Loading03Icon} strokeWidth={2} role="status" aria-label="Loading" className={cn("size-4 animate-spin", className)} {...props} />
  )
}

export { Spinner }
