const IMG = 'https://image.tmdb.org/t/p';
export const img = (path, size = 'w342') => (path ? `${IMG}/${size}${path}` : null);
export const year = (d) => (d ? d.slice(0, 4) : '—');
export const runtime = (m) => (m ? `${Math.floor(m / 60)}h ${m % 60}m` : '—');
export const LANGUAGES = [['en', 'English'], ['hi', 'Hindi'], ['es', 'Spanish'], ['fr', 'French'], ['ja', 'Japanese'], ['ko', 'Korean'], ['de', 'German'], ['ta', 'Tamil'], ['te', 'Telugu']];
export const toLocalInput = (iso) => (iso ? new Date(new Date(iso).getTime() - new Date(iso).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '');
export const fromLocalInput = (v) => (v ? new Date(v).toISOString() : null);
export const fmtDate = (iso) => (iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '');
export const timeAgo = (iso) => {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso)) / 1000));
  for (const [n, u] of [[86400, 'd'], [3600, 'h'], [60, 'm']]) if (s >= n) return `${Math.floor(s / n)}${u} ago`;
  return 'just now';
};
