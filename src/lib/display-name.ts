const DISPLAY_NAME_KEY = "cb.displayName";

export function readDisplayName(): string | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }
  const value = window.localStorage.getItem(DISPLAY_NAME_KEY);
  return value ? value.trim() : undefined;
}

export function persistDisplayName(value: string): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(DISPLAY_NAME_KEY, value.trim());
}
