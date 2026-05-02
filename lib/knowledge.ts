import fs from "fs"
import path from "path"

const KNOWLEDGE_DIR = path.join(process.cwd(), "knowledge")

let cache: Map<string, string> | null = null

function loadAll(): Map<string, string> {
  if (cache) return cache
  const m = new Map<string, string>()
  for (const file of fs.readdirSync(KNOWLEDGE_DIR)) {
    if (!file.endsWith(".md")) continue
    m.set(file, fs.readFileSync(path.join(KNOWLEDGE_DIR, file), "utf-8"))
  }
  cache = m
  return m
}

export function loadKnowledge(files: string[]): string {
  const all = loadAll()
  return files
    .map((f) => {
      const content = all.get(f)
      if (!content) throw new Error(`Knowledge file not found: ${f}`)
      return `## ${f}\n\n${content}`
    })
    .join("\n\n---\n\n")
}

export const KNOWLEDGE_CHAT = [
  "indice_enrutador.md",
  "definiciones_y_principios.md",
  "derecho_titular.md",
  "agencia_y_reclamos.md",
]

export const KNOWLEDGE_REVISOR = [
  "definiciones_y_principios.md",
  "derecho_titular.md",
  "obligaciones_e_infracciones.md",
  "agencia_y_reclamos.md",
]
