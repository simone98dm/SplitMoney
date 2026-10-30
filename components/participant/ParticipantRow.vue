<template>
  <li class="border-b border-line last:border-b-0">
    <!-- Rename mode -->
    <div v-if="isEditing" class="py-2">
      <div class="flex items-center gap-2">
        <input
          ref="renameInput"
          v-model="editingParticipant!.new"
          class="field"
          :aria-label="`Nuovo nome per ${participant}`"
          maxlength="20"
          :aria-invalid="Boolean(participantError)"
          :aria-describedby="participantError ? renameErrorId : undefined"
          @keyup.enter="applyRename"
          @keyup.esc="cancelRename"
        />
        <button class="btn-icon" aria-label="Salva nome" @click="applyRename">
          <IconCheck />
        </button>
        <button
          class="btn-icon"
          aria-label="Annulla"
          @click="cancelRename"
        >
          <IconClose />
        </button>
      </div>
      <p
        v-if="participantError"
        :id="renameErrorId"
        role="alert"
        class="mt-2 text-sm text-danger"
      >
        {{ participantError }}
      </p>
    </div>

    <!-- Reading mode -->
    <div v-else>
      <button
        class="flex w-full items-center gap-3 py-3 text-left"
        :data-person-toggle="participant"
        :aria-expanded="isOpen"
        :aria-controls="detailId"
        @click="isOpen = !isOpen"
      >
        <IconChevron
          class="shrink-0 text-ink-muted transition-transform duration-150 ease-out"
          :class="isOpen && 'rotate-90'"
        />

        <span class="min-w-0 flex-1">
          <span class="block truncate font-medium">
            {{ participant }}
            <span v-if="isMe" class="ml-1 text-xs font-normal text-ink-muted">
              (tu)
            </span>
          </span>
          <span class="block text-sm text-ink-muted">{{ roleLabel }}</span>
        </span>

        <MoneyFigure :amount="balance" size="row" />
      </button>

      <!--
        Detail: every figure in the header must be traceable to these.
        Tinted surface rather than an accent stripe, so the block reads as
        belonging to the row above it and not to the one below.
      -->
      <div
        v-if="isOpen"
        :id="detailId"
        class="mb-3 rounded bg-surface px-4 py-3"
      >
        <!-- the two numbers whose difference is the balance on the row above -->
        <dl class="grid grid-cols-2 gap-x-4 text-sm">
          <div>
            <dt class="text-ink-muted">Ha pagato</dt>
            <dd class="tnum mt-0.5 font-medium">{{ paidLabel }}</dd>
          </div>
          <div>
            <dt class="text-ink-muted">La sua parte</dt>
            <dd class="tnum mt-0.5 font-medium">{{ owedLabel }}</dd>
          </div>
        </dl>

        <div class="mt-3 flex flex-wrap items-center gap-2">
          <button
            class="btn-ghost"
            @click="participantsStore.startEditing(participant)"
          >
            Rinomina
          </button>
          <button
            v-if="!isMe"
            class="btn-ghost"
            @click="participantsStore.setMe(participant)"
          >
            Sono io
          </button>

          <template v-if="isSettled">
            <button
              v-if="!isConfirmingRemove"
              class="btn-ghost"
              @click="participantsStore.confirmRemove(participant)"
            >
              Rimuovi
            </button>
            <span v-else class="flex items-center gap-2 text-sm">
              <span class="text-ink-muted">Sicuro?</span>
              <button
                class="btn-danger"
                @click="participantsStore.removeParticipant(participant)"
              >
                Rimuovi
              </button>
              <button
                class="btn-ghost"
                @click="participantsStore.cancelRemove()"
              >
                Annulla
              </button>
            </span>
          </template>
          <span v-else class="text-sm text-ink-muted">
            Non rimuovibile finché ha un saldo aperto
          </span>
        </div>
      </div>
    </div>
  </li>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch, useId } from "vue";
import { storeToRefs } from "pinia";
import MoneyFigure from "~/components/ui/MoneyFigure.vue";
import IconCheck from "~/components/ui/IconCheck.vue";
import IconClose from "~/components/ui/IconClose.vue";
import IconChevron from "~/components/ui/IconChevron.vue";
import { useExpenseSplitterStore } from "~/store/expense";
import { useParticipantsStore } from "~/store/participant";
import { formatEuro } from "~/store/money";

const props = defineProps<{ participant: string }>();

const splitterStore = useExpenseSplitterStore();
const { expenses, balances } = storeToRefs(splitterStore);
const participantsStore = useParticipantsStore();
const { me, editingParticipant, showRemoveConfirm, participantError } =
  storeToRefs(participantsStore);

const isOpen = ref(false);
const renameInput = ref<HTMLInputElement | null>(null);
const detailId = useId();
const renameErrorId = useId();

const isMe = computed(() => me.value === props.participant);
const isEditing = computed(
  () => editingParticipant.value?.original === props.participant
);
const isConfirmingRemove = computed(
  () => showRemoveConfirm.value === props.participant
);

const balance = computed(() => balances.value[props.participant] ?? 0);
const isSettled = computed(() => balance.value === 0);

const stats = computed(() =>
  participantsStore.calculateParticipantStats(props.participant, expenses.value)
);

const paidLabel = computed(() => formatEuro(stats.value.totalPaid));
const owedLabel = computed(() => formatEuro(stats.value.totalOwed));

const roleLabel = computed(() => {
  if (balance.value > 0) return isMe.value ? "ti spettano" : "deve ricevere";
  if (balance.value < 0) return isMe.value ? "devi dare" : "deve dare";
  return "in pari";
});

// opening rename should land the caret in the field, not leave it hunting
watch(isEditing, async (editing) => {
  if (!editing) return;
  await nextTick();
  renameInput.value?.select();
});

// the rename field disappears either way; a renamed row is a new row (it is
// keyed by name), so find it by name rather than holding a ref to the old one
const focusRow = async (name: string) => {
  await nextTick();
  document
    .querySelector<HTMLElement>(`[data-person-toggle="${CSS.escape(name)}"]`)
    ?.focus();
};

const applyRename = () => {
  const rename = splitterStore.commitRename();
  if (rename) focusRow(rename.to);
};

const cancelRename = () => {
  participantsStore.cancelEditing();
  focusRow(props.participant);
};
</script>
