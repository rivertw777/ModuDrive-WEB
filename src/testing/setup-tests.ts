import '@testing-library/jest-dom/vitest'

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
