"use client"

import { useEffect, useRef } from "react"
import { type Phase, PHASE_CONFIG } from "@/lib/phases"
import { AgentMessage } from "@/components/agent-message"
import { UserMessage } from "@/components/user-message"
import { TypingIndicator } from "@/components/typing-indicator"
import type { ChatMessage } from "@/hooks/use-legal-chat"

type ChatAreaProps = {
  phase: Phase
  messages: ChatMessage[]
  isStreaming: boolean
}

const PHASE_LABELS: Partial<Record<Phase, string>> = {
  intake: "Cuéntanos tu problema",
  canal: "Canal de reclamo",
  entrevista: "Entrevista iniciada",
  revisando: "Revisando con la ley…",
  entrega: "Tu reclamo está listo",
}

export function ChatArea({ phase, messages, isStreaming }: ChatAreaProps) {
  const accent = PHASE_CONFIG[phase].color
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll on new messages or streaming updates
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isStreaming])

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <div className="px-4 py-5 flex flex-col gap-4">
        {/* Phase transition marker */}
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          <span className="uppercase tracking-wider font-medium">
            {PHASE_LABELS[phase] ?? PHASE_CONFIG[phase].label}
          </span>
          <span className="h-px flex-1 bg-border" />
        </div>

        {/* Messages */}
        {messages.map((msg) => {
          // Hide system injection messages from the UI
          if (
            msg.role === "user" &&
            msg.content.startsWith("[SISTEMA")
          ) {
            return null
          }

          return msg.role === "assistant" ? (
            <AgentMessage key={msg.id}>
              <p className="leading-relaxed whitespace-pre-wrap">
                {msg.content}
              </p>
            </AgentMessage>
          ) : (
            <UserMessage key={msg.id}>{msg.content}</UserMessage>
          )
        })}

        {/* Typing indicator while streaming */}
        {isStreaming && messages[messages.length - 1]?.content === "" && (
          <TypingIndicator accentColor={accent} />
        )}

        {/* Scroll anchor */}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
