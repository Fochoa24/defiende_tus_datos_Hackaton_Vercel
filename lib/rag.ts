import { Index } from "@upstash/vector"

/**
 * Cliente Upstash Vector.
 *
 * Modo "data": Upstash hace los embeddings server-side con su modelo
 * multilingüe integrado. Mandamos texto crudo y nos devuelve resultados
 * semánticos. Cero gestión de embeddings en cliente.
 *
 * Configura los embeddings al crear el índice en la consola Upstash.
 * Recomendado: `mixedbread-ai/mxbai-embed-large-v1` (multilingüe, bueno
 * para español legal).
 */

let _index: Index | null = null

function getIndex(): Index {
  if (_index) return _index
  const url = process.env.UPSTASH_VECTOR_REST_URL
  const token = process.env.UPSTASH_VECTOR_REST_TOKEN
  if (!url || !token) {
    throw new Error(
      "Faltan UPSTASH_VECTOR_REST_URL y/o UPSTASH_VECTOR_REST_TOKEN. " +
        "Crea un índice en https://console.upstash.com/vector y pega las credenciales en .env.local",
    )
  }
  _index = new Index({ url, token })
  return _index
}

/** Metadata que adjuntamos a cada chunk en el índice. */
export type ChunkMetadata = {
  /** Nombre del archivo origen (ej: "derecho_titular.md", "cmf_instituciones.csv"). */
  source: string
  /** Tipo de contenido para filtrar en retrieval. */
  type: "ley" | "casos" | "padron" | "tos" | "otros"
  /** Breadcrumb de headers (ej: "Derechos del Titular > Derecho de Rectificación (Art. 6°)"). */
  section?: string
  /** Índice del chunk dentro del archivo (para reconstruir orden). */
  chunkIndex: number
  /** Texto del chunk (Upstash devuelve esto en el resultado). */
  text: string
}

export type RetrievedChunk = {
  id: string
  score: number
  metadata: ChunkMetadata
}

export type RetrieveOptions = {
  /** Cuántos chunks devolver. Default 5. */
  topK?: number
  /** Filtrar por tipo (ej: "ley" para validador, "casos" para entrevistador). */
  type?: ChunkMetadata["type"] | ChunkMetadata["type"][]
  /** Filtro arbitrario de Upstash sobre metadata (tiene prioridad sobre `type`). */
  filter?: string
  /** Score mínimo para considerar el chunk relevante. Default 0.5. */
  minScore?: number
}

/** Construye expresión de filtro Upstash desde opciones tipadas. */
function buildFilter(opts: RetrieveOptions): string | undefined {
  if (opts.filter) return opts.filter
  if (!opts.type) return undefined
  const types = Array.isArray(opts.type) ? opts.type : [opts.type]
  return types.map((t) => `type = '${t}'`).join(" OR ")
}

/**
 * Búsqueda semántica. Devuelve los chunks más relevantes ordenados por score.
 * Si Upstash no está configurado, devuelve [] sin lanzar error (modo dev).
 */
export async function retrieve(
  query: string,
  opts: RetrieveOptions = {},
): Promise<RetrievedChunk[]> {
  if (!process.env.UPSTASH_VECTOR_REST_URL) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[rag] Upstash no configurado, retrieve() devuelve []")
    }
    return []
  }
  const topK = opts.topK ?? 5
  const minScore = opts.minScore ?? 0.5
  const filter = buildFilter(opts)

  const results = await getIndex().query<ChunkMetadata>({
    data: query,
    topK,
    includeMetadata: true,
    ...(filter ? { filter } : {}),
  })

  return results
    .filter((r) => r.score >= minScore && r.metadata)
    .map((r) => ({
      id: String(r.id),
      score: r.score,
      metadata: r.metadata as ChunkMetadata,
    }))
}

/**
 * Inserta o actualiza chunks en el índice. Para uso en `scripts/ingest.ts`.
 * Hace upsert por batches de 50 (límite cómodo de Upstash data mode).
 */
export async function upsertChunks(
  chunks: Array<{ id: string; text: string; metadata: ChunkMetadata }>,
): Promise<void> {
  const index = getIndex()
  const BATCH = 50
  for (let i = 0; i < chunks.length; i += BATCH) {
    const batch = chunks.slice(i, i + BATCH)
    await index.upsert(
      batch.map((c) => ({
        id: c.id,
        data: c.text,
        metadata: c.metadata,
      })),
    )
  }
}

/** Borra todos los vectores de un `source` dado, antes de re-ingerir. */
export async function deleteBySource(source: string): Promise<void> {
  await getIndex().delete({ filter: `source = '${source}'` })
}

/**
 * Formatea chunks recuperados como bloque de contexto para inyectar en prompts.
 * Incluye el source y la sección como cita, para que el modelo pueda referenciar.
 */
export function formatContext(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) return ""
  return chunks
    .map((c, i) => {
      const cite = c.metadata.section
        ? `${c.metadata.source} → ${c.metadata.section}`
        : c.metadata.source
      return `[${i + 1}] (${cite})\n${c.metadata.text}`
    })
    .join("\n\n---\n\n")
}
