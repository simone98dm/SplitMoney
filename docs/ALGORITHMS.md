# Algorithm Documentation

How SplitMoney turns a list of expenses into the shortest list of payments
that clears every debt.

All of it lives in the **split engine** (`lib/split-engine/`). `store/split.ts` is the only
bridge: it turns `Expense` records into engine entries and rounds the results
to cents for display.

- [Expense mapping](#expense-mapping)
- [Balance calculation](#balance-calculation)
- [Settlement](#settlement)
- [Rounding](#rounding)
- [Edge cases](#edge-cases)

## Expense mapping

```typescript
// store/split.ts
toEntry(expense): Entry
toGroup(expenses, roster): Group
```

Each expense becomes one engine entry with a single item, paid by
`expense.payer` and split equally (`splitEqually`) over
`expense.participants`.

**Recorded payments.** Tapping "Fatto" on a suggested transfer stores an
`Expense` with `kind: "payment"`: the engine's payment entry, whose only
beneficiary is the receiver. It stores the transfer's unrounded
`exactAmount`, so marking every transfer done lands all balances on exactly
zero; rounded amounts would leave crumbs that spawn new one-cent transfers.
Payments are excluded from the spending totals.

**Each expense carries its own participant list.** `expense.participants` is a
snapshot frozen when the expense is created. Adding somebody to the group
tomorrow must not retroactively re-split yesterday's dinner.

**Nobody is dropped.** `roster` only seeds who is displayed at zero. Anyone who
paid for or took part in an expense stays in the group even after being removed
from the roster — otherwise their money would silently vanish.

## Balance calculation

`calculateBalances(group)` (`lib/split-engine/logic/balance-calculator.ts`).
For every entry the payer is credited the total, and every beneficiary is
debited `fraction × amount`. Positive = must receive, negative = must pay.

Shares are **unrounded fractions**: €10 among three is `3.333…` each.

## Settlement

`suggestPayments(group)` (`lib/split-engine/logic/settle-up.ts`):

1. validates the group (`validateGroup`): known people, positive amounts,
   fractions summing to 1;
2. computes balances;
3. runs `minimizePayments`: a depth-first branch-and-bound search over every
   debtor → creditor transfer of `min(|debt|, credit)`, keeping the shortest
   plan. Branches are pruned when they cannot beat the best plan so far; the
   search stops after 40 000 iterations or ~2 s and returns the best plan
   found. Balances under 0.001 count as settled;
4. drops payments that round to 0 at two decimals.

People are visited sorted by name, so the plan is deterministic.

## Rounding

The engine works in floating point. `computeLedger` rounds each transfer to
the cent, then **derives every displayed balance from those rounded
transfers** (in whole cents) instead of rounding the engine's balances on
their own. Rounded independently, €10 among three gave `+6.67` next to two
transfers of `3.33`; derived, it gives `+6.66 / −3.33 / −3.33`. The header,
the rows and the plan always agree, and the balance sheet sums to exactly
zero.

## Edge cases

| Case                               | Handling                                                                                             |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Zero balance                       | Settled, no transfer                                                                                 |
| Amount that does not divide evenly | Split in exact fractions; displayed balances derived from the rounded transfers                      |
| Payer removed from the roster      | Kept in the group, still owed their money                                                            |
| Participant renamed                | Applied to the roster _and_ to every expense snapshot                                                |
| Participant with an open balance   | Cannot be removed from the UI                                                                        |
| No expenses                        | Balances are all zero, no transfers                                                                  |
| Corrupted `localStorage`           | Malformed expenses are dropped on load, not fed into the engine                                      |
| Invalid group                      | `validateGroup` throws; the store surfaces it as `settlementError` instead of rendering a wrong plan |

Everything is derived, not stored: balances and settlements are Vue `computed`
values, so adding, removing or renaming anything recomputes the plan.

---

For contribution guidelines see [CONTRIBUTING.md](CONTRIBUTING.md).
