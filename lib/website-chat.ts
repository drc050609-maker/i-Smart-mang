const VISITOR_KEY_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const WEBSITE_CHAT_MAX_BODY = 4000;

export function isVisitorKey(value: string) {
  return VISITOR_KEY_RE.test(value);
}

export function clipText(value: string, max: number) {
  return value.trim().slice(0, max);
}
