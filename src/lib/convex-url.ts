export function getConvexUrl(): string {
  const fromImportMeta =
    typeof import.meta !== "undefined" && typeof import.meta.env !== "undefined"
      ? import.meta.env.VITE_CONVEX_URL
      : undefined;
  const url = fromImportMeta ?? process.env?.VITE_CONVEX_URL ?? process.env?.CONVEX_URL;
  if (!url) {
    throw new Error(
      "VITE_CONVEX_URL is not set. Start `npx convex dev` or provide a deployment URL to use Convex.",
    );
  }
  return url;
}
