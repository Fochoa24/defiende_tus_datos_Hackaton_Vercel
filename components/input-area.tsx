"use client"

import { Send, Copy } from "lucide-react"

type InputAreaProps = {
  showCopyButton: boolean
  // Disabled while agent is responding — true by default since the demo
  // shows a typing indicator above.
  disabled?: boolean
}

export function InputArea({
  showCopyButton,
  disabled = true,
}: InputAreaProps) {
  return (
    <div className="border-t border-border bg-card px-3 pt-3 pb-3">
      {showCopyButton && (
        <button
          type="button"
          className="mb-2.5 w-full inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-[13px] font-semibold text-white shadow-sm transition-colors hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-offset-1"
          style={{ backgroundColor: "#10b981" }}
        >
          <Copy className="h-4 w-4" aria-hidden="true" />
          Copiar Reclamo
        </button>
      )}

      <form
        className="flex items-end gap-2"
        onSubmit={(e) => e.preventDefault()}
        aria-label="Enviar mensaje"
      >
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Escribe aquí..."
            disabled={disabled}
            aria-label="Mensaje"
            className="w-full h-10 rounded-lg border border-border bg-muted/50 pl-3 pr-3 text-[13px] text-foreground placeholder:text-muted-foreground/80 outline-none transition-colors focus:bg-card focus:border-ring/60 disabled:cursor-not-allowed disabled:opacity-70"
          />
        </div>

        <button
          type="submit"
          disabled={disabled}
          aria-label="Enviar"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white shadow-sm transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
          style={{ backgroundColor: "#6366f1" }}
        >
          <Send className="h-4 w-4" aria-hidden="true" />
        </button>
      </form>

      <p className="mt-2 text-center text-[10px] text-muted-foreground">
        El asistente está respondiendo…
      </p>
    </div>
  )
}
