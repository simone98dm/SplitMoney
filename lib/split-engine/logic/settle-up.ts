import { DEFAULT_FRACTION_DIGITS } from "../constants.js";
import type { Group, SuggestedPayment } from "../types.js";
import { roundToFractionDigits } from "../utils/currency.js";
import { calculateBalances } from "./balance-calculator.js";
import { validateGroup } from "./group-validator.js";
import {
  minimizePayments,
  type MinimizerOptions,
} from "./payments-minimizer.js";

export interface SettleUpOptions extends MinimizerOptions {
  /** Decimals of the group currency (2 for EUR, 0 for JPY). Smaller payments are dropped. */
  readonly fractionDigits?: number;
}

/**
 * Validates the group, computes balances and returns the fewest payments
 * that settle everyone up (what the app shows under "Suggested payments").
 * Amounts are unrounded; use `roundToFractionDigits` for display.
 */
export function suggestPayments(
  group: Group,
  options: SettleUpOptions = {},
): SuggestedPayment[] {
  validateGroup(group);
  const fractionDigits = options.fractionDigits ?? DEFAULT_FRACTION_DIGITS;
  return minimizePayments(calculateBalances(group), options)
    .filter(
      (transfer) => roundToFractionDigits(transfer.amount, fractionDigits) > 0,
    )
    .map((transfer) => ({
      ...transfer,
      currencyCode: group.defaultCurrencyCode,
    }));
}
