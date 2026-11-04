import { useEffect, useRef, useState } from 'react';
import { Symbol } from './ui/Symbol';

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  /** Smaller single-row version for the results page. */
  compact?: boolean;
  autoFocus?: boolean;
  placeholder?: string;
}

type SpeechCtor = new () => {
  lang: string;
  interimResults: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

const speechCtor = (): SpeechCtor | null => {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: SpeechCtor; webkitSpeechRecognition?: SpeechCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};

export const DEFAULT_PLACEHOLDER = 'e.g. 2 bed flat in Hackney near the Tube, with a garden, pets allowed, under £2,500 pcm';

/** The natural-language search box ("search island") from the evara design. Enter submits, Shift+Enter adds a line. */
export function SearchIsland({ value, onChange, onSubmit, compact = false, autoFocus = false, placeholder = DEFAULT_PLACEHOLDER }: Props) {
  const input = useRef<HTMLTextAreaElement>(null);
  const [listening, setListening] = useState(false);
  const recognizer = useRef<InstanceType<SpeechCtor> | null>(null);
  const Speech = speechCtor();

  useEffect(() => {
    if (autoFocus) input.current?.focus();
  }, [autoFocus]);

  const submit = () => {
    if (value.trim()) onSubmit(value.trim());
    else input.current?.focus();
  };

  const toggleVoice = () => {
    if (!Speech) return;
    if (listening) {
      recognizer.current?.stop();
      return;
    }
    const r = new Speech();
    r.lang = 'en-GB';
    r.interimResults = false;
    r.onresult = (e) => {
      const text = Array.from(e.results).map((res) => res[0].transcript).join(' ');
      onChange(value ? `${value} ${text}` : text);
    };
    r.onend = () => setListening(false);
    recognizer.current = r;
    setListening(true);
    r.start();
  };

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className={`w-full bg-surface-lowest shadow-island transition-shadow duration-300 hover:shadow-card-hover ${compact ? 'rounded-2xl p-2 pl-4' : 'rounded-3xl p-4 sm:p-5'}`}
    >
      <div className={`flex w-full gap-3 ${compact ? 'items-center' : 'items-start'}`}>
        <Symbol name="auto_awesome" size={compact ? 22 : 28} className={`text-primary ${compact ? '' : 'mt-1.5'}`} />
        <label className="sr-only" htmlFor={compact ? 'nl-search-compact' : 'nl-search'}>
          Describe the home you want
        </label>
        <textarea
          ref={input}
          id={compact ? 'nl-search-compact' : 'nl-search'}
          value={value}
          rows={compact ? 1 : 2}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          className={`min-w-0 flex-1 resize-none border-0 bg-transparent text-on-surface placeholder:text-outline focus:outline-none ${
            compact ? 'py-2 text-[15px] leading-6' : 'py-1 text-lg leading-7'
          }`}
        />
        {compact && <Actions value={value} onClear={() => onChange('')} voice={Speech ? toggleVoice : null} listening={listening} compact />}
      </div>
      {!compact && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-surface-low/70 px-4 py-2.5">
          <div className="flex items-center gap-2 text-[11px] font-medium tracking-wide text-on-surface-variant">
            <Symbol name="verified" size={16} className="text-secondary" />
            <span>Reads listing keywords, nearby schools, hospitals & transport — not just titles</span>
          </div>
          <Actions value={value} onClear={() => onChange('')} voice={Speech ? toggleVoice : null} listening={listening} />
        </div>
      )}
    </form>
  );
}

function Actions({ value, onClear, voice, listening, compact = false }: { value: string; onClear: () => void; voice: (() => void) | null; listening: boolean; compact?: boolean }) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      {value && (
        <button
          type="button"
          onClick={onClear}
          title="Clear"
          aria-label="Clear search text"
          className="grid h-9 w-9 place-items-center rounded-full bg-surface-container text-on-surface-variant transition-colors hover:bg-surface-high hover:text-on-surface"
        >
          <Symbol name="close" size={18} />
        </button>
      )}
      {voice && (
        <button
          type="button"
          onClick={voice}
          title={listening ? 'Stop listening' : 'Search by voice'}
          aria-label={listening ? 'Stop listening' : 'Search by voice'}
          aria-pressed={listening}
          className={`grid h-9 w-9 place-items-center rounded-full transition-colors ${listening ? 'bg-primary-container text-white' : 'bg-surface-container text-on-surface-variant hover:bg-surface-high hover:text-primary'}`}
        >
          <Symbol name="mic" size={18} />
        </button>
      )}
      <button
        type="submit"
        className={`inline-flex items-center gap-2 bg-garden rounded-full font-semibold text-white shadow-md transition-all duration-200 hover:brightness-110 active:scale-95 ${compact ? 'px-4 py-2 text-sm' : 'px-6 py-2.5 text-sm'}`}
      >
        <span>{compact ? 'Search' : 'Find homes'}</span>
        <Symbol name="arrow_forward" size={18} />
      </button>
    </div>
  );
}
