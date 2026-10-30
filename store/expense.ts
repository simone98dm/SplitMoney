import { ref, computed, watch } from "vue";
import { defineStore, storeToRefs } from "pinia";
import type { Expense, Transfer } from "~/types";
import { useParticipantsStore } from "~/store/participant";
import type { ParticipantRename } from "~/store/participant";
import { computeLedger, isPayment } from "~/store/split";
import {
  MAX_EXPENSE_AMOUNT,
  formatEuro,
  parseEuroInput,
  toCents,
  toEuro,
} from "~/store/money";
import { readStored, writeStored } from "~/store/storage";

const STORAGE_KEY = "expenses";

// Date.now() alone collides when two expenses land in the same millisecond;
// the counter disambiguates within a session, the timestamp across sessions.
let expenseSequence = 0;
const nextExpenseId = (): string => `${Date.now()}-${++expenseSequence}`;

/** What the undo toast offers back: the list exactly as it was before. */
export interface UndoableAction {
  id: number;
  message: string;
  previous: Expense[];
}

let actionSequence = 0;

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : "Errore di calcolo imprevisto";

/**
 * Anything restored from storage has to survive the same checks as fresh
 * input: one malformed entry would otherwise poison the whole balance sheet.
 */
const isValidExpense = (value: unknown): value is Expense => {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;

  const participants = candidate.participants;
  const hasValidParticipants =
    Array.isArray(participants) &&
    participants.length > 0 &&
    participants.every((p) => typeof p === "string" && p !== "") &&
    // a duplicate inside the snapshot would charge that person two shares
    new Set(participants).size === participants.length;

  const kind = candidate.kind;
  const hasValidKind =
    kind === undefined ||
    kind === "expense" ||
    // a payment goes to exactly one other person
    (kind === "payment" &&
      Array.isArray(participants) &&
      participants.length === 1 &&
      participants[0] !== candidate.payer);

  return (
    hasValidKind &&
    typeof candidate.id === "string" &&
    candidate.id !== "" &&
    typeof candidate.payer === "string" &&
    candidate.payer !== "" &&
    typeof candidate.amount === "number" &&
    Number.isFinite(candidate.amount) &&
    candidate.amount > 0 &&
    candidate.amount <= MAX_EXPENSE_AMOUNT &&
    typeof candidate.description === "string" &&
    typeof candidate.timestamp === "number" &&
    Number.isFinite(candidate.timestamp) &&
    hasValidParticipants
  );
};

const parseExpenses = (raw: unknown): Expense[] | null => {
  if (!Array.isArray(raw)) return null;

  const seen = new Set<string>();
  return raw.filter((candidate): candidate is Expense => {
    if (!isValidExpense(candidate) || seen.has(candidate.id)) return false;
    seen.add(candidate.id);
    return true;
  });
};

export const useExpenseSplitterStore = defineStore("expenseSplitter", () => {
  const participantsStore = useParticipantsStore();
  const { participants, me } = storeToRefs(participantsStore);

  const expenses = ref<Expense[]>(readStored(STORAGE_KEY, parseExpenses, []));
  const expenseError = ref("");

  // Participants were already persisted; losing the expenses on every refresh
  // while the roster survived left the app in a half-remembered state.
  watch(
    expenses,
    (list) => {
      // fires only after a change already went through, so clearing on success
      // cannot swallow a validation message
      expenseError.value = writeStored(STORAGE_KEY, list)
        ? ""
        : "Impossibile salvare le spese";
    },
    { deep: true }
  );

  const lastAction = ref<UndoableAction | null>(null);

  /** Swaps in a new list and remembers the old one so the toast can undo it. */
  const commit = (next: Expense[], message: string) => {
    lastAction.value = { id: ++actionSequence, message, previous: expenses.value };
    expenses.value = next;
  };

  const undoLastAction = () => {
    if (!lastAction.value) return;
    expenses.value = lastAction.value.previous;
    lastAction.value = null;
  };

  const dismissLastAction = () => {
    lastAction.value = null;
  };

  // whoever paid last usually pays the next round too; otherwise the person
  // holding the phone, who is the one most likely typing their own receipt
  let lastPayer = "";
  const defaultPayer = (): string => {
    const roster = participants.value;
    if (roster.includes(lastPayer)) return lastPayer;
    if (me.value && roster.includes(me.value)) return me.value;
    return roster[0] ?? "";
  };

  const buildEmptyExpense = () => ({
    payer: defaultPayer(),
    amount: "",
    description: "",
  });

  const newExpense = ref(buildEmptyExpense());

  /**
   * The roster can be empty at startup, or the selected payer can be removed.
   * Either way the form would keep an unselectable payer and every submit
   * would be rejected, so re-point it at a name that actually exists.
   */
  watch(
    participants,
    (roster) => {
      if (!roster.includes(newExpense.value.payer)) {
        newExpense.value = { ...newExpense.value, payer: defaultPayer() };
      }
    },
    // deep: also catch an in-place push from a future caller, not just a reassign
    { deep: true }
  );

  // payments move money between people; they are not spending
  const spending = computed(() =>
    expenses.value.filter((expense) => !isPayment(expense))
  );
  const hasExpenses = computed(() => spending.value.length > 0);
  const totalExpenses = computed(() =>
    toEuro(
      spending.value.reduce((sum, expense) => sum + toCents(expense.amount), 0)
    )
  );

  /**
   * Derived, never stored: adding, removing or renaming anything recomputes
   * the plan. A cached copy would keep showing a payment plan for expenses
   * that no longer exist.
   *
   * Balances and transfers share one guarded computation so a bad ledger
   * surfaces as an error message instead of throwing during render.
   */
  const ledger = computed<{
    balances: Record<string, number>;
    transfers: Transfer[];
    error: string;
  }>(() => {
    try {
      return { ...computeLedger(expenses.value, participants.value), error: "" };
    } catch (error: unknown) {
      return { balances: {}, transfers: [], error: getErrorMessage(error) };
    }
  });

  const balances = computed(() => ledger.value.balances);
  const settlements = computed(() => ledger.value.transfers);
  const settlementError = computed(() => ledger.value.error);
  /** The event is over: something was spent and nobody owes anything. */
  const isFinished = computed(
    () =>
      hasExpenses.value &&
      settlements.value.length === 0 &&
      !settlementError.value
  );

  const addExpense = (): boolean => {
    const parsed = parseEuroInput(String(newExpense.value.amount));
    if ("error" in parsed) {
      expenseError.value = parsed.error;
      return false;
    }
    const { amount } = parsed;

    const payer = newExpense.value.payer;
    const splitAmong = [...participants.value];
    if (!payer || !splitAmong.includes(payer)) {
      expenseError.value = "Seleziona chi ha pagato";
      return false;
    }

    const description = newExpense.value.description.trim();
    commit(
      [
        ...expenses.value,
        {
          id: nextExpenseId(),
          kind: "expense",
          payer,
          amount,
          description,
          participants: splitAmong,
          timestamp: Date.now(),
        },
      ],
      `Spesa aggiunta: ${description ? `${description}, ` : ""}${formatEuro(amount)}, pagata da ${payer}`
    );

    lastPayer = payer;
    newExpense.value = buildEmptyExpense();
    expenseError.value = "";
    return true;
  };

  const removeExpense = (id: string) => {
    const removed = expenses.value.find((expense) => expense.id === id);
    if (!removed) return;
    commit(
      expenses.value.filter((expense) => expense.id !== id),
      isPayment(removed)
        ? `Pagamento tolto: ${removed.payer} → ${removed.participants[0]}`
        : `Spesa eliminata: ${removed.description ? `${removed.description}, ` : ""}${formatEuro(removed.amount)}`
    );
  };

  /** Records that a suggested transfer actually happened. */
  const recordPayment = (transfer: Transfer) => {
    commit(
      [
        ...expenses.value,
        {
          id: nextExpenseId(),
          kind: "payment",
          payer: transfer.from,
          amount: transfer.exactAmount,
          description: "",
          participants: [transfer.to],
          timestamp: Date.now(),
        },
      ],
      `Fatto: ${transfer.from} ha dato ${formatEuro(transfer.amount)} a ${transfer.to}`
    );
  };

  /**
   * Ends the event. Behind a confirm in the UI, so no undo: "da zero" also
   * clears the roster, which lives in the other store.
   */
  const startNewEvent = ({ keepPeople }: { keepPeople: boolean }) => {
    expenses.value = [];
    lastAction.value = null;
    lastPayer = "";
    if (!keepPeople) participantsStore.resetRoster();
    newExpense.value = buildEmptyExpense();
    expenseError.value = "";
  };

  /**
   * Commits a pending rename across BOTH the roster and the expenses.
   *
   * Renaming only the roster leaves the old name sitting in the expense
   * snapshots as a phantom debtor, so the two halves must not be separate
   * calls a caller can forget to pair.
   */
  const commitRename = (): ParticipantRename | null => {
    const rename = participantsStore.saveEditing();
    if (rename) renameParticipant(rename.from, rename.to);
    return rename;
  };

  // private on purpose: renaming the snapshots without the roster (or the
  // other way round) is exactly the half-applied state commitRename prevents
  const renameParticipant = (from: string, to: string) => {
    if (from === to) return;

    expenses.value = expenses.value.map((expense) => ({
      ...expense,
      payer: expense.payer === from ? to : expense.payer,
      participants: expense.participants.map((p) => (p === from ? to : p)),
    }));

    if (newExpense.value.payer === from) {
      newExpense.value = { ...newExpense.value, payer: to };
    }
  };

  return {
    expenses,
    expenseError,
    newExpense,
    hasExpenses,
    totalExpenses,
    balances,
    settlements,
    settlementError,
    isFinished,
    addExpense,
    removeExpense,
    recordPayment,
    startNewEvent,
    lastAction,
    undoLastAction,
    dismissLastAction,
    commitRename,
  };
});
