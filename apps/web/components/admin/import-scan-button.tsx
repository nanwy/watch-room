"use client"

import { useMutation } from "@tanstack/react-query"
import { RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"

type ScanResult = {
  candidates: number
  imported: number
  skipped: number
  conflicts: string[]
}

async function scanImports(passcode: string): Promise<ScanResult> {
  const response = await fetch("/api/admin/import/scan", {
    method: "POST",
    headers: {
      "x-admin-passcode": passcode,
    },
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: string } | null
    throw new Error(payload?.error ?? "扫描失败")
  }

  return response.json() as Promise<ScanResult>
}

export function ImportScanButton() {
  const router = useRouter()
  const [passcode, setPasscode] = useState("")
  const mutation = useMutation({
    mutationFn: scanImports,
    onSuccess: () => {
      router.refresh()
    },
  })

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
      <div className="min-w-0 flex-1">
        <Input
          type="password"
          value={passcode}
          placeholder="管理员口令"
          autoComplete="current-password"
          onChange={(event) => setPasscode(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && passcode && !mutation.isPending) {
              mutation.mutate(passcode)
            }
          }}
        />
        <div className="mt-2 min-h-5 text-sm text-muted-foreground">
          {mutation.isSuccess
            ? `扫描 ${mutation.data.candidates} 个；导入 ${mutation.data.imported}，跳过 ${mutation.data.skipped}。`
            : null}
          {mutation.isError ? mutation.error.message : null}
        </div>
      </div>
      <Button
        type="button"
        disabled={!passcode || mutation.isPending}
        onClick={() => mutation.mutate(passcode)}
      >
        <RefreshCw className={mutation.isPending ? "animate-spin" : ""} />
        扫描导入
      </Button>
    </div>
  )
}
