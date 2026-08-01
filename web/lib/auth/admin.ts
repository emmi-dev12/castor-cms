// Admin routes are enabled only when running locally. On Vercel (production)
// they're disabled, so the hosted app is client-editor-only.

export function isAdminEnabled(): boolean {
  if (process.env.CMS_ENABLE_ADMIN === "1") return true;
  if (process.env.CMS_ENABLE_ADMIN === "0") return false;
  return process.env.NODE_ENV !== "production";
}
