<template>
  <ul v-if="orderedExpenses.length" ref="list" class="mt-2">
    <li
      v-for="(expense, index) in orderedExpenses"
      :key="expense.id"
      class="flex items-center gap-3 border-b border-line py-2.5 last:border-b-0"
    >
      <!-- A recorded payment: money moved between two people, nobody spent it -->
      <span v-if="isPayment(expense)" class="min-w-0 flex-1 text-ink-muted">
        <span class="flex items-center gap-2">
          <span class="truncate">{{ expense.payer }}</span>
          <IconArrow class="shrink-0" />
          <span class="truncate">{{ expense.participants[0] }}</span>
        </span>
        <span class="block text-sm">pagamento fatto</span>
      </span>

      <span v-else class="min-w-0 flex-1">
        <span class="block truncate">
          {{ expense.description || `Spesa di ${expense.payer}` }}
        </span>
        <span class="block text-sm text-ink-muted">
          pagata da {{ expense.payer }} · divisa tra
          {{ expense.participants.length }}
        </span>
      </span>

      <span
        class="tnum shrink-0"
        :class="isPayment(expense) ? 'text-ink-muted' : 'font-medium'"
      >
        {{ formatEuro(expense.amount) }}
      </span>

      <button
        data-delete
        class="btn-icon -mr-2 hover:text-danger"
        :aria-label="deleteLabel(expense)"
        @click="remove(expense.id, index)"
      >
        <!-- taking back a payment is not deleting money: a plain cross, not a bin -->
        <IconClose v-if="isPayment(expense)" />
        <IconTrash v-else />
      </button>
    </li>
  </ul>

  <p v-else class="mt-3 text-base text-ink-muted">
    Nessuna spesa. Tocca «Aggiungi spesa» qui sotto.
  </p>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from "vue";
import { storeToRefs } from "pinia";
import type { Expense } from "~/types";
import IconTrash from "~/components/ui/IconTrash.vue";
import IconArrow from "~/components/ui/IconArrow.vue";
import IconClose from "~/components/ui/IconClose.vue";
import { useExpenseSplitterStore } from "~/store/expense";
import { formatEuro } from "~/store/money";
import { isPayment } from "~/store/split";

const splitterStore = useExpenseSplitterStore();
const { expenses } = storeToRefs(splitterStore);

// newest first: the one you just typed is the one you check
const orderedExpenses = computed(() =>
  [...expenses.value].sort((a, b) => b.timestamp - a.timestamp)
);

const deleteLabel = (expense: Expense) =>
  isPayment(expense)
    ? `Togli il pagamento di ${expense.payer} a ${expense.participants[0]}`
    : `Elimina ${expense.description || "spesa"} di ${formatEuro(expense.amount)}`;

const list = ref<HTMLElement | null>(null);

// keep keyboard focus in the list instead of dropping it to <body>
const remove = async (id: string, index: number) => {
  splitterStore.removeExpense(id);
  await nextTick();
  // query in DOM order: template-ref arrays in v-for are not ordered
  const buttons = list.value?.querySelectorAll<HTMLElement>("[data-delete]") ?? [];
  const next = buttons[Math.min(index, buttons.length - 1)];
  (next ?? document.getElementById("expenses-heading"))?.focus();
};
</script>
