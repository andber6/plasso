/**
 * The site's public base URL. BETTER_AUTH_URL wins when set; on Vercel it falls
 * back to the production domain (or the preview's own URL), locally to localhost.
 */
const vercelHost =
  process.env.VERCEL_ENV === 'production'
    ? process.env.VERCEL_PROJECT_PRODUCTION_URL
    : // Previews link to themselves, so magic links and e-mail links stay on the preview.
      process.env.VERCEL_BRANCH_URL || process.env.VERCEL_URL;

export const SITE_URL = process.env.BETTER_AUTH_URL || (vercelHost ? `https://${vercelHost}` : 'http://localhost:3000');

/** Origins allowed to call the auth API: the site itself plus this deployment's own Vercel URLs (previews). */
export const TRUSTED_ORIGINS = [SITE_URL, process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL]
  .filter((u): u is string => Boolean(u))
  .map((u) => (u.startsWith('http') ? u : `https://${u}`));
