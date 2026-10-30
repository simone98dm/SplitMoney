<template>
  <dialog
    ref="dialog"
    class="sheet"
    aria-labelledby="new-event-title"
    aria-describedby="new-event-description"
    @close="onClose"
    @click="onBackdropClick"
  >
    <div class="sheet-body">
      <h2 id="new-event-title" class="text-xl font-semibold">
        Iniziare un nuovo evento?
      </h2>
      <p id="new-event-description" class="mt-2 text-base text-ink-muted">
        {{ summary }} Non si può annullare.
      </p>

      <div class="mt-5 grid gap-2">
        <button class="btn-primary" @click="start(true)">
          Sì, con le stesse persone
        </button>
        <button class="btn-ghost" @click="start(false)">
          Sì, da zero
        </button>
        <!-- the safe choice takes the initial focus: one stray Enter must not wipe the event -->
        <button
          class="btn text-ink-muted hover:text-ink"
          autofocus
          @click="isOpen = false"
        >
          Annulla
        </button>
      </div>
    </div>
  </dialog>
</template>

<script setup lang="ts">
import { computed, nextTick } from "vue";
import { storeToRefs } from "pinia";
import { useExpenseSplitterStore } from "~/store/expense";
import { useModalDialog } from "~/composables/useModalDialog";

const isOpen = defineModel<boolean>("open", { default: false });
const { dialog, onClose, onBackdropClick } = useModalDialog(isOpen);

const splitterStore = useExpenseSplitterStore();
const { expenses } = storeToRefs(splitterStore);

const summary = computed(() => {
  const count = expenses.value.length;
  if (count === 0) return "Si riparte da capo.";
  return count === 1
    ? "La voce registrata verrà cancellata."
    : `Le ${count} voci registrate, spese e pagamenti, verranno cancellate.`;
});

const start = async (keepPeople: boolean) => {
  splitterStore.startNewEvent({ keepPeople });
  isOpen.value = false;
  // the dialog hands focus back to its opener, which may be gone now; wait
  // for that, then land on the first thing the new event needs
  await nextTick();
  requestAnimationFrame(() =>
    document
      .getElementById(keepPeople ? "primary-action" : "new-participant")
      ?.focus()
  );
};
</script>
