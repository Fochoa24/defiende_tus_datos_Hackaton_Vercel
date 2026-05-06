import fs from "fs"
import path from "path"
import { retrieve, formatContext, type ChunkMetadata } from "./rag"

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

/**
 * Modo legacy: dump del archivo completo al prompt.
 * Útil mientras el knowledge es chico (< 6 archivos cortos).
 * A medida que sumes CSVs grandes y casos DICOM, migra a `retrieveContext`.
 */
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

/* ─────────────────────── RAG (modo retrieval) ─────────────────────── */

export type RetrieveContextOptions = {
  /** Cuántos chunks recuperar. Default 5. */
  topK?: number
  /** Filtrar por tipo de contenido (ley, casos, padron, tos, otros). */
  type?: ChunkMetadata["type"] | ChunkMetadata["type"][]
  /** Score mínimo. Default 0.5. */
  minScore?: number
}

/**
 * Recupera contexto relevante del vector store y lo devuelve como string
 * listo para inyectar en un prompt. Si Upstash no está configurado o no
 * hay matches, devuelve "" para que el caller decida fallback.
 *
 * Ejemplo en /api/chat-legal:
 *   const lastUser = body.messages.findLast(m => m.role === 'user')?.content ?? ''
 *   const ctx = await retrieveContext(lastUser, { type: 'ley', topK: 4 })
 *   const system = `${SYSTEM_BASE}\n\n${ctx}`
 */
export async function retrieveContext(
  query: string,
  opts: RetrieveContextOptions = {},
): Promise<string> {
  if (!query?.trim()) return ""
  const chunks = await retrieve(query, opts)
  return formatContext(chunks)
}
