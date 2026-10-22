/**
 * Shared setup for component tests running under jsdom
 * (files that start with `// @vitest-environment jsdom`).
 * jsdom has no layout engine, so browser APIs the app relies on are stubbed.
 */
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (typeof window !== 'undefined') {
  window.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;
  Element.prototype.scrollIntoView ??= function scrollIntoView() {};
  // jsdom has no canvas; the heat layer draws nothing without a 2D context.
  HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext;
}

// The URL (search state) and localStorage (saved homes, viewed history) outlive
// a render in jsdom, so every test starts from a clean page.
afterEach(() => {
  cleanup();
  window.history.replaceState(null, '', '/');
  window.localStorage.clear();
});
