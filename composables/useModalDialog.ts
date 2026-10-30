import { ref, watch, type Ref } from "vue";

/**
 * Drives a native <dialog> from a boolean. showModal() gives focus trapping,
 * Esc to close and an inert page for free; the boolean stays the single
 * source of truth however the dialog was closed (Esc, backdrop, button).
 */
export const useModalDialog = (isOpen: Ref<boolean>) => {
  const dialog = ref<HTMLDialogElement | null>(null);

  watch(
    isOpen,
    (open) => {
      const element = dialog.value;
      if (!element) return;
      if (open && !element.open) element.showModal();
      if (!open && element.open) element.close();
    },
    { flush: "post" }
  );

  const onClose = () => {
    isOpen.value = false;
  };

  // a click whose target is the <dialog> itself landed on the backdrop
  const onBackdropClick = (event: MouseEvent) => {
    if (event.target === dialog.value) isOpen.value = false;
  };

  return { dialog, onClose, onBackdropClick };
};
