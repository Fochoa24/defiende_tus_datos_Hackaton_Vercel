import { Scale } from "lucide-react"

type TypingIndicatorProps = {
  accentColor: string
}

export function TypingIndicator({ accentColor }: TypingIndicatorProps) {
  return (
    <div
      className="flex items-start gap-2"
      role="status"
      aria-label="El asistente está escribiendo"
    >
      <div
        aria-hidden="true"
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-header mt-0.5"
      >
        <Scale className="h-3 w-3 text-header-foreground" />
      </div>
      <div className="rounded-2xl rounded-tl-sm bg-card border border-border/60 px-3.5 py-3 shadow-sm">
        <div className="flex items-center gap-1">
          <span
            className="typing-dot inline-block h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: accentColor }}
          />
          <span
            className="typing-dot inline-block h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: accentColor }}
          />
          <span
            className="typing-dot inline-block h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: accentColor }}
          />
        </div>
      </div>
    </div>
  )
}
