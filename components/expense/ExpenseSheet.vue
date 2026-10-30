<template>
  <dialog
    ref="dialog"
    class="sheet"
    aria-labelledby="sheet-title"
    @close="onClose"
    @click="onBackdropClick"
  >
    <!-- novalidate: the app's own Italian message, never the browser's bubble -->
    <form class="sheet-body" novalidate @submit.prevent="submit">
      <div class="flex items-center justify-between gap-3">
        <h2 id="sheet-title" class="text-xl font-semibold">Nuova spesa</h2>
        <button
          type="button"
          class="btn-icon -mr-2"
          aria-label="Chiudi"
          @click="isOpen = false"
        >
          <IconClose />
        </button>
      </div>

      <label for="expense-amount" class="mt-4 block text-sm text-ink-muted">
        Quanto?
      </label>
      <div class="relative mt-1">
        <!-- text + inputmode: type=number drops the comma an Italian keyboard types -->
        <input
          id="expense-amount"
          ref="amountInput"
          v-model="newExpense.amount"
          class="field field-figure tnum pr-10"
          type="text"
          inputmode="decimal"
          autocomplete="off"
          placeholder="0,00"
          autofocus
          :aria-invalid="Boolean(expenseError)"
          :aria-describedby="expenseError ? 'expense-error' : undefined"
        />
        <span
          class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xl text-ink-muted"
          aria-hidden="true"
        >
          €
        </span>
      </div>
      <p
        v-if="expenseError"
        id="expense-error"
        role="alert"
        class="mt-2 text-sm text-danger"
      >
        {{ expenseError }}
      </p>

      <fieldset class="mt-5">
        <legend class="text-sm text-ink-muted">Chi ha pagato?</legend>
        <div class="mt-2 flex flex-wrap gap-2">
          <label v-for="person in participants" :key="person" class="chip">
            <input
              v-model="newExpense.payer"
              type="radio"
              name="expense-payer"
              class="sr-only"
              :value="person"
            />
            {{ person }}<span v-if="person === me" class="text-ink-muted">&nbsp;(tu)</span>
          </label>
        </div>
      </fieldset>

      <label for="expense-description" class="mt-5 block text-sm text-ink-muted">
        Per cosa? (facoltativo)
      </label>
      <input
        id="expense-description"
        v-model="newExpense.description"
        class="field mt-1"
        placeholder="Cena, benzina, ingresso…"
        maxlength="60"
      />

      <p class="mt-3 text-sm text-ink-muted">
        Divisa in parti uguali tra le {{ participants.length }} persone di
        adesso. Chi entra dopo non paga questa spesa.
      </p>

      <button type="submit" class="btn-primary mt-5 w-full">
        <IconPlus />
        <span>Aggiungi spesa</span>
      </button>
    </form>
  </dialog>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import IconPlus from "~/components/ui/IconPlus.vue";
import IconClose from "~/components/ui/IconClose.vue";
import { useExpenseSplitterStore } from "~/store/expense";
import { useParticipantsStore } from "~/store/participant";
import { useModalDialog } from "~/composables/useModalDialog";

const isOpen = defineModel<boolean>("open", { default: false });
const { dialog, onClose, onBackdropClick } = useModalDialog(isOpen);

const { participants, me } = storeToRefs(useParticipantsStore());
const splitterStore = useExpenseSplitterStore();
const { newExpense, expenseError } = storeToRefs(splitterStore);

// a message from the last attempt is noise when the sheet opens fresh
watch(isOpen, (open) => {
  if (open) expenseError.value = "";
});

const amountInput = ref<HTMLInputElement | null>(null);

// on a rejected amount, put the caret back in the field with the text
// selected, so the fix is one retype rather than a hunt
const submit = async () => {
  if (splitterStore.addExpense()) {
    isOpen.value = false;
    return;
  }
  await nextTick();
  amountInput.value?.select();
};
</script>
