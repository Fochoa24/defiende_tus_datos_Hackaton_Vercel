export type Phase =
  | "intake"
  | "canal"
  | "entrevista"
  | "revisando"
  | "entrega"

export type PhaseConfig = {
  label: string
  color: string
  badgeBg: string
  badgeText: string
}

export const PHASE_CONFIG: Record<Phase, PhaseConfig> = {
  intake: {
    label: "Problema",
    color: "#6366f1",
    badgeBg: "rgba(99, 102, 241, 0.18)",
    badgeText: "#c7d2fe",
  },
  canal: {
    label: "Canal",
    color: "#0ea5e9",
    badgeBg: "rgba(14, 165, 233, 0.18)",
    badgeText: "#bae6fd",
  },
  entrevista: {
    label: "Entrevista",
    color: "#f59e0b",
    badgeBg: "rgba(245, 158, 11, 0.18)",
    badgeText: "#fde68a",
  },
  revisando: {
    label: "Revisando",
    color: "#8b5cf6",
    badgeBg: "rgba(139, 92, 246, 0.18)",
    badgeText: "#ddd6fe",
  },
  entrega: {
    label: "Entrega",
    color: "#10b981",
    badgeBg: "rgba(16, 185, 129, 0.18)",
    badgeText: "#a7f3d0",
  },
}

export const STEPS: { key: Phase; label: string }[] = [
  { key: "intake", label: "Problema" },
  { key: "canal", label: "Canal" },
  { key: "entrevista", label: "Entrevista" },
  { key: "entrega", label: "Reclamo" },
]
