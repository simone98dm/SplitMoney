<template>
  <section aria-labelledby="people-heading">
    <div class="flex items-baseline justify-between gap-3">
      <h2 id="people-heading" class="text-xl font-semibold">
        {{ hasGroup ? "Le persone" : "Chi c'era?" }}
      </h2>
      <p v-if="participants.length" class="tnum text-sm text-ink-muted">
        {{ participants.length }}
        {{ participants.length === 1 ? "persona" : "persone" }}
      </p>
    </div>

    <ul v-if="sortedParticipants.length" class="mt-2">
      <ParticipantRow
        v-for="person in sortedParticipants"
        :key="person"
        :participant="person"
      />
    </ul>

    <p v-if="!hasGroup" class="mt-2 text-base text-ink-muted">
      {{
        participants.length
          ? "Aggiungi almeno un'altra persona per iniziare a dividere."
          : "Scrivi i nomi di chi divide il conto, uno alla volta. Anche il tuo."
      }}
    </p>

    <form class="mt-4 flex gap-2" @submit.prevent="add">
      <div class="min-w-0 flex-1">
        <label for="new-participant" class="sr-only">Nome partecipante</label>
        <input
          id="new-participant"
          v-model="newParticipant"
          class="field"
          :placeholder="participants.length ? 'Un altro nome' : 'Il primo nome'"
          maxlength="20"
          autocomplete="off"
          :autofocus="!hasGroup"
          :aria-invalid="Boolean(participantError)"
          :aria-describedby="participantError ? 'participant-error' : undefined"
        />
      </div>
      <button type="submit" class="btn-primary" :disabled="!newParticipant.trim()">
        <IconPlus />
        <span>Aggiungi</span>
      </button>
    </form>

    <!-- a rename error belongs under the rename field, in its row -->
    <p
      v-if="participantError && !editingParticipant"
      id="participant-error"
      role="alert"
      class="mt-2 text-sm text-danger"
    >
      {{ participantError }}
    </p>
  </section>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import ParticipantRow from "~/components/participant/ParticipantRow.vue";
import IconPlus from "~/components/ui/IconPlus.vue";
import { computed } from "vue";
import { MIN_GROUP_SIZE, useParticipantsStore } from "~/store/participant";

const participantsStore = useParticipantsStore();
const {
  participants,
  sortedParticipants,
  newParticipant,
  participantError,
  editingParticipant,
} = storeToRefs(participantsStore);

const hasGroup = computed(() => participants.value.length >= MIN_GROUP_SIZE);

const add = () => participantsStore.addParticipant();
</script>
