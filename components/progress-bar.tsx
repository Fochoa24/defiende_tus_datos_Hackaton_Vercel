import { Check } from "lucide-react"

type ProgressBarProps = {
  steps: string[]
  activeStep: number // 1-based
  accentColor: string
}

export function ProgressBar({
  steps,
  activeStep,
  accentColor,
}: ProgressBarProps) {
  return (
    <div className="w-full">
      <ol className="flex items-start gap-1.5">
        {steps.map((label, i) => {
          const stepNumber = i + 1
          const isCompleted = stepNumber < activeStep
          const isActive = stepNumber === activeStep
          const isFuture = stepNumber > activeStep

          return (
            <li key={label} className="flex-1 min-w-0">
              <div
                className="h-1 w-full rounded-full transition-colors"
                style={{
                  backgroundColor: isFuture
                    ? "rgba(255,255,255,0.12)"
                    : accentColor,
                  opacity: isCompleted ? 0.55 : 1,
                }}
              />
              <div className="mt-2 flex items-center gap-1">
                {isCompleted ? (
                  <span
                    className="inline-flex h-3 w-3 items-center justify-center rounded-full shrink-0"
                    style={{ backgroundColor: accentColor, opacity: 0.7 }}
                    aria-label="Completado"
                  >
                    <Check
                      className="h-2 w-2"
                      strokeWidth={3}
                      style={{ color: "#1e1b4b" }}
                    />
                  </span>
                ) : (
                  <span
                    aria-hidden="true"
                    className="inline-block h-1.5 w-1.5 rounded-full shrink-0"
                    style={{
                      backgroundColor: isActive
                        ? accentColor
                        : "rgba(255,255,255,0.25)",
                    }}
                  />
                )}
                <span
                  className="text-[10px] leading-none truncate"
                  style={{
                    color: isActive
                      ? "#ffffff"
                      : isCompleted
                        ? "rgba(255,255,255,0.7)"
                        : "rgba(255,255,255,0.4)",
                    fontWeight: isActive ? 600 : 500,
                  }}
                >
                  {label}
                </span>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
