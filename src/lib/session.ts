const SESSION_KEY = "cb.sessionId";

export function getSessionId(): string | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }
  let id = window.sessionStorage.getItem(SESSION_KEY) ?? undefined;
  if (!id) {
    id = crypto.randomUUID();
    window.sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}
