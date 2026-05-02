import { type Phase, PHASE_CONFIG } from "@/lib/phases"
import { AgentMessage } from "@/components/agent-message"
import { UserMessage } from "@/components/user-message"
import { TypingIndicator } from "@/components/typing-indicator"
import { StructuredCard } from "@/components/structured-card"

type ChatAreaProps = {
  phase: Phase
}

export function ChatArea({ phase }: ChatAreaProps) {
  const accent = PHASE_CONFIG[phase].color

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <div className="px-4 py-5 flex flex-col gap-4">
        {/* Phase transition marker */}
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          <span className="uppercase tracking-wider font-medium">
            Entrevista iniciada
          </span>
          <span className="h-px flex-1 bg-border" />
        </div>

        {/* Agent message 1 — confirmation card carrying over from previous phase */}
        <AgentMessage>
          <p className="leading-relaxed">
            Perfecto. Identifiqué el canal correcto para presentar tu reclamo
            según la naturaleza del incidente.
          </p>
          <StructuredCard
            accentColor={accent}
            label="Canal recomendado"
            title="Agencia de Protección de Datos Personales"
            description="Reclamo administrativo formal por vulneración del derecho de acceso (Art. 5° Ley 21.719)."
          />
        </AgentMessage>

        {/* Agent message 2 — interview question */}
        <AgentMessage>
          <p className="leading-relaxed">
            Ahora necesito algunos datos para redactar el reclamo. Para empezar:
          </p>
          <p className="mt-2 leading-relaxed font-medium text-foreground">
            ¿Cuál es el nombre completo o razón social de la empresa contra la
            que deseas reclamar?
          </p>
          <p className="mt-2 text-[12px] text-muted-foreground leading-relaxed">
            Si tienes el RUT a mano también puedes incluirlo, pero no es
            obligatorio.
          </p>
        </AgentMessage>

        {/* User reply */}
        <UserMessage>
          Es Retail Andes SpA, RUT 76.123.456-7. Me solicitaron mi cédula y
          datos de salud para una compra online y nunca me explicaron por qué.
        </UserMessage>

        {/* Typing indicator while waiting */}
        <TypingIndicator accentColor={accent} />
      </div>
    </div>
  )
}
