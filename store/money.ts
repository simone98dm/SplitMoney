/**
 * Money is handled in integer cents everywhere except at the UI boundary.
 * Floating point euros silently lose fractions of a cent, and once several
 * balances are rounded independently they stop summing to zero — which makes
 * a settlement plan that never fully clears the debts.
 */

export const CENTS_PER_UNIT = 100;

export const toCents = (amount: number): number =>
  Math.round(amount * CENTS_PER_UNIT);

export const toEuro = (cents: number): number => cents / CENTS_PER_UNIT;

const EURO = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Always two decimals, Italian separators: 1.234,50 €. */
export const formatEuro = (amount: number): string => EURO.format(amount);

/**
 * Same, with an explicit + or −. The sign is what makes a balance readable
 * without color, so it is never optional on a figure that can go either way.
 */
export const formatSignedEuro = (amount: number): string => {
  if (amount === 0) return EURO.format(0);
  const sign = amount > 0 ? "+" : "−"; // U+2212, aligns with digits
  return `${sign}${EURO.format(Math.abs(amount))}`;
};

export const MAX_EXPENSE_AMOUNT = 1_000_000;

// "1.250,50" and "1.250": dots that group thousands, Italian style
const ITALIAN_THOUSANDS = /^\d{1,3}(\.\d{3})+(,\d+)?$/;

/**
 * Reads an amount the way an Italian types it ("12,50", "1.250,50", "12.5")
 * and says exactly what is wrong when it can't. Number() rather than
 * parseFloat(): "50abc" must be rejected, not read as 50.
 */
export const parseEuroInput = (
  raw: string
): { amount: number } | { error: string } => {
  const text = raw.trim().replace(/\s|€/g, "");
  if (text === "") return { error: "Scrivi quanto è costato." };

  const normalized = ITALIAN_THOUSANDS.test(text)
    ? text.replace(/\./g, "").replace(",", ".")
    : text.replace(",", ".");
  const amount = Number(normalized);

  if (!Number.isFinite(amount)) {
    return { error: "Scrivi solo cifre, per esempio 12,50." };
  }
  if (amount <= 0) return { error: "L'importo deve essere più di 0." };
  if (amount > MAX_EXPENSE_AMOUNT) {
    return { error: `L'importo massimo è ${formatEuro(MAX_EXPENSE_AMOUNT)}.` };
  }
  return { amount };
};
