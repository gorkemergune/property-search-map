import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Focus handling for a modal drawer: moves focus to `initialFocus` on open,
 * keeps Tab/Shift+Tab inside `panel`, closes on Escape, and returns focus to
 * the element that was focused before the dialog opened.
 *
 * Safari does not focus a button when it is clicked, so the "opener" can be
 * <body>. `fallbackFocus` names the element to return to in that case.
 */
export function useDialogFocus(
  panel: RefObject<HTMLElement | null>,
  initialFocus: RefObject<HTMLElement | null>,
  onClose: () => void,
  fallbackFocus?: () => HTMLElement | null,
) {
  const close = useRef(onClose);
  close.current = onClose;
  const fallback = useRef(fallbackFocus);
  fallback.current = fallbackFocus;

  useEffect(() => {
    const active = document.activeElement as HTMLElement | null;
    const opener = active && active !== document.body ? active : null;
    initialFocus.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close.current();
        return;
      }
      if (e.key !== 'Tab' || !panel.current) return;
      const focusable = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => !el.closest('[hidden]'));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const inside = panel.current.contains(document.activeElement);
      if (e.shiftKey && (document.activeElement === first || !inside)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (document.activeElement === last || !inside)) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      const target = opener?.isConnected ? opener : (fallback.current?.() ?? null);
      target?.focus?.();
    };
    // Runs once per opening; refs are stable.
  }, [panel, initialFocus]);
}
