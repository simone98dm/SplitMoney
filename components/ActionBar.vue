<template>
  <!--
    Bottom of the screen, under the thumb: the one thing you do next. Fixed,
    so it never scrolls away from someone holding the phone in one hand.
  -->
  <div
    class="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg pb-[env(safe-area-inset-bottom)]"
  >
    <div class="mx-auto flex max-w-2xl gap-2 px-4 py-3 sm:px-6">
      <template v-if="isFinished">
        <button
          id="primary-action"
          class="btn-primary flex-1"
          @click="emit('new-event')"
        >
          Nuovo evento
        </button>
        <button class="btn-ghost" @click="emit('add')">
          <IconPlus />
          <span>Altra spesa</span>
        </button>
      </template>

      <button
        v-else
        id="primary-action"
        class="btn-primary flex-1"
        @click="emit('add')"
      >
        <IconPlus />
        <span>Aggiungi spesa</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import IconPlus from "~/components/ui/IconPlus.vue";

defineProps<{ isFinished: boolean }>();
const emit = defineEmits<{ add: []; "new-event": [] }>();
</script>
