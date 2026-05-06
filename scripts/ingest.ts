/**
 * Pipeline de ingesta del knowledge base hacia Upstash Vector.
 *
 * Uso:
 *   npm run ingest                 # re-ingesta todo el knowledge/
 *   npm run ingest -- --source derecho_titular.md
 *   npm run ingest -- --clear      # borra el índice antes de ingerir
 *   npm run ingest -- --dry-run    # solo muestra qué chunks generaría
 *
 * Convenciones:
 * - Cada archivo del knowledge se chunkifica según extensión.
 * - El `type` se infiere del nombre del archivo, o desde frontmatter
 *   `---\ntype: ley\n---` si está presente.
 * - IDs estables: `<filename>::<chunkIndex>` → re-ingesta sobrescribe.
 *
 * Variables requeridas en .env.local:
 *   UPSTASH_VECTOR_REST_URL
 *   UPSTASH_VECTOR_REST_TOKEN
 */

import fs from "node:fs"
import path from "node:path"
import matter from "gray-matter"
import { chunkMarkdown, chunkCsv, chunkPlainText, type Chunk } from "../lib/chunker"
import {
  upsertChunks,
  deleteBySource,
  type ChunkMetadata,
} from "../lib/rag"

const KNOWLEDGE_DIR = path.join(process.cwd(), "knowledge")

type CliArgs = {
  source?: string
  clear: boolean
  dryRun: boolean
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { clear: false, dryRun: false }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === "--source") {
      args.source = argv[++i]
    } else if (a === "--clear") {
      args.clear = true
    } else if (a === "--dry-run") {
      args.dryRun = true
    } else if (a === "--help" || a === "-h") {
      console.log(
        "Uso:\n" +
          "  tsx scripts/ingest.ts [--source <file>] [--clear] [--dry-run]",
      )
      process.exit(0)
    }
  }
  return args
}

function inferType(filename: string): ChunkMetadata["type"] {
  const lower = filename.toLowerCase()
  if (
    /(ley|21719|21521|derecho|obligacion|infraccion|definicion|principio|agencia)/.test(
      lower,
    )
  ) {
    return "ley"
  }
  if (/(casos|dicom|patrones|jurisprud)/.test(lower)) return "casos"
  if (/(cmf|padron|institucion|sernac|boletin)/.test(lower)) return "padron"
  if (/(tos|terminos|t[_-]?c|condiciones)/.test(lower)) return "tos"
  return "otros"
}

type ParsedFile = {
  filename: string
  content: string
  type: ChunkMetadata["type"]
}

function readKnowledgeFiles(only?: string): ParsedFile[] {
  const all = fs.readdirSync(KNOWLEDGE_DIR)
  const files = only
    ? all.filter((f) => f === only)
    : all.filter((f) => /\.(md|csv|txt)$/i.test(f))
  if (only && files.length === 0) {
    throw new Error(`Archivo no encontrado en knowledge/: ${only}`)
  }
  return files.map((filename) => {
    const raw = fs.readFileSync(path.join(KNOWLEDGE_DIR, filename), "utf-8")
    if (filename.endsWith(".md")) {
      const parsed = matter(raw)
      const fmType = parsed.data?.type as ChunkMetadata["type"] | undefined
      return {
        filename,
        content: parsed.content,
        type: fmType ?? inferType(filename),
      }
    }
    return {
      filename,
      content: raw,
      type: inferType(filename),
    }
  })
}

function chunkFile(file: ParsedFile): Chunk[] {
  if (file.filename.endsWith(".md")) return chunkMarkdown(file.content)
  if (file.filename.endsWith(".csv")) return chunkCsv(file.content)
  return chunkPlainText(file.content)
}

async function main() {
  const args = parseArgs(process.argv.slice(2))

  if (!args.dryRun) {
    if (!process.env.UPSTASH_VECTOR_REST_URL || !process.env.UPSTASH_VECTOR_REST_TOKEN) {
      console.error(
        "❌ Faltan UPSTASH_VECTOR_REST_URL / UPSTASH_VECTOR_REST_TOKEN.",
      )
      console.error(
        "   Crea un índice en https://console.upstash.com/vector y agrégalas a .env.local",
      )
      console.error(
        "   El script se corre con: tsx --env-file=.env.local scripts/ingest.ts",
      )
      process.exit(1)
    }
  }

  const files = readKnowledgeFiles(args.source)
  console.log(`📚 ${files.length} archivo(s) a procesar`)

  let totalChunks = 0

  for (const file of files) {
    const chunks = chunkFile(file)
    if (chunks.length === 0) {
      console.warn(`  ⚠️  ${file.filename}: 0 chunks (vacío?)`)
      continue
    }

    const records = chunks.map((c, idx) => ({
      id: `${file.filename}::${idx}`,
      text: c.text,
      metadata: {
        source: file.filename,
        type: file.type,
        section: c.section,
        chunkIndex: idx,
        text: c.text,
      } satisfies ChunkMetadata,
    }))

    console.log(
      `  • ${file.filename} [${file.type}] → ${records.length} chunk(s)`,
    )

    if (args.dryRun) {
      records.slice(0, 2).forEach((r) => {
        console.log(
          `    └─ ${r.id}: "${r.text.slice(0, 80).replace(/\n/g, " ")}…"`,
        )
      })
      totalChunks += records.length
      continue
    }

    if (args.clear || args.source) {
      await deleteBySource(file.filename)
    }

    await upsertChunks(records)
    totalChunks += records.length
  }

  if (args.clear && !args.source && !args.dryRun) {
    console.log("🧹 (clear) borrado por archivo ya completado en bucle")
  }

  console.log(
    `✅ ${totalChunks} chunk(s) ${args.dryRun ? "evaluados" : "ingeridos"}`,
  )
}

main().catch((err) => {
  console.error("❌ Error en ingesta:", err)
  process.exit(1)
})
