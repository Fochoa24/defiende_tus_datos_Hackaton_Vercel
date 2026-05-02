import { z } from "zod/v4"
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod"
import { anthropic, MODEL } from "@/lib/anthropic"
import { loadKnowledge, KNOWLEDGE_REVISOR } from "@/lib/knowledge"

export const runtime = "nodejs"

const ChatMessage = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
})

const RequestBody = z.object({
  messages: z.array(ChatMessage).min(1),
})

const ClaimReview = z.object({
  suficiente: z
    .boolean()
    .describe("¿Hay info suficiente para redactar el reclamo formal?"),
  articulos_vulnerados: z
    .array(z.string())
    .describe(
      "Artículos específicos de la Ley 21.719 que fueron vulnerados (ej: 'Art. 5°', 'Art. 11')",
    ),
  tipo_infraccion: z
    .enum(["leve", "grave", "gravisima"])
    .describe("Clasificación de la infracción según Art. 34 de la Ley 21.719"),
  sancion_maxima: z
    .string()
    .describe(
      "Multa máxima aplicable expresada en UTM según Art. 35 (ej: 'Hasta 5.000 UTM')",
    ),
  canal_recomendado: z
    .enum(["empresa_directa", "agencia", "tribunal"])
    .describe(
      "Dónde debe presentarse el reclamo. 'empresa_directa' = primero a la empresa (Art. 11). 'agencia' = Agencia de Protección de Datos. 'tribunal' = Tribunal competente.",
    ),
  pregunta_faltante: z
    .string()
    .nullable()
    .describe(
      "Si suficiente=false, indica EXACTAMENTE qué pregunta debe hacerse al usuario para obtener el dato crítico que falta. Si suficiente=true, debe ser null.",
    ),
  borrador_reclamo: z
    .string()
    .nullable()
    .describe(
      "Si suficiente=true, el texto completo del reclamo formal listo para enviar. Si suficiente=false, debe ser null.",
    ),
})

const SYSTEM = `Eres un revisor legal experto en la Ley 21.719 de Chile sobre Protección de Datos Personales.
Recibirás la transcripción de una entrevista entre un asistente legal y un ciudadano que presenta un posible caso de vulneración de datos personales.

Tu trabajo:
1. Determinar si los hechos relatados son suficientes para identificar qué artículos de la Ley 21.719 fueron vulnerados.
2. Si falta información crítica, indicar EXACTAMENTE qué pregunta debe hacerse al usuario para obtenerla.
3. Si la información es suficiente, redactar el reclamo formal listo para presentar.

REGLAS ESTRICTAS:
- Usa SOLO los artículos y multas que aparecen en el knowledge base proporcionado. No inventes números de artículo ni montos de UTM.
- Si el usuario aún NO ha contactado a la empresa, el canal_recomendado es "empresa_directa" (Art. 11 — paso obligatorio antes de escalar).
- Si ya contactó a la empresa y no obtuvo respuesta en 30 días, el canal es "agencia".
- Tipo de infracción: clasifica según Art. 34 (leve / grave / gravisima — usa "gravisima" sin tilde).
- Datos críticos para suficiencia: nombre/razón social de la empresa, qué dato fue afectado, qué hizo la empresa, fecha aproximada, contacto previo con la empresa y respuesta.

FORMATO DEL BORRADOR (cuando suficiente=true):

Señores [empresa o "Agencia de Protección de Datos Personales"]:

Yo, [NOMBRE_TITULAR — si no se conoce, dejar como [NOMBRE]], cédula de identidad [RUT — si no se conoce, dejar como [RUT]], por medio del presente vengo en interponer reclamo formal en virtud del/los artículo(s) [X] de la Ley N° 21.719 de Protección de Datos Personales, por los siguientes hechos:

HECHOS:
[descripción factual basada en lo que el usuario relató]

DERECHO VULNERADO:
[artículo específico y descripción del derecho vulnerado]

PETICIÓN CONCRETA:
[lo que el usuario está solicitando: supresión de datos, acceso, rectificación, indemnización, etc.]

Fecha: [fecha actual o "[FECHA]"]
Firma: ___________________

CONOCIMIENTO LEGAL DE REFERENCIA:

${loadKnowledge(KNOWLEDGE_REVISOR)}`

function buildTranscript(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
): string {
  return messages
    .map((m) => {
      const speaker = m.role === "user" ? "Ciudadano" : "Asistente"
      return `${speaker}: ${m.content}`
    })
    .join("\n\n")
}

export async function POST(req: Request) {
  let body: z.infer<typeof RequestBody>
  try {
    body = RequestBody.parse(await req.json())
  } catch (err) {
    return Response.json(
      { error: "Invalid request body", detail: String(err) },
      { status: 400 },
    )
  }

  const transcript = buildTranscript(body.messages)

  try {
    const response = await anthropic.messages.parse({
      model: MODEL,
      max_tokens: 4096,
      system: [
        {
          type: "text",
          text: SYSTEM,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: `Analiza la siguiente transcripción de entrevista y emite tu evaluación estructurada según el schema.\n\n--- TRANSCRIPCIÓN ---\n\n${transcript}\n\n--- FIN ---`,
        },
      ],
      output_config: {
        // SDK 0.92 typings reference Zod v3 ZodType, but the runtime uses zod/v4.
        // Cast the schema; we still get correctly-typed parsed_output below.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        format: zodOutputFormat(ClaimReview as any),
      },
    })

    const parsed = response.parsed_output as
      | z.infer<typeof ClaimReview>
      | null

    if (!parsed) {
      return Response.json(
        {
          error: "Model did not return parseable output",
          stop_reason: response.stop_reason,
        },
        { status: 502 },
      )
    }

    return Response.json(parsed, {
      headers: {
        "x-cache-read": String(response.usage.cache_read_input_tokens ?? 0),
        "x-cache-write": String(
          response.usage.cache_creation_input_tokens ?? 0,
        ),
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return Response.json({ error: message }, { status: 500 })
  }
}
