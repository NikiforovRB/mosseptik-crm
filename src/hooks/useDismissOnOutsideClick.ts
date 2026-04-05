import { useEffect, type RefObject } from "react";

export function useDismissOnOutsideClick(
  open: boolean,
  onClose: () => void,
  rootRef: RefObject<HTMLElement | null>
) {
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const el = rootRef.current;
      if (!el || el.contains(e.target as Node)) return;
      onClose();
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, onClose, rootRef]);
}
