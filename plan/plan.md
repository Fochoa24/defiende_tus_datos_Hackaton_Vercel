# Plan de Ejecución: MVP "Asistente de Reclamos de Datos Personales — Chile"

> **Enfoque único:** Ayudar a ciudadanos chilenos a entender su problema de protección de datos, encontrar el canal correcto y redactar el reclamo formal, todo guiado por la Ley 21.719.

---

## 1. Visión General

Una **Extensión de Chrome (Manifest V3)** con un chat que actúa como abogado de bolsillo. El usuario describe su problema, dos agentes de IA trabajan en paralelo (entrevistador + revisor legal), y al final el sistema entrega al usuario el canal exacto donde reclamar + el documento de reclamo listo para enviar.

**Stack exclusivamente Vercel:**
- **Backend:** Next.js (App Router) en Vercel
- **IA:** Vercel AI SDK — `streamText` para el chat y `generateObject` para validación estructurada interna
- **Base de Conocimiento (RAG Local):** Archivos `.md` leídos con `fs.readFileSync` — sin base de datos vectorial
- **Frontend:** Chrome Extension (Manifest V3), `chrome.storage.local` para persistir el hilo

---

## 2. Estructura de Archivos

```text
/
├── /knowledge                          ← Base de conocimiento RAG (YA EXISTENTE)
│   ├── indice_enrutador.md             ← Mapa de qué archivo consultar según la consulta
│   ├── definiciones_y_principios.md    ← Qué es dato personal, sensible, principios Art. 3°
│   ├── derecho_titular.md              ← Derechos ARCOP del titular (Arts. 4–11)
│   ├── obligaciones_e_infracciones.md  ← Obligaciones empresa + sanciones (Arts. 12, 34–35)
│   ├── agencia_y_reclamos.md           ← Procedimiento de reclamo paso a paso (Arts. 30, 41, 43)
│   └── 21719.md                        ← Texto completo de la ley (referencia profunda)
│
├── /app
│   └── /api
│       ├── /chat-legal/route.ts        ← Orquestador principal (Agente Entrevistador)
│       └── /validate-claim/route.ts    ← Agente Revisor Legal (valida suficiencia del reclamo)
│
└── /extension-datos                    ← Extensión Chrome
    ├── manifest.json
    ├── popup.html                      ← UI del chat (estados visuales por fase)
    ├── popup.js                        ← Lógica, streaming, state machine por fase
    └── content.js                      ← (Reservado — no se usa en este flujo)
```

---

## 3. Arquitectura del Flujo de Reclamos (Multi-Agente)

El flujo tiene **4 fases secuenciales**. La extensión muestra visualmente en qué fase está.

```
FASE 1: INTAKE          FASE 2: CANAL           FASE 3: ENTREVISTA         FASE 4: ENTREGA
─────────────────       ─────────────────       ──────────────────────     ─────────────────
Usuario describe   →    Agente identifica  →    Agente Entrevistador   →   Agente presenta
su problema libre       el canal correcto        pregunta 1 a la vez         opciones +
(texto libre)           para reclamar            ↕ (itera con                documento
                        (empresa o Agencia)       Agente Revisor)             formal listo
```

### Agente 1: Entrevistador (`/api/chat-legal`)

**Responsabilidad:** Conducir la conversación con el usuario. Opera en las 4 fases.

**System Prompt:**
```
Eres un asistente legal chileno especializado en la Ley 21.719 de Protección de Datos Personales.
Operas en 4 fases estrictas. Tu estado actual se incluye en cada mensaje del sistema.

FASE 1 — INTAKE:
Saluda brevemente y pide al usuario que describa su problema con sus propias palabras.
No hagas preguntas todavía. Solo escucha y confirma con empatía que entendiste.
Cuando tengas el problema general, emite internamente: { fase: "canal", resumen: "..." }

FASE 2 — CANAL:
Basado en el problema y en /knowledge/agencia_y_reclamos.md, determina si el usuario debe:
  a) Ir primero directamente a la empresa (Art. 11 — siempre el primer paso legal obligatorio)
  b) Escalar a la Agencia de Protección de Datos si la empresa no respondió en 30 días
Preséntale al usuario UN párrafo claro con el camino a seguir y por qué.
Pregunta si quiere continuar para preparar el documento.

FASE 3 — ENTREVISTA (más crítica):
Haz UNA pregunta por turno. Orden recomendado:
  1. ¿Cuál es el nombre exacto de la empresa o entidad involucrada?
  2. ¿Qué dato personal fue afectado? (ej: RUT, correo, datos de salud, etc.)
  3. ¿Qué hizo exactamente la empresa con ese dato? (compartió, no eliminó, no respondió, etc.)
  4. ¿Cuándo ocurrió? (fecha aproximada)
  5. ¿Ya enviaste alguna solicitud formal a la empresa? ¿Cuándo? ¿Obtuviste respuesta?
REGLA: No avances a la siguiente pregunta sin confirmar la anterior.
Después de las 5 preguntas, llama al endpoint /api/validate-claim con el resumen.

FASE 4 — ENTREGA:
Presenta al usuario:
  - El artículo exacto de la Ley 21.719 que fue vulnerado
  - El canal de denuncia (empresa / Agencia / Tribunal)
  - El borrador del reclamo formal (ver formato abajo)
  - Sanción máxima aplicable a la empresa
```

### Agente 2: Revisor Legal (`/api/validate-claim`)

**Responsabilidad:** Recibe el resumen recopilado por el Entrevistador, lo compara contra la ley y decide si hay suficiente información para redactar el reclamo O qué pregunta crítica falta.

**Herramienta IA:** `generateObject` con el siguiente schema Zod:

```typescript
z.object({
  suficiente: z.boolean().describe("¿Hay info suficiente para redactar el reclamo?"),
  articulos_vulnerados: z.array(z.string()).describe("Artículos específicos de la Ley 21.719 que aplican"),
  tipo_infraccion: z.enum(["leve", "grave", "gravísima"]).describe("Clasificación según Art. 34"),
  sancion_maxima: z.string().describe("Multa máxima aplicable en UTM según Art. 35"),
  canal_recomendado: z.enum(["empresa_directa", "agencia", "tribunal"]),
  pregunta_faltante: z.string().nullable().describe("Si suficiente=false, qué dato crítico falta"),
  borrador_reclamo: z.string().nullable().describe("Si suficiente=true, el texto del reclamo formal"),
})
```

**System Prompt del Revisor:**
```
Eres un revisor legal experto en la Ley 21.719 de Chile. Recibes un resumen de hechos recopilados
sobre un posible caso de vulneración de datos personales.

Tu trabajo:
1. Revisa si los hechos son suficientes para identificar qué artículo fue vulnerado.
2. Si falta información crítica, indica exactamente qué pregunta debe hacerse.
3. Si la información es completa, redacta el reclamo formal con este formato:

--- FORMATO RECLAMO FORMAL ---
Señores [Empresa/Agencia de Protección de Datos],
Yo, [NOMBRE_TITULAR], RUT [RUT], por medio del presente escrito vengo en interponer
reclamo/solicitud en virtud del artículo [X] de la Ley N° 21.719, por los siguientes hechos:

HECHOS: [descripción factual]
DERECHO VULNERADO: [artículo y descripción]
PETICIÓN CONCRETA: [lo que el usuario quiere — supresión, acceso, indemnización, etc.]
Fecha: [fecha]
--- FIN FORMATO ---

Usa SOLO los archivos de knowledge proporcionados. No inventes artículos ni multas.
```

---

## 4. Estado Visual de la Extensión (State Machine en popup.js)

```javascript
const ESTADOS = {
  idle:       { titulo: "Asistente Legal de Datos",   color: "#6366f1" },
  intake:     { titulo: "Cuéntame tu problema",        color: "#6366f1" },
  canal:      { titulo: "Encontramos tu canal",        color: "#0ea5e9" },
  entrevista: { titulo: "Recopilando información...",  color: "#f59e0b" },
  revisando:  { titulo: "Revisando con la ley...",     color: "#8b5cf6" },  // llama al Revisor
  entrega:    { titulo: "Tu reclamo está listo ✓",     color: "#10b981" },
  error:      { titulo: "Algo salió mal",              color: "#ef4444" },
}
```

La extensión **persiste el estado y el historial** en `chrome.storage.local`. Si el usuario cierra y vuelve a abrir el popup, retoma desde donde dejó.

---

## 5. Cómo los Agentes Leen el Knowledge

En ambos endpoints, cargar así al inicio del handler:

```typescript
import path from 'path'
import fs from 'fs'

function loadKnowledge(files: string[]): string {
  return files.map(f => {
    const filePath = path.join(process.cwd(), 'knowledge', f)
    return fs.readFileSync(filePath, 'utf-8')
  }).join('\n\n---\n\n')
}

// En chat-legal: cargar contexto según la fase actual
const knowledgeChat = loadKnowledge([
  'indice_enrutador.md',
  'derecho_titular.md',
  'agencia_y_reclamos.md',
  'definiciones_y_principios.md',
])

// En validate-claim: cargar todo para revisión exhaustiva
const knowledgeRevisor = loadKnowledge([
  'obligaciones_e_infracciones.md',
  'agencia_y_reclamos.md',
  'derecho_titular.md',
  'definiciones_y_principios.md',
])
```

---

## 6. Plan de Ejecución para Claude Code

### FASE 1 — Backend (prioridad máxima)

**Paso 1.1:** Inicializar proyecto Next.js con Vercel AI SDK
```bash
npx create-next-app@latest . --typescript --app --no-src-dir --no-tailwind
npm install ai @ai-sdk/openai zod
```

**Paso 1.2:** Crear `/app/api/validate-claim/route.ts`
- Recibe `{ resumen: string, historial: Message[] }`
- Usa `generateObject` con el schema Zod del Revisor
- Inyecta `knowledgeRevisor` en el system prompt
- Retorna el objeto validado

**Paso 1.3:** Crear `/app/api/chat-legal/route.ts`
- Recibe `{ messages: Message[], fase: string }`
- Usa `streamText` con el system prompt del Entrevistador
- Inyecta `knowledgeChat` en el system prompt
- Cuando `fase === "entrevista"` y hay 5 respuestas: llama internamente a `/api/validate-claim`
- Si el Revisor retorna `suficiente: false`: agrega la `pregunta_faltante` al stream
- Si el Revisor retorna `suficiente: true`: incluye el `borrador_reclamo` como mensaje final
- Configura CORS headers para `localhost` durante desarrollo

### FASE 2 — Extensión Chrome

**Paso 2.1:** Crear `manifest.json` con permisos: `storage`, `activeTab`

**Paso 2.2:** Crear `popup.html`
- Header con título dinámico (según estado)
- Área de chat con mensajes (burbujas usuario/agente)
- Input text + botón Enviar
- Botón "Copiar Reclamo" (visible solo en estado `entrega`)
- Indicador de fase (barra de progreso 4 pasos)

**Paso 2.3:** Crear `popup.js`
- Al cargar: leer `chrome.storage.local` y restaurar estado + historial
- Función `sendMessage(text)`: POST a `/api/chat-legal`, manejar stream con `ReadableStream`, renderizar en UI
- Función `updateEstado(nuevoEstado)`: actualizar header color + título
- Función `copiarReclamo()`: copiar el texto del borrador al clipboard
- Guardar en storage después de cada mensaje: `{ estado, messages, fase }`

### FASE 3 — Refinamiento

1. Timeout de 30s en los fetch con `AbortController`
2. Manejo de errores de red con mensaje amigable al usuario
3. Botón "Empezar de nuevo" que limpia `chrome.storage.local`
4. Validar que el modelo configurado en Vercel (variable de entorno `OPENAI_API_KEY` o el que corresponda) esté disponible

---

## 7. Variables de Entorno Necesarias

```env
# .env.local
OPENAI_API_KEY=sk-...        # O la clave del proveedor elegido en Vercel AI SDK
```

---

## 8. URL de Desarrollo

Durante desarrollo local, la extensión apunta a:
```
http://localhost:3000/api/chat-legal
http://localhost:3000/api/validate-claim
```

Para producción en Vercel, cambiar a la URL del deployment.
