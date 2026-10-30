/**
 * "payment" records a suggested transfer that actually happened: `payer`
 * gave `amount` to the single person in `participants`. Missing on data saved
 * before payments existed, which were all expenses.
 */
export type EntryKind = "expense" | "payment";

export interface Expense {
  id: string;
  kind?: EntryKind;
  payer: string;
  amount: number;
  description: string;
  /**
   * Snapshot of who this expense is split among, frozen when the expense is
   * created. Adding or removing participants later must not re-split expenses
   * that were already recorded.
   */
  participants: string[];
  timestamp: number;
}

export interface Transfer {
  from: string;
  to: string;
  /** Rounded to the cent, for display. */
  amount: number;
  /**
   * Unrounded engine amount. Recording a payment uses this one, so marking
   * every transfer done lands the balances on exactly zero instead of
   * leaving rounding crumbs that spawn new one-cent transfers.
   */
  exactAmount: number;
}

export interface ParticipantStats {
  totalPaid: number;
  totalOwed: number;
  netBalance: number;
  numberOfExpenses: number;
  averageExpense: number;
}
