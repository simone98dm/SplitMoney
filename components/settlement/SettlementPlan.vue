<template>
  <!-- Finished: the header already says so at full size; a second card would only repeat it -->
  <section v-if="!isFinished" aria-labelledby="settlement-heading">
    <div class="flex items-baseline justify-between gap-3">
      <h2
        id="settlement-heading"
        ref="heading"
        tabindex="-1"
        class="text-xl font-semibold"
      >
        Per chiudere
      </h2>
      <p v-if="orderedTransfers.length" class="tnum text-sm text-ink-muted">
        {{ orderedTransfers.length }}
        {{ orderedTransfers.length === 1 ? "pagamento" : "pagamenti" }}
      </p>
    </div>

    <!-- The ledger could not be computed: never render a plan we do not trust -->
    <p
      v-if="settlementError"
      role="alert"
      class="mt-3 rounded-panel border border-danger px-4 py-3 text-sm text-danger"
    >
      Non riesco a calcolare i pagamenti: {{ settlementError }}
    </p>

    <ul v-else-if="orderedTransfers.length" ref="list" class="mt-2">
      <li
        v-for="(transfer, index) in orderedTransfers"
        :key="`${transfer.from}-${transfer.to}`"
        class="flex items-center gap-3 border-b border-line py-3 last:border-b-0"
      >
        <span class="min-w-0 flex-1">
          <span class="flex flex-wrap items-center gap-x-2">
            <span class="truncate font-medium">{{ nameOf(transfer.from) }}</span>
            <IconArrow class="shrink-0 text-ink-muted" />
            <span class="truncate font-medium">{{ nameOf(transfer.to) }}</span>
          </span>
          <MoneyFigure
            :amount="transfer.amount"
            :signed="false"
            size="row"
            class="mt-0.5"
          />
        </span>

        <button
          data-done
          class="btn-ghost shrink-0"
          :aria-label="`Fatto: ${transfer.from} ha dato ${formatEuro(transfer.amount)} a ${transfer.to}`"
          @click="markDone(transfer, index)"
        >
          <IconCheck />
          <span>Fatto</span>
        </button>
      </li>
    </ul>

    <p v-else class="mt-3 text-base text-ink-muted">
      Aggiungi la prima spesa: qui compare chi deve dare quanto a chi, con meno
      pagamenti possibile.
    </p>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from "vue";
import { storeToRefs } from "pinia";
import type { Transfer } from "~/types";
import MoneyFigure from "~/components/ui/MoneyFigure.vue";
import IconArrow from "~/components/ui/IconArrow.vue";
import IconCheck from "~/components/ui/IconCheck.vue";
import { useExpenseSplitterStore } from "~/store/expense";
import { useParticipantsStore } from "~/store/participant";
import { formatEuro } from "~/store/money";

const splitterStore = useExpenseSplitterStore();
const { settlements, settlementError, isFinished } = storeToRefs(splitterStore);
const { me } = storeToRefs(useParticipantsStore());

// your own payments first: they are the ones you can act on right now
const orderedTransfers = computed(() => {
  const involvesMe = (t: Transfer) => t.from === me.value || t.to === me.value;
  return [
    ...settlements.value.filter(involvesMe),
    ...settlements.value.filter((t) => !involvesMe(t)),
  ];
});

const nameOf = (person: string) => (person === me.value ? "Tu" : person);

const heading = ref<HTMLElement | null>(null);
const list = ref<HTMLElement | null>(null);

// the row disappears under the pointer; keep focus on the next one instead
// of dropping it to <body>
const markDone = async (transfer: Transfer, index: number) => {
  splitterStore.recordPayment(transfer);
  await nextTick();
  // query in DOM order: template-ref arrays in v-for are not ordered
  const buttons = list.value?.querySelectorAll<HTMLElement>("[data-done]") ?? [];
  const next = buttons[Math.min(index, buttons.length - 1)];
  // last one done: the section is gone, the bar's "Nuovo evento" is what's next
  (next ?? heading.value ?? document.getElementById("primary-action"))?.focus();
};
</script>
