import { useEffect, useRef, useState } from 'react';
import { t } from '../i18n/en';
import { LinkIcon } from './icons';

/**
 * Copies the current page URL (which always mirrors the search) to the
 * clipboard. Uses the Clipboard API, falls back to a hidden textarea copy, and
 * if both fail shows the link selected in a field so it can be copied by hand.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Permission denied or insecure context: try the fallback.
  }
  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand?.('copy') ?? false;
    area.remove();
    return ok;
  } catch {
    return false;
  }
}

export function ShareSearchButton({ getUrl = () => window.location.href }: { getUrl?: () => string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const [url, setUrl] = useState('');
  const field = useRef<HTMLInputElement>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);
  useEffect(() => {
    if (state === 'failed') field.current?.select();
  }, [state]);

  const share = async () => {
    const link = getUrl();
    setUrl(link);
    const ok = await copyText(link);
    setState(ok ? 'copied' : 'failed');
    window.clearTimeout(timer.current);
    if (ok) timer.current = window.setTimeout(() => setState('idle'), 3_000);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={share}
        className="flex items-center gap-1.5 text-[13px] font-medium text-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <LinkIcon width={14} height={14} />
        {t.share.button}
      </button>
      <p role="status" className={state === 'copied' ? 'absolute right-0 top-full mt-1 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-xs text-white' : 'sr-only'}>
        {state === 'copied' ? t.share.copied : ''}
      </p>
      {state === 'failed' && (
        <div className="absolute right-0 top-full z-20 mt-2 w-72 rounded-xl bg-white p-3 shadow-[0_8px_24px_-6px_rgb(29_28_26/0.35)]">
          <label htmlFor="share-url" className="block text-xs text-muted">
            {t.share.failed}
          </label>
          <input
            id="share-url"
            ref={field}
            readOnly
            value={url}
            onFocus={(e) => e.target.select()}
            className="mt-1.5 h-9 w-full rounded-lg border border-line-strong px-2 text-xs text-ink"
          />
          <button type="button" onClick={() => setState('idle')} className="mt-2 text-xs font-medium text-accent hover:underline">
            {t.share.close}
          </button>
        </div>
      )}
    </div>
  );
}
