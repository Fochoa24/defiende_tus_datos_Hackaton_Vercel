import type { ReactNode } from "react"
import { Scale } from "lucide-react"

type AgentMessageProps = {
  children: ReactNode
}

export function AgentMessage({ children }: AgentMessageProps) {
  return (
    <div className="flex items-start gap-2 max-w-[92%]">
      <div
        aria-hidden="true"
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-header mt-0.5"
      >
        <Scale className="h-3 w-3 text-header-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="rounded-2xl rounded-tl-sm bg-card text-card-foreground px-3.5 py-2.5 text-[13px] shadow-sm border border-border/60">
          {children}
        </div>
      </div>
    </div>
  )
}
