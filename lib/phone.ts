const BN = "০১২৩৪৫৬৭৮৯";
export const toAsciiDigits = (s: string) => s.replace(/[০-৯]/g, (d) => String(BN.indexOf(d)));

/** Any common BD format → "01XXXXXXXXX", or null if invalid. */
export function normalizeBdPhone(raw: string): string | null {
  const d = toAsciiDigits(raw).replace(/[^\d]/g, "");
  const local = d.startsWith("880") ? d.slice(2) : d.startsWith("1") && d.length === 10 ? "0" + d : d;
  return /^01[3-9]\d{8}$/.test(local) ? local : null;
}

/** "01XXXXXXXXX" → "+8801XXXXXXXXX" */
export const toE164 = (local: string) => "+88" + local;
