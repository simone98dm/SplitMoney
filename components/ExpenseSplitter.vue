<template>
  <div class="min-h-dvh">
    <BalanceHeader />

    <!--
      The plan is the screen: what to pay comes first, then the expenses that
      prove it, then the people. Entry lives in a sheet behind the action bar,
      so it never pushes the answer down the page.
    -->
    <!--
      One ParticipantPanel instance, moved with CSS order rather than
      re-rendered: re-mounting it when the second name went in dropped the
      typing focus to <body>. While nothing is spent, naming people is the
      task, so the panel leads; after that the plan does.
    -->
    <main
      class="mx-auto flex max-w-2xl flex-col gap-10 px-4 pb-8 pt-6 sm:gap-14 sm:px-6"
    >
      <SettlementPlan v-if="hasGroup" />
      <ExpensePanel v-if="hasGroup" />
      <ParticipantPanel :class="!hasExpenses && 'order-first'" />

      <p v-if="hasExpenses && !isFinished" class="text-center">
        <button
          class="btn text-ink-muted underline underline-offset-4 hover:text-ink"
          @click="isNewEventOpen = true"
        >
          Ricomincia con un nuovo evento
        </button>
      </p>
    </main>

    <ActionBar
      v-if="hasGroup"
      :is-finished="isFinished"
      @add="isSheetOpen = true"
      @new-event="isNewEventOpen = true"
    />

    <UndoToast />
    <ExpenseSheet v-model:open="isSheetOpen" />
    <NewEventDialog v-model:open="isNewEventOpen" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { storeToRefs } from "pinia";
import BalanceHeader from "~/components/balance/BalanceHeader.vue";
import ParticipantPanel from "~/components/participant/ParticipantPanel.vue";
import ExpensePanel from "~/components/expense/ExpensePanel.vue";
import ExpenseSheet from "~/components/expense/ExpenseSheet.vue";
import SettlementPlan from "~/components/settlement/SettlementPlan.vue";
import ActionBar from "~/components/ActionBar.vue";
import UndoToast from "~/components/UndoToast.vue";
import NewEventDialog from "~/components/NewEventDialog.vue";
import { useExpenseSplitterStore } from "~/store/expense";
import { MIN_GROUP_SIZE, useParticipantsStore } from "~/store/participant";

const { participants } = storeToRefs(useParticipantsStore());
const { hasExpenses, isFinished } = storeToRefs(useExpenseSplitterStore());

const hasGroup = computed(() => participants.value.length >= MIN_GROUP_SIZE);

const isSheetOpen = ref(false);
const isNewEventOpen = ref(false);
</script>
