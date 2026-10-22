import { t } from '../i18n/en';
import { HeartIcon } from './icons';

/**
 * Save/unsave toggle. The accessible name names the home and stays the same;
 * `aria-pressed` carries the saved state, and the filled heart shows it visually.
 */
export function SaveButton({
  title,
  saved,
  onToggle,
  variant = 'overlay',
  className = '',
}: {
  title: string;
  saved: boolean;
  onToggle: () => void;
  /** `overlay` sits on a photo; `inline` is a labelled button for the detail header. */
  variant?: 'overlay' | 'inline';
  className?: string;
}) {
  const fill = saved ? 'currentColor' : 'none';
  if (variant === 'inline') {
    return (
      <button
        type="button"
        aria-pressed={saved}
        onClick={onToggle}
        className={`flex items-center gap-1.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${
          saved ? 'text-accent' : 'text-ink'
        } ${className}`}
      >
        <HeartIcon width={16} height={16} fill={fill} />
        {saved ? t.saved.savedLabel : t.saved.saveLabel}
      </button>
    );
  }
  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={t.saved.saveHome(title)}
      title={saved ? t.saved.savedLabel : t.saved.saveLabel}
      onClick={onToggle}
      className={`grid h-9 w-9 place-items-center rounded-full bg-white/95 shadow-sm transition hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${
        saved ? 'text-accent' : 'text-ink'
      } ${className}`}
    >
      <HeartIcon width={17} height={17} fill={fill} />
    </button>
  );
}
