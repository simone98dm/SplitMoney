<template>
  <!--
    The live region is always in the DOM: screen readers only announce
    changes to a region that already existed. It doubles as the spoken
    confirmation of every change, so it carries the new balance too.
  -->
  <div
    role="status"
    aria-live="polite"
    class="pointer-events-none fixed inset-x-0 z-40 px-4 bottom-[calc(4.75rem+env(safe-area-inset-bottom))]"
  >
    <div
      v-if="lastAction"
      :key="lastAction.id"
      class="toast pointer-events-auto mx-auto flex max-w-2xl items-center gap-3"
      @mouseenter="pause"
      @mouseleave="resume"
      @focusin="pause"
      @focusout="resume"
    >
      <p class="min-w-0 flex-1 text-sm">
        {{ lastAction.message }}<span v-if="balanceNote" class="text-ink-muted">. {{ balanceNote }}</span>
      </p>
      <button class="btn -my-1 -mr-2 shrink-0 underline underline-offset-4" @click="undo">
        Annulla
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, watch } from "vue";
import { storeToRefs } from "pinia";
import { useExpenseSplitterStore } from "~/store/expense";
import { useParticipantsStore } from "~/store/participant";
import { formatSignedEuro } from "~/store/money";

// long enough to read a sentence and reach the button; paused while in use
const VISIBLE_MS = 8000;

const splitterStore = useExpenseSplitterStore();
const { lastAction, balances } = storeToRefs(splitterStore);
const { me, isMeSelected } = storeToRefs(useParticipantsStore());

const balanceNote = computed(() =>
  isMeSelected.value
    ? `Il tuo saldo: ${formatSignedEuro(balances.value[me.value as string] ?? 0)}`
    : ""
);

let timer: ReturnType<typeof setTimeout> | undefined;
const pause = () => clearTimeout(timer);
const resume = () => {
  pause();
  timer = setTimeout(() => splitterStore.dismissLastAction(), VISIBLE_MS);
};

watch(lastAction, (action) => (action ? resume() : pause()));
onUnmounted(pause);

const undo = () => {
  splitterStore.undoLastAction();
  document.getElementById("primary-action")?.focus();
};
</script>
