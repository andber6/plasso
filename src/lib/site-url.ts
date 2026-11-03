/**
 * The site's public base URL. BETTER_AUTH_URL wins when set; on Vercel it falls
 * back to the production domain Vercel provides, locally to localhost.
 */
export const SITE_URL =
  process.env.BETTER_AUTH_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000');

/** Origins allowed to call the auth API: the site itself plus this deployment's own Vercel URLs (previews). */
export const TRUSTED_ORIGINS = [SITE_URL, process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL]
  .filter((u): u is string => Boolean(u))
  .map((u) => (u.startsWith('http') ? u : `https://${u}`));
