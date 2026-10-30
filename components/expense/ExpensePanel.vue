<template>
  <section aria-labelledby="expenses-heading">
    <div class="flex items-baseline justify-between gap-3">
      <h2
        id="expenses-heading"
        tabindex="-1"
        class="text-xl font-semibold"
      >
        Le spese
      </h2>
      <p v-if="hasExpenses" class="tnum text-sm text-ink-muted">
        {{ formatEuro(totalExpenses) }} in tutto
      </p>
    </div>

    <ExpenseList />
  </section>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import ExpenseList from "~/components/expense/ExpenseList.vue";
import { useExpenseSplitterStore } from "~/store/expense";
import { formatEuro } from "~/store/money";

const { hasExpenses, totalExpenses } = storeToRefs(useExpenseSplitterStore());
</script>
