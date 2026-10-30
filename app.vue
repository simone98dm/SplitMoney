<template>
  <!-- bottom padding keeps the footer clear of the fixed action bar -->
  <div class="flex min-h-dvh flex-col pb-[calc(4.5rem+env(safe-area-inset-bottom))]">
    <ExpenseSplitter class="flex-1" />

    <AppFooter>
      <p class="border-t border-line px-4 text-center text-sm text-ink-muted">
        Fatto da
        <a
          class="inline-flex min-h-[44px] items-center underline underline-offset-4 hover:text-ink"
          href="https://simone98dm.dev"
        >
          simone98dm
        </a>
      </p>
    </AppFooter>
  </div>
</template>

<script setup lang="ts">
import ExpenseSplitter from "~/components/ExpenseSplitter.vue";
</script>
