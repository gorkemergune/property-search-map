/** Material Symbols icon (font loaded in index.html). Decorative unless `label` is given. */
export function Symbol({ name, size = 20, filled = false, className = '', label }: { name: string; size?: number; filled?: boolean; className?: string; label?: string }) {
  return (
    <span
      className={`material-symbols-outlined shrink-0 ${filled ? 'is-filled' : ''} ${className}`}
      style={{ fontSize: size, width: size, height: size, overflow: 'hidden' }}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? 'img' : undefined}
    >
      {name}
    </span>
  );
}
