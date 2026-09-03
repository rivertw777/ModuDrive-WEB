import '@testing-library/jest-dom/vitest'

// jsdom has no IntersectionObserver — the infinite-scroll sentinel (use-windowed-list.ts)
// constructs one on mount. This no-op keeps it from throwing; a test that needs to *drive*
// the observer stubs its own capturing version over this one.
if (!('IntersectionObserver' in globalThis)) {
  class NoopIntersectionObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return []
    }
  }
  globalThis.IntersectionObserver =
    NoopIntersectionObserver as unknown as typeof IntersectionObserver
}

// jsdom ships <dialog> but not showModal/close, so any component built on the
// native dialog element (components/ui/dialog.tsx) throws on mount without this.
if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true
  }
  HTMLDialogElement.prototype.close = function () {
    this.open = false
    this.dispatchEvent(new Event('close'))
  }
}
