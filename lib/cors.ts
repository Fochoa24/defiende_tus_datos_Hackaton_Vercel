export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
}

export function corsResponse() {
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}
