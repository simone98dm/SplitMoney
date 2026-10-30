<template>
  <!--
    Fixed header over a spacer that holds its expanded height. Condensing
    then gives the viewport back without changing the page's layout height;
    a sticky header in the flow shrank the document and the browser jumped
    the scroll position ~100px to compensate.
  -->
  <div :style="{ height: `${spacerHeight}px` }">
    <!--
      Opaque, not translucent: at 95% + blur the expense list smeared through
      the figure. Glass here bought nothing and cost legibility.
    -->
    <header
      ref="header"
      class="fixed inset-x-0 top-0 z-20 border-b border-line bg-bg"
    >
      <div
        class="mx-auto max-w-2xl px-4 transition-[padding] duration-200 ease-out sm:px-6"
        :class="isCondensed ? 'pb-3 pt-3' : 'pb-5 pt-5'"
      >
        <!--
          The page's visual anchor is a number, which cannot be a heading.
          Without this the document outline starts at h2 and has no root.
        -->
        <h1 class="sr-only">SplitMoney — riepilogo delle spese di gruppo</h1>

        <!-- Nobody yet: the page below is asking who was there -->
        <div v-if="!hasGroup">
          <p class="text-figure font-semibold">Nuovo evento</p>
          <p class="mt-1 text-sm text-ink-muted">
            Una cena, un weekend, un regalo: dividete il conto e chiudetelo con
            meno pagamenti possibile.
          </p>
        </div>

        <!--
          Asked once there is a balance worth showing, not while the names are
          still going in: that interrupted the one task on screen.
        -->
        <div v-else-if="needsIdentity" role="group" aria-labelledby="identity-question">
          <p id="identity-question" class="text-figure font-semibold">Chi sei?</p>
          <p class="mt-1 text-sm text-ink-muted">
            Così in cima vedi quanto devi dare o ricevere tu. Se salti, vedi
            solo il totale.
          </p>
          <div class="mt-3 flex flex-wrap gap-2">
            <button
              v-for="person in sortedParticipants"
              :key="person"
              class="btn-ghost"
              @click="answerIdentity(person)"
            >
              {{ person }}
            </button>
            <button class="btn text-ink-muted hover:text-ink" @click="answerIdentity('')">
              Salta
            </button>
          </div>
        </div>

        <!-- The event is over and the app says so, at the size of the answer -->
        <div v-else-if="isFinished" class="figure-settle">
          <p class="flex items-center gap-3 text-display font-semibold sm:text-display-lg">
            <IconCheck class="h-9 w-9 shrink-0 sm:h-11 sm:w-11" />
            Siete in pari
          </p>
          <p class="mt-2 text-base text-ink-muted">
            {{ expenseCountLabel }}, <span class="tnum">{{ totalLabel }}</span> in
            tutto. Nessuno deve più niente.
          </p>
        </div>

        <!-- The number the person opened the app for -->
        <div v-else>
          <div class="flex items-baseline justify-between gap-3">
            <p class="text-sm text-ink-muted">
              {{ isMeSelected ? "Il tuo saldo" : "Totale speso" }}
            </p>
            <button
              v-if="hasExpenses"
              id="identity-toggle"
              class="-mr-2 inline-flex min-h-[44px] items-center rounded px-2 text-sm text-ink-muted hover:text-ink"
              @click="participantsStore.clearMe()"
            >
              {{ isMeSelected ? `Sono ${me} · cambia` : "Mostra il mio saldo" }}
            </button>
          </div>

          <!--
            Condensed: figure and label share one line so the header gives the
            list back its screen. The number never disappears.
          -->
          <div
            class="flex items-baseline gap-3"
            :class="isCondensed ? 'flex-row' : 'flex-col items-start gap-0'"
          >
            <p>
              <MoneyFigure
                v-if="isMeSelected && hasExpenses"
                :amount="myBalance"
                :size="isCondensed ? 'row' : 'display'"
              />
              <MoneyFigure
                v-else
                :amount="totalExpenses"
                :size="isCondensed ? 'row' : 'display'"
                :signed="false"
              />
            </p>

            <!-- says whom, not only how much; the amounts are in the plan below -->
            <p class="text-base" :class="[statusTone, isCondensed ? '' : 'mt-1']">
              {{ statusLabel }}
            </p>
          </div>
        </div>
      </div>
    </header>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from "vue";
import { storeToRefs } from "pinia";
import MoneyFigure from "~/components/ui/MoneyFigure.vue";
import IconCheck from "~/components/ui/IconCheck.vue";
import { useExpenseSplitterStore } from "~/store/expense";
import { MIN_GROUP_SIZE, useParticipantsStore } from "~/store/participant";
import { formatEuro } from "~/store/money";
import { isPayment } from "~/store/split";
import { useScrolledPast } from "~/composables/useScrolledPast";

const isCondensed = useScrolledPast();

const participantsStore = useParticipantsStore();
const { participants, sortedParticipants, me, isMeAnswered, isMeSelected } =
  storeToRefs(participantsStore);
const {
  expenses,
  balances,
  settlements,
  totalExpenses,
  hasExpenses,
  isFinished,
} = storeToRefs(useExpenseSplitterStore());

const hasGroup = computed(() => participants.value.length >= MIN_GROUP_SIZE);
const needsIdentity = computed(() => !isMeAnswered.value && hasExpenses.value);

// the buttons vanish on answer; land on the control that can undo the choice
const answerIdentity = async (name: string) => {
  if (name) participantsStore.setMe(name);
  else participantsStore.skipMe();
  await nextTick();
  document.getElementById("identity-toggle")?.focus();
};

const myBalance = computed(() =>
  isMeSelected.value ? (balances.value[me.value as string] ?? 0) : 0
);

const listFormat = new Intl.ListFormat("it", { type: "conjunction" });
const counterparts = (side: "from" | "to") =>
  listFormat.format(
    settlements.value
      .filter((t) => t[side] === me.value)
      .map((t) => (side === "from" ? t.to : t.from))
  );

const statusLabel = computed(() => {
  // "sei in pari" before anything happened would be a false reassurance
  if (!hasExpenses.value) return "nessuna spesa ancora";
  if (!isMeSelected.value) {
    return `divisi tra ${participants.value.length} persone`;
  }
  if (myBalance.value < 0) return `devi dare a ${counterparts("from")}`;
  if (myBalance.value > 0) return `ti spettano da ${counterparts("to")}`;
  return "sei in pari, aspetta gli altri";
});

const statusTone = computed(() =>
  isMeSelected.value && myBalance.value < 0 ? "text-owe" : "text-ink-muted"
);

const totalLabel = computed(() => formatEuro(totalExpenses.value));
const expenseCountLabel = computed(() => {
  const count = expenses.value.filter((e) => !isPayment(e)).length;
  return `${count} ${count === 1 ? "spesa" : "spese"}`;
});

// Track the expanded height only: while condensed the spacer keeps the
// expanded size, which is exactly what keeps the layout from moving.
const header = ref<HTMLElement | null>(null);
const spacerHeight = ref(0);
let observer: ResizeObserver | undefined;

onMounted(() => {
  const measure = () => {
    if (!isCondensed.value && header.value) {
      spacerHeight.value = header.value.offsetHeight;
    }
  };
  measure();
  if (typeof ResizeObserver !== "undefined" && header.value) {
    observer = new ResizeObserver(measure);
    observer.observe(header.value);
  }
});

onUnmounted(() => observer?.disconnect());
</script>
