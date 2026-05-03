"use client"

import { Shield, Loader2, Check, RotateCcw } from "lucide-react"
import { type Phase, PHASE_CONFIG, STEPS } from "@/lib/phases"
import { ProgressBar } from "@/components/progress-bar"

type PanelHeaderProps = {
  phase: Phase
  currentStep: number // 1-based
  onReset?: () => void
}

export function PanelHeader({ phase, currentStep, onReset }: PanelHeaderProps) {
  const config = PHASE_CONFIG[phase]

  // Map phase → step index for the 4-step bar (Problema/Canal/Entrevista/Reclamo)
  // "revisando" and "entrega" both map to the final "Reclamo" step.
  const phaseStepIndex: Record<Phase, number> = {
    intake: 1,
    canal: 2,
    entrevista: 3,
    revisando: 4,
    entrega: 4,
  }
  const activeStep = currentStep ?? phaseStepIndex[phase]

  return (
    <header className="bg-header text-header-foreground px-4 pt-3 pb-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="flex items-center justify-center h-7 w-7 rounded-md shrink-0"
            style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
          >
            <Shield
              className="h-4 w-4"
              style={{ color: config.color }}
              aria-hidden="true"
            />
          </div>
          <h1 className="text-[15px] font-semibold tracking-tight truncate">
            Defensor de Datos
          </h1>
        </div>

        <div className="flex items-center gap-1.5">
          {onReset && (
            <button
              type="button"
              onClick={onReset}
              aria-label="Nueva consulta"
              title="Nueva consulta"
              className="inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-white/10"
            >
              <RotateCcw className="h-3.5 w-3.5 text-white/60" />
            </button>
          )}
          <PhaseBadge phase={phase} />
        </div>
      </div>

      <p className="mt-1 ml-9 text-[11px] text-white/50 leading-tight">
        Ley 21.719 · Protección de datos
      </p>

      <div className="mt-4">
        <ProgressBar
          steps={STEPS.map((s) => s.label)}
          activeStep={activeStep}
          accentColor={config.color}
        />
      </div>
    </header>
  )
}

function PhaseBadge({ phase }: { phase: Phase }) {
  const config = PHASE_CONFIG[phase]
  const showSpinner = phase === "revisando"
  const showCheck = phase === "entrega"

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium leading-none"
      style={{
        backgroundColor: config.badgeBg,
        color: config.badgeText,
      }}
    >
      {showSpinner && (
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
      )}
      {showCheck && <Check className="h-3 w-3" aria-hidden="true" />}
      {!showSpinner && !showCheck && (
        <span
          aria-hidden="true"
          className="inline-block h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: config.color }}
        />
      )}
      {config.label}
    </span>
  )
}
