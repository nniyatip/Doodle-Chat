const active = new Set<() => void>()

/** jsdom has no ResizeObserver. This stand-in only reports a size change when `resize()` runs. */
export class ResizeObserverStub {
  private readonly notify: () => void

  constructor(callback: ResizeObserverCallback) {
    this.notify = () => callback([], this)
  }

  observe() {
    active.add(this.notify)
  }

  unobserve() {
    active.delete(this.notify)
  }

  disconnect() {
    active.delete(this.notify)
  }
}

/** Calls every connected observer, as the browser does after an element changed size. */
export const resize = () => {
  for (const notify of active) notify()
}
