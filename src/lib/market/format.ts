import type { PostRow as Post } from '@/db/schema';

const MONTHS = ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'];

export function formatNumber(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export function formatKr(n: number): string {
  return `${formatNumber(n)} kr/mnd`;
}

export function formatSize(post: Pick<Post, 'size_min' | 'size_max'>): string {
  if (post.size_max > post.size_min) return `${formatNumber(post.size_min)}–${formatNumber(post.size_max)}`;
  return formatNumber(post.size_min);
}

export function parseDate(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

export function formatDate(iso: string): string {
  const d = parseDate(iso);
  if (!d) return 'Etter avtale';
  const now = new Date();
  if (d <= now) return 'Nå';
  const base = `${d.getDate()}. ${MONTHS[d.getMonth()]}`;
  return d.getFullYear() === now.getFullYear() ? base : `${base} ${d.getFullYear()}`;
}

/** Short form for tight spots: "jan. 2027", "Nå". */
export function formatMonthShort(iso: string): string {
  const d = parseDate(iso);
  if (!d) return 'Etter avtale';
  if (d <= new Date()) return 'Nå';
  return `${MONTHS[d.getMonth()].slice(0, 3)}. ${d.getFullYear()}`;
}

export function toISODate(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** The 1st of each of the next `count` months, as move-in choices. */
export function nextMonthStarts(count: number): { iso: string; label: string }[] {
  const now = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() + 1 + i, 1);
    const label = d.getFullYear() === now.getFullYear() ? `1. ${MONTHS[d.getMonth()]}` : `1. ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    return { iso: toISODate(d), label };
  });
}

/** The next `count` weekdays, as viewing-date choices. */
export function nextWeekdays(count: number): { iso: string; label: string }[] {
  const days = ['søn', 'man', 'tir', 'ons', 'tor', 'fre', 'lør'];
  const out: { iso: string; label: string }[] = [];
  const d = new Date();
  while (out.length < count) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() === 0 || d.getDay() === 6) continue;
    out.push({ iso: toISODate(d), label: `${days[d.getDay()]} ${d.getDate()}. ${MONTHS[d.getMonth()].slice(0, 3)}` });
  }
  return out;
}

export function formatLease(months: number): string {
  if (months < 12) return `${months} mnd`;
  const years = months / 12;
  return Number.isInteger(years) ? `${years} år` : `${months} mnd`;
}

/** Norwegian commercial rent is usually quoted per m² per year. */
export function perM2Year(post: Pick<Post, 'size_min' | 'size_max' | 'price'>): number | null {
  const size = post.size_max || post.size_min;
  if (!size || !post.price) return null;
  return Math.round((post.price * 12) / size / 10) * 10;
}

/** "i dag", "i går", "for 3 dager siden", or a date. */
export function formatRelative(date: Date): string {
  const days = Math.floor((Date.now() - date.getTime()) / 86400000);
  if (days <= 0) return 'i dag';
  if (days === 1) return 'i går';
  if (days < 14) return `for ${days} dager siden`;
  return `${date.getDate()}. ${MONTHS[date.getMonth()].slice(0, 3)}.`;
}
