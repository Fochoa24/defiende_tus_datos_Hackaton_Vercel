/**
 * Chunking de archivos del knowledge base.
 *
 * Estrategia:
 * - Markdown: split por headers (## y ###). Cada chunk lleva breadcrumb.
 *   Si un chunk excede MAX_CHARS, sub-split por párrafos.
 * - CSV: agrupa filas en bloques con la cabecera al frente. Útil para
 *   padrones tipo CMF (cada chunk preserva el contexto de las columnas).
 * - Texto plano: split por párrafos hasta MAX_CHARS.
 */

const MAX_CHARS = 1500
const MIN_CHARS = 100
const CSV_ROWS_PER_CHUNK = 25

export type Chunk = {
  text: string
  section?: string
}

/* ─────────────────────── Markdown ─────────────────────── */

type MarkdownBlock = { breadcrumb: string[]; body: string[] }

/**
 * Divide markdown en bloques delimitados por headers (## y ###).
 * Mantiene un breadcrumb jerárquico para cada bloque.
 */
function splitMarkdownByHeaders(content: string): MarkdownBlock[] {
  const lines = content.split("\n")
  const blocks: MarkdownBlock[] = []

  let h1: string | null = null
  let h2: string | null = null
  let h3: string | null = null
  let buffer: string[] = []

  const flush = () => {
    if (buffer.length === 0) return
    const breadcrumb = [h1, h2, h3].filter(Boolean) as string[]
    blocks.push({ breadcrumb, body: buffer })
    buffer = []
  }

  for (const line of lines) {
    const m1 = /^#\s+(.+?)\s*$/.exec(line)
    const m2 = /^##\s+(.+?)\s*$/.exec(line)
    const m3 = /^###\s+(.+?)\s*$/.exec(line)

    if (m1) {
      flush()
      h1 = m1[1]
      h2 = null
      h3 = null
    } else if (m2) {
      flush()
      h2 = m2[1]
      h3 = null
    } else if (m3) {
      flush()
      h3 = m3[1]
    } else {
      buffer.push(line)
    }
  }
  flush()

  return blocks.filter((b) => b.body.join("").trim().length > 0)
}

/** Sub-split por párrafos cuando un bloque excede MAX_CHARS. */
function splitByParagraphs(text: string, maxChars: number): string[] {
  const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
  const out: string[] = []
  let current = ""
  for (const p of paragraphs) {
    if ((current + "\n\n" + p).length > maxChars && current) {
      out.push(current.trim())
      current = p
    } else {
      current = current ? current + "\n\n" + p : p
    }
  }
  if (current.trim()) out.push(current.trim())
  return out
}

export function chunkMarkdown(content: string): Chunk[] {
  const blocks = splitMarkdownByHeaders(content)
  const chunks: Chunk[] = []

  for (const block of blocks) {
    const section = block.breadcrumb.join(" > ") || undefined
    const text = block.body.join("\n").trim()
    if (text.length < MIN_CHARS && chunks.length > 0) {
      const last = chunks[chunks.length - 1]
      last.text += "\n\n" + (section ? `**${section}**\n` : "") + text
      continue
    }
    if (text.length <= MAX_CHARS) {
      chunks.push({ text, section })
      continue
    }
    const subs = splitByParagraphs(text, MAX_CHARS)
    subs.forEach((s, i) => {
      const subSection = section
        ? `${section} (parte ${i + 1}/${subs.length})`
        : undefined
      chunks.push({ text: s, section: subSection })
    })
  }

  return chunks
}

/* ─────────────────────── CSV ─────────────────────── */

/** Parser CSV minimalista que maneja comillas dobles y comas dentro de campos. */
function parseCsv(content: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let inQuotes = false

  for (let i = 0; i < content.length; i++) {
    const ch = content[i]
    if (inQuotes) {
      if (ch === '"' && content[i + 1] === '"') {
        field += '"'
        i++
      } else if (ch === '"') {
        inQuotes = false
      } else {
        field += ch
      }
      continue
    }
    if (ch === '"') {
      inQuotes = true
    } else if (ch === ",") {
      row.push(field)
      field = ""
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && content[i + 1] === "\n") i++
      row.push(field)
      field = ""
      if (row.some((c) => c.length > 0)) rows.push(row)
      row = []
    } else {
      field += ch
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    if (row.some((c) => c.length > 0)) rows.push(row)
  }

  return rows
}

/**
 * Convierte un CSV en chunks. Cada chunk lleva la cabecera + un grupo de filas
 * formateado como tabla legible para que el embedding capture el contexto.
 */
export function chunkCsv(content: string, rowsPerChunk = CSV_ROWS_PER_CHUNK): Chunk[] {
  const rows = parseCsv(content)
  if (rows.length < 2) return []

  const headers = rows[0]
  const dataRows = rows.slice(1)
  const chunks: Chunk[] = []

  for (let i = 0; i < dataRows.length; i += rowsPerChunk) {
    const slice = dataRows.slice(i, i + rowsPerChunk)
    const lines = slice.map((r) => {
      return headers.map((h, idx) => `${h}: ${r[idx] ?? ""}`).join(" | ")
    })
    const text = `Cabecera: ${headers.join(" | ")}\n\n${lines.join("\n")}`
    const fromIdx = i + 1
    const toIdx = Math.min(i + rowsPerChunk, dataRows.length)
    chunks.push({
      text,
      section: `filas ${fromIdx}-${toIdx} de ${dataRows.length}`,
    })
  }

  return chunks
}

/* ─────────────────────── Texto plano ─────────────────────── */

export function chunkPlainText(content: string): Chunk[] {
  return splitByParagraphs(content.trim(), MAX_CHARS).map((text) => ({ text }))
}
