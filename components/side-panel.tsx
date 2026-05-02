import { PanelHeader } from "@/components/panel-header"
import { ChatArea } from "@/components/chat-area"
import { InputArea } from "@/components/input-area"
import type { Phase } from "@/lib/phases"

export function SidePanel() {
  // Default state per spec: "Entrevista" phase, step 3 of 4
  const phase: Phase = "entrevista"

  return (
    <aside
      aria-label="Defensor de Datos side panel"
      className="flex flex-col h-svh w-full md:w-[380px] md:shrink-0 bg-card shadow-[-1px_0_0_0_rgba(15,23,42,0.06),-8px_0_24px_-12px_rgba(15,23,42,0.12)] border-l border-border"
    >
      <PanelHeader phase={phase} currentStep={3} />
      <ChatArea phase={phase} />
      <InputArea showCopyButton={false} />
    </aside>
  )
}
