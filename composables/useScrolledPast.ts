import { onMounted, onUnmounted, ref } from "vue";

/**
 * True once the page has scrolled past `enterAt`, false again only back
 * above `exitAt`.
 *
 * Used to condense the sticky header: at the top it can afford the full
 * figure plus the stats strip, but 22% of a phone screen is too much to hold
 * permanently while someone scrolls a list of expenses.
 *
 * Two thresholds, not one: condensing shrinks the header by ~105px, the
 * browser shifts the scroll position to compensate, and with a single
 * threshold that shift crossed it back — the header flipped between sizes
 * every frame. The gap between the two has to exceed that height change.
 */
export const useScrolledPast = (enterAt = 160, exitAt = 24) => {
  const isPast = ref(false);
  const update = () => {
    const y = window.scrollY;
    if (!isPast.value && y > enterAt) isPast.value = true;
    else if (isPast.value && y < exitAt) isPast.value = false;
  };

  onMounted(() => {
    update();
    window.addEventListener("scroll", update, { passive: true });
  });

  onUnmounted(() => window.removeEventListener("scroll", update));

  return isPast;
};
