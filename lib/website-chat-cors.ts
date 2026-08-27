const DEFAULT_ORIGINS = [
  "http://127.0.0.1:3010",
  "http://localhost:3010",
  "https://i-smartmusic.com",
  "https://www.i-smartmusic.com",
  "https://admin.i-smartmusic.com",
  "http://127.0.0.1:3000",
  "http://localhost:3000",
];

function allowedOrigins() {
  const extra = process.env.WEBSITE_CHAT_ORIGINS?.split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return new Set([...DEFAULT_ORIGINS, ...(extra ?? [])]);
}

export function websiteChatCorsHeaders(request: Request) {
  const origin = request.headers.get("origin");
  const allowOrigin =
    origin && allowedOrigins().has(origin) ? origin : DEFAULT_ORIGINS[2];

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export function isAllowedWebsiteChatOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  return allowedOrigins().has(origin);
}
