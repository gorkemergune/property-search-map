import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { t } from '../i18n/en';
import { ChevronDownIcon } from './icons';

interface Props {
  /** Text on the trigger: the filter name, or a summary of its value when active. */
  label: string;
  /** Accessible name of the panel. */
  title: string;
  active: boolean;
  width?: number;
  children: ReactNode;
}

/** Toolbar dropdown for one filter. Closes on outside click, Escape, or "Done". */
export function Popover({ label, title, active, width = 300, children }: Props) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button
        ref={trigger}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className={`flex h-10 items-center gap-1.5 rounded-full border pl-4 pr-3 text-sm whitespace-nowrap transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
          active || open ? 'border-ink text-ink' : 'border-line-strong text-ink-soft hover:border-ink'
        } ${active ? 'font-medium' : ''}`}
      >
        <span className="tabular">{label}</span>
        <ChevronDownIcon width={14} height={14} className={`text-muted transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label={title}
          style={{ width }}
          className="absolute left-0 top-full z-[1300] mt-2 rounded-xl border border-line bg-white p-5 shadow-[0_12px_32px_-8px_rgb(29_28_26/0.18),0_2px_6px_rgb(29_28_26/0.06)]"
        >
          {children}
          <div className="mt-5 flex justify-end border-t border-line pt-4">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="h-9 rounded-full bg-ink px-5 text-sm font-medium text-white hover:bg-ink-soft"
            >
              {t.filters.done}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
