/** Formattazione numerica in stile italiano. */
export function formatNumber(value: number, maximumFractionDigits = 2): string {
  if (!Number.isFinite(value)) return '—';
  return value.toLocaleString('it-IT', { maximumFractionDigits, minimumFractionDigits: 0 });
}
