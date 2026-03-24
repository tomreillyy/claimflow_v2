/**
 * Format a timestamp for audit-defensible display.
 * Output: "Recorded 14 March 2026 at 09:42 AEDT"
 *
 * Uses the Australia/Sydney timezone by default (RDTI context).
 * Falls back gracefully if Intl is unavailable.
 */
export function formatAuditTimestamp(ts, { prefix = 'Recorded', timezone = 'Australia/Sydney' } = {}) {
  if (!ts) return '';
  const date = new Date(ts);
  if (isNaN(date.getTime())) return '';

  const day = date.toLocaleDateString('en-AU', { day: 'numeric', timeZone: timezone });
  const month = date.toLocaleDateString('en-AU', { month: 'long', timeZone: timezone });
  const year = date.toLocaleDateString('en-AU', { year: 'numeric', timeZone: timezone });
  const time = date.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: timezone });

  // Extract timezone abbreviation (e.g. AEDT, AEST)
  let tzAbbr = '';
  try {
    const parts = new Intl.DateTimeFormat('en-AU', { timeZoneName: 'short', timeZone: timezone }).formatToParts(date);
    const tzPart = parts.find(p => p.type === 'timeZoneName');
    if (tzPart) tzAbbr = ` ${tzPart.value}`;
  } catch {
    // Intl not available — skip timezone abbreviation
  }

  return `${prefix} ${day} ${month} ${year} at ${time}${tzAbbr}`;
}

/**
 * Shorter audit timestamp for compact UI (e.g. evidence picker rows).
 * Output: "14 Mar 2026, 09:42 AEDT"
 */
export function formatAuditTimestampShort(ts, { timezone = 'Australia/Sydney' } = {}) {
  if (!ts) return '';
  const date = new Date(ts);
  if (isNaN(date.getTime())) return '';

  const datePart = date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', timeZone: timezone });
  const time = date.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: timezone });

  let tzAbbr = '';
  try {
    const parts = new Intl.DateTimeFormat('en-AU', { timeZoneName: 'short', timeZone: timezone }).formatToParts(date);
    const tzPart = parts.find(p => p.type === 'timeZoneName');
    if (tzPart) tzAbbr = ` ${tzPart.value}`;
  } catch {
    // skip
  }

  return `${datePart}, ${time}${tzAbbr}`;
}
