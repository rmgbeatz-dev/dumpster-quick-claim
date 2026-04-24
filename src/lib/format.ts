export function dollars(cents: number | null | undefined): string {
  const n = typeof cents === 'number' ? cents : 0;
  return `$${(n / 100).toFixed(2)}`;
}

export function centsFromDollars(input: string): number {
  const cleaned = input.replace(/[^0-9.]/g, '');
  const value = parseFloat(cleaned);
  if (!isFinite(value)) return 0;
  return Math.round(value * 100);
}

export function csvEscape(val: unknown): string {
  const s = val === null || val === undefined ? '' : String(val);
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}
