import { SidePanel } from "@/components/side-panel"

export default function Page() {
  return (
    <main className="min-h-svh w-full bg-background flex items-start justify-end">
      {/* Simulated webpage background to show the panel docked on the right */}
      <div
        aria-hidden="true"
        className="hidden md:flex flex-1 min-h-svh items-center justify-center px-8"
      >
        <div className="max-w-md text-center space-y-3">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Chrome Extension Preview
          </p>
          <h1 className="text-2xl font-semibold text-foreground text-balance">
            Defensor de Datos · Side Panel
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed text-pretty">
            Vista previa del panel lateral del asistente legal. La interfaz se
            ancla a la derecha del navegador con un ancho fijo de 380px.
          </p>
        </div>
      </div>

      <SidePanel />
    </main>
  )
}
