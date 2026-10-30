import type { Expense, Transfer } from "~/types";
import { toCents, toEuro } from "~/store/money";
import {
  roundToFractionDigits,
  splitEqually,
  suggestPayments,
  type Entry,
  type Group,
} from "~/lib/split-engine";

/**
 * Bridge between the app's expenses and the split engine. All the splitting
 * and settling happens in the engine; this file only translates shapes and
 * rounds to cents for display.
 */

const CURRENCY = "EUR";
const FRACTION_DIGITS = 2;

const round = (amount: number): number =>
  roundToFractionDigits(amount, FRACTION_DIGITS);

export const isPayment = (expense: Expense): boolean =>
  expense.kind === "payment";

/** A payment is an entry whose only beneficiary is the receiver. */
export const toEntry = (expense: Expense): Entry => ({
  kind: isPayment(expense) ? "payment" : "expense",
  currencyCode: CURRENCY,
  primaryPayer: expense.payer,
  items: [
    {
      title: expense.description,
      amount: expense.amount,
      beneficiaries: splitEqually(expense.participants),
    },
  ],
});

/**
 * `roster` only seeds the people shown with a zero balance. Anyone who paid
 * for or took part in an expense is included even if they have since been
 * removed from the roster — dropping them would make their money vanish.
 */
export const toGroup = (expenses: Expense[], roster: string[]): Group => ({
  people: [
    ...new Set([
      ...roster,
      ...expenses.flatMap((e) => [e.payer, ...e.participants]),
    ]),
  ],
  defaultCurrencyCode: CURRENCY,
  currencyRates: { [CURRENCY]: 1 },
  entries: expenses.map(toEntry),
});

/** What `person` consumed of one expense, unrounded. */
export const shareOf = (expense: Expense, person: string): number =>
  toEntry(expense).items.reduce(
    (sum, item) => sum + (item.beneficiaries[person] ?? 0) * item.amount,
    0
  );

/**
 * Positive = must receive, negative = must pay. Throws on an invalid ledger.
 *
 * The displayed balances are derived from the rounded transfers, not rounded
 * on their own. The engine splits in exact fractions, so rounding each figure
 * independently let the header say −19,17 € next to "Dai 19,18 €". Summing
 * the transfers in whole cents makes every balance agree with the plan to
 * the cent, and the sheet sums to exactly zero.
 */
export const computeLedger = (
  expenses: Expense[],
  roster: string[]
): { balances: Record<string, number>; transfers: Transfer[] } => {
  const group = toGroup(expenses, roster);
  const transfers: Transfer[] = suggestPayments(group, {
    fractionDigits: FRACTION_DIGITS,
  }).map(({ from, to, amount }) => ({
    from,
    to,
    amount: round(amount),
    exactAmount: amount,
  }));

  const cents = transfers.reduce<Record<string, number>>(
    (acc, { from, to, amount }) => ({
      ...acc,
      [from]: (acc[from] ?? 0) - toCents(amount),
      [to]: (acc[to] ?? 0) + toCents(amount),
    }),
    Object.fromEntries(group.people.map((person) => [person, 0]))
  );

  return {
    balances: Object.fromEntries(
      Object.entries(cents).map(([person, value]) => [person, toEuro(value)])
    ),
    transfers,
  };
};
