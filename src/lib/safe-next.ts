/**
 * A post-login redirect target that can only stay on this site. Rejects
 * protocol-relative URLs ("//x") and backslash tricks ("/\x"), which browsers
 * treat as "//x".
 */
export function safeNext(value: unknown): string {
  const next = typeof value === 'string' ? value.trim().slice(0, 300) : '';
  return /^\/(?![/\\])/.test(next) && !next.includes('\\') ? next : '/';
}
