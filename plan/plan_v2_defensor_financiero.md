# Plan de Ejecución v2 — Defensor de Datos Financieros

> **Pivote del MVP existente:** del "Asistente de Reclamos Ley 21.719" genérico a un **agente que actúa** sobre vulneraciones de **datos financieros** (DICOM/scoring/T&C bancarios), accesible desde **Chrome + WhatsApp**, que **redacta + envía + trackea** reclamos.
>
> **Hackathon:** 2-3 días, equipo de 4-5 personas.

---

## 1. Resultado del Brainstorm

**Apuesta core** = combinación de 4 piezas sobre la base existente:

| ID  | Pieza                                        | Rol en el demo                                                                       |
| --- | -------------------------------------------- | ------------------------------------------------------------------------------------ |
| A2  | Caso DICOM / scoring / banco                 | El "pain point" del demo: chileno aparece en DICOM injustamente, agente lo resuelve. |
| A1  | Cazador de letra chica en sitios financieros | Wow visual: extensión detecta T&C abusivos en banco/fintech en vivo.                 |
| B2  | Tracker de plazo legal (30 días)             | El agente vigila — Art. 11 obliga respuesta en 30 días, escalamos automático.        |
| C1  | Verificación CMF                             | El agente cruza la empresa contra registro público CMF antes de redactar.            |

**Accesos (multi-canal, mismo backend)**:

1.  **WhatsApp (Twilio Sandbox)** — puerta principal en móvil, cero instalación.
2.  **PWA instalable** sobre el Next.js existente — el sitio se "agrega al home screen" y queda con ícono propio, pantalla completa, look-and-feel de app nativa. Funciona en iOS y Android.
3.  **Web móvil responsive** — quien no quiera instalar nada, abre el sitio en su browser.
4.  **Extensión Chrome** — modo "power user" en desktop para el cazador de letra chica en vivo. **Deja de ser la cara del producto.**

> La extensión Chrome era el front-end original. Ahora pasa a ser un acceso secundario; el producto principal vive en el teléfono (WhatsApp + PWA).

**Acciones del agente**:

1.  Redactar reclamo formal (PDF descargable).
2.  **Pre-llenar formulario** del canal correspondiente (banco / SERNAC / Agencia futura).
3.  **Enviar correo** al canal usando Resend, con tracking de apertura.
4.  **Programar tracker de 30 días** y notificar por WhatsApp + extensión cuando toca escalar.
5.  Verificar institución contra **CSV CMF** y enriquecer el caso.

**Datos**: mocks bien hechos — bajamos los CSVs reales del CMF, SERNAC, Boletín Comercial y los servimos como knowledge.

---

## 2. Arquitectura Objetivo

```
                         ┌──────────────────────────┐
   Extensión Chrome ────▶│                          │
   (popup / side panel)  │   Next.js API en Vercel  │
                         │                          │
   WhatsApp (Twilio) ───▶│  ├── /api/chat-legal     │ ──▶ Anthropic
   webhook entrante      │  ├── /api/validate-claim │     (entrevistador
                         │  ├── /api/whatsapp       │     + revisor)
   Web (page.tsx) ──────▶│  ├── /api/send-claim     │
                         │  ├── /api/tracker        │
                         │  └── /api/cmf-lookup     │
                         └────────────┬─────────────┘
                                      │
                ┌─────────────────────┼─────────────────────┐
                │                     │                     │
                ▼                     ▼                     ▼
         Resend (email           Knowledge:            Vercel KV /
         + tracking de           Ley 21.719 +          Supabase
         aperturas)              CSVs CMF/             (estado del caso,
                                 SERNAC/DICOM          reclamos abiertos,
                                                       plazos)
```

**Módulos nuevos a sumar**:

- `lib/twilio.ts` — wrapper para WhatsApp.
- `lib/email.ts` — wrapper Resend con templates.
- `lib/tracker.ts` — programar y consultar plazos (Vercel Cron + KV/Supabase).
- `lib/cmf.ts` — leer CSV de instituciones autorizadas y exponer `lookup(empresa)`.
- `app/api/whatsapp/route.ts` — webhook entrante de Twilio que enruta al mismo motor de fases.
- `app/api/send-claim/route.ts` — envía reclamo por correo y guarda registro.
- `app/api/tracker/route.ts` — CRUD de plazos abiertos + endpoint para Vercel Cron.
- `app/api/cmf-lookup/route.ts` — verifica una empresa contra el padrón CMF.
- `knowledge/cmf_instituciones.csv` — padrón descargado.
- `knowledge/dicom_casos_tipicos.md` — catálogo de patrones de reclamo DICOM (rectificación Art. 6, supresión Art. 7, oposición Art. 8).

**PWA (Progressive Web App) sobre el Next.js**:

- `public/manifest.webmanifest` — nombre, íconos 192/512, theme color, `display: standalone`.
- `public/icon-192.png`, `public/icon-512.png` — íconos del launcher.
- `public/sw.js` o `next-pwa` — service worker para offline mínimo y cache de la shell.
- `app/layout.tsx` — `<link rel="manifest">`, meta tags Apple para iOS (`apple-touch-icon`, `apple-mobile-web-app-capable`).
- `app/page.tsx` — re-layout responsive: el side-panel actual se reusa pero ocupa toda la pantalla en móvil.
- `app/casos/page.tsx` — vista "Mis reclamos" con estado y trackers (la misma que ve la extensión).
- `app/login/page.tsx` — magic link por correo o ingreso por número de WhatsApp para vincular sesión.

**Lo que ya está hecho y se reutiliza**: `chat-legal`, `validate-claim`, knowledge Ley 21.719, side-panel UI, extensión MV3 con state machine.

---

## 3. Roles del Equipo (4-5 personas)

| Rol                                  | Responsable de                                                                                                                                    | Skills        |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| **1. Tech Lead / Backend**           | Orquestar agentes, ampliar `chat-legal` para flujo financiero, revisor con artículos específicos (Arts. 6/7/8/11/Ley 21.521), Vercel Cron        | TS, Next.js, IA |
| **2. WhatsApp + Acciones**           | Twilio Sandbox, webhook entrante, motor de envío Resend con templates, integración tracker → notificaciones                                      | Node, webhooks  |
| **3. Frontend / PWA / Extensión**    | Convertir el sitio en PWA instalable (manifest, service worker, íconos), responsive móvil, vista "Mis reclamos". Extensión queda como módulo lateral con el cazador de T&C | React, PWA, MV3 |
| **4. Datos + Knowledge**             | Curar CSVs CMF, SERNAC, casos DICOM. Escribir `dicom_casos_tipicos.md`, ampliar prompts del revisor con Ley 21.521 (Fintech). Verificación CMF   | Investigación, prompt eng |
| **5. PM + Demo + Pitch (opcional)**  | Guion del demo, slides, video, ensayo. Coordinación de hand-offs entre roles. Si no hay 5ta persona, lo absorbe el Tech Lead                     | Storytelling    |

---

## 4. Timeline 3 días

> Asumimos hackathon en horas continuas. Si son días con cortes, comprime los hitos a las horas reales.

### Día 1 — Fundaciones financieras (8-10h)

| Hora | Hito                                                                                  | Owner   |
| ---- | ------------------------------------------------------------------------------------- | ------- |
| H+0  | Kick-off, leer plan, validar entorno local corriendo                                 | Todos   |
| H+1  | Bajar CSV CMF instituciones autorizadas, dejarlo en `knowledge/`                     | Datos   |
| H+1  | Crear `knowledge/dicom_casos_tipicos.md` + ampliar prompt revisor con Ley 21.521     | Datos   |
| H+2  | Setup Twilio Sandbox; primer "hola mundo" entrante a webhook local                   | WhatsApp |
| H+2  | Setup Resend: cuenta, dominio, primer correo de prueba                                | WhatsApp |
| H+3  | `lib/cmf.ts` + `/api/cmf-lookup` funcional                                            | Backend  |
| H+4  | Adaptar prompt entrevistador para flujo DICOM (variantes de pregunta financiera)     | Backend  |
| H+5  | Inyectar `cmf-lookup` en revisor: si la empresa no está autorizada, marcarlo en el resultado | Backend |
| H+5  | **PWA setup**: `manifest.webmanifest`, íconos 192/512, meta tags iOS, service worker mínimo, layout móvil | Frontend |
| H+6  | Componente "Verificado por CMF ✓" en side-panel; el side-panel se reusa para móvil   | Frontend |
| H+7  | Test "agregar a pantalla de inicio" en iPhone y Android reales                       | Frontend |
| H+8  | **Demo interno 1**: caso DICOM completo end-to-end por PWA móvil genera reclamo      | Todos    |

### Día 2 — Acciones reales (8-10h)

| Hora | Hito                                                                                                          | Owner   |
| ---- | ------------------------------------------------------------------------------------------------------------- | ------- |
| H+0  | `/api/send-claim` envía correo con Resend + guarda registro en KV/Supabase                                   | WhatsApp |
| H+2  | `/api/tracker` crea plazo de 30 días al enviar reclamo; Vercel Cron diario verifica vencimientos              | Backend  |
| H+3  | Webhook WhatsApp entrante enruta al mismo `chat-legal`; estado por usuario en KV                              | WhatsApp |
| H+4  | Vista "Mis reclamos" en PWA (`/casos`) con estado: enviado, leído, respondido, vencido                       | Frontend |
| H+5  | Login por magic link (correo) y vinculación con número de WhatsApp para que el caso se vea en ambos canales  | Frontend |
| H+6  | Content script de extensión: detectar URLs de bancos/fintech listados, mostrar badge "analizar T&C"          | Frontend |
| H+6  | Endpoint `/api/analyze-tos` que recibe HTML/texto del T&C y devuelve cláusulas riesgo + propuesta de oposición | Backend  |
| H+8  | **Demo interno 2**: usuario inicia caso por WhatsApp, agente envía reclamo, tracker programado, side-panel ve "enviado" | Todos |

### Día 3 — Pulido + pitch (6-8h)

| Hora | Hito                                                                  | Owner   |
| ---- | --------------------------------------------------------------------- | ------- |
| H+0  | Bug bash; arreglar fricciones del demo                                | Todos   |
| H+2  | Empaquetar extensión, deploy de Next.js a Vercel preview              | Tech    |
| H+3  | Preparar 3 casos demo seedeados (DICOM, T&C abusivo, escalamiento)    | Datos   |
| H+4  | Slides (5-7): problema, demo, arquitectura, datos, qué sigue          | PM/Demo |
| H+5  | Video de respaldo (60s) por si la wifi falla                          | PM/Demo |
| H+6  | Ensayo + cronómetro                                                   | Todos   |

---

## 5. Demo Script (3 minutos al jurado)

**Acto 1 — El problema (30s).** Mostramos el dolor: María aparece en DICOM por una deuda que ya pagó. El banco la ignora. La Ley 21.719 le da derecho a rectificar (Art. 6) y ser eliminada (Art. 7), pero ¿cómo activarlo?

**Acto 2 — María en WhatsApp (60s).** María escribe a Defensor por WhatsApp: *"Aparezco en DICOM y ya pagué"*. El bot conduce la entrevista (5 preguntas), verifica al banco contra CMF en vivo, identifica los artículos vulnerados, y le manda el borrador del reclamo por WhatsApp.

**Acto 3 — María envía con un toque (45s).** María dice "envíalo". El agente envía correo formal al banco vía Resend. María recibe confirmación con número de seguimiento y tracker de 30 días activo.

**Acto 4 — Cazador en vivo (30s).** Cambiamos a Carla: visita el sitio de un banco que le pide aceptar T&C. La extensión salta y muestra: "esta cláusula te perfila para marketing — Art. 8 te permite oponerte. ¿Generamos la oposición?".

**Acto 5 — El cierre (15s).** Abrimos la **PWA en el iPhone** desde el ícono en home screen. Mostramos el dashboard de "Mis reclamos": 2 casos abiertos, 1 con plazo vencido + escalamiento sugerido a la Agencia. *"Mismo backend, accesible desde donde el usuario ya está: WhatsApp, su teléfono, el navegador, o como extensión en su trabajo."*

---

## 6. Riesgos y Plan B

| Riesgo                                              | Mitigación                                                                                          |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Twilio Sandbox limitado a contactos pre-registrados | OK para demo; el jurado verá el flujo desde nuestro número de prueba.                              |
| PWA en iOS no soporta push notifications confiable | Las notificaciones críticas (vencimientos) salen por WhatsApp, no por push. La PWA sirve como visualización + acción. |
| iOS Safari es estricto con service workers         | Mantener el SW mínimo: solo cache de la app shell. No prometemos offline completo en demo.        |
| Resend bloqueado o spam                             | Tener Plan B `mailto:` con borrador pre-cargado. El demo sigue funcionando.                        |
| CMF no expone API limpia                            | Por eso vamos con CSV mockeado descargado hoy. No depende de la red en demo.                       |
| Vercel Cron no se dispara a tiempo en demo          | Endpoint manual `/api/tracker/run-now` que dispara la verificación bajo demanda.                   |
| Equipo desigual                                     | El Tech Lead absorbe lo que se atrase; PM corta scope si día 2 no llegamos al hito de WhatsApp.    |

---

## 7. Criterios de Éxito (alineados al brief)

- **Educa sin asustar**: el agente habla en chileno claro y siempre indica plazo + canal concretos.
- **Genera acción**: el demo muestra correo enviado + tracker activo, no solo texto.
- **Respeta los datos**: usamos solo lo que el usuario tipea; nada de scraping de su bandeja; consentimiento explícito antes de enviar correos.
- **Accesible**: WhatsApp + extensión = donde el chileno ya está.
- **Diferenciador vs OneTrust/Mine/Consent-o-matic**: contexto chileno (CMF, SERNAC, Ley 21.719/21.521) + agente que actúa, no solo informa.

---

## 8. Checklist técnico de arranque (D1 H+0)

```bash
cd vercel/
cp .env.local .env.local.bak

# Variables que necesitamos sumar a .env.local
# ANTHROPIC_API_KEY=sk-...      (ya está)
# RESEND_API_KEY=re_...         (D1 H+2)
# TWILIO_ACCOUNT_SID=AC...      (D1 H+2)
# TWILIO_AUTH_TOKEN=...
# TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
# KV_URL=...                    (Vercel KV o Upstash gratis)
# CRON_SECRET=...               (proteger /api/tracker/run-now)

npm install resend twilio @vercel/kv next-pwa
npm run dev
```

---

## 9. Próximas decisiones que necesito confirmar contigo

1.  ¿Usamos **Vercel KV** o **Supabase** para persistir reclamos abiertos y tracker? (Vercel KV es más rápido de levantar; Supabase nos da consola para inspección durante demo.)
2.  ¿Quién es el 5to integrante o el Tech Lead absorbe pitch?
3.  ¿Tenemos un dominio que apuntar a Resend o usamos el `onresend.com` de prueba?
