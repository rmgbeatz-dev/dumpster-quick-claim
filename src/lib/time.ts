import { formatInTimeZone } from 'date-fns-tz';
import { APP_TIMEZONE } from './env';

const DEFAULT_TZ = APP_TIMEZONE || 'America/New_York';

/** Format a timestamptz for display in Eastern Time. */
export function formatEastern(iso: string | Date, pattern = "yyyy-MM-dd HH:mm 'ET'"): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return formatInTimeZone(d, DEFAULT_TZ, pattern);
}

/** Short display for list rows. */
export function formatEasternShort(iso: string | Date): string {
  return formatEastern(iso, 'MMM d, HH:mm');
}

/** Return hours remaining until a deadline; negative if overdue. */
export function hoursRemaining(iso: string | null): number | null {
  if (!iso) return null;
  const deadline = new Date(iso).getTime();
  const now = Date.now();
  return (deadline - now) / (1000 * 60 * 60);
}
