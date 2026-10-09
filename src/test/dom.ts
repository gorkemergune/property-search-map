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
}

afterEach(() => cleanup());
