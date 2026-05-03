"use client"

import { useState, useCallback } from "react"
import { Send, Copy, Check } from "lucide-react"

type InputAreaProps = {
  showCopyButton: boolean
  disabled: boolean
  onSend: (text: string) => void
  borradorReclamo: string | null
}

export function InputArea({
  showCopyButton,
  disabled,
  onSend,
  borradorReclamo,
}: InputAreaProps) {
  const [text, setText] = useState("")
  const [copied, setCopied] = useState(false)

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      const trimmed = text.trim()
      if (!trimmed || disabled) return
      onSend(trimmed)
      setText("")
    },
    [text, disabled, onSend],
  )

  const handleCopy = useCallback(async () => {
    if (!borradorReclamo) return
    try {
      await navigator.clipboard.writeText(borradorReclamo)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea")
      textarea.value = borradorReclamo
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand("copy")
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [borradorReclamo])

  return (
    <div className="border-t border-border bg-card px-3 pt-3 pb-3">
      {showCopyButton && (
        <button
          type="button"
          onClick={handleCopy}
          className="mb-2.5 w-full inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-[13px] font-semibold text-white shadow-sm transition-all hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-offset-1 active:scale-[0.98]"
          style={{ backgroundColor: copied ? "#059669" : "#10b981" }}
        >
          {copied ? (
            <>
              <Check className="h-4 w-4" aria-hidden="true" />
              ¡Copiado!
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" aria-hidden="true" />
              Copiar Reclamo
            </>
          )}
        </button>
      )}

      <form
        className="flex items-end gap-2"
        onSubmit={handleSubmit}
        aria-label="Enviar mensaje"
      >
        <div className="relative flex-1">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Escribe aquí..."
            disabled={disabled}
            aria-label="Mensaje"
            className="w-full h-10 rounded-lg border border-border bg-muted/50 pl-3 pr-3 text-[13px] text-foreground placeholder:text-muted-foreground/80 outline-none transition-colors focus:bg-card focus:border-ring/60 disabled:cursor-not-allowed disabled:opacity-70"
          />
        </div>

        <button
          type="submit"
          disabled={disabled || !text.trim()}
          aria-label="Enviar"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white shadow-sm transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
          style={{ backgroundColor: "#6366f1" }}
        >
          <Send className="h-4 w-4" aria-hidden="true" />
        </button>
      </form>

      {disabled && (
        <p className="mt-2 text-center text-[10px] text-muted-foreground">
          El asistente está respondiendo…
        </p>
      )}
    </div>
  )
}
