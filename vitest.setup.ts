import '@testing-library/jest-dom/vitest'

// Node 25+ exposes a built-in localStorage that requires --localstorage-file to function.
// When that flag is absent the object exists but all methods are undefined, which
// breaks jsdom's window.localStorage. Patch it with an in-memory implementation so
// tests that call localStorage.setItem / localStorage.clear work as expected.
function createInMemoryStorage(): Storage {
  let store: Record<string, string> = {}
  return {
    get length() {
      return Object.keys(store).length
    },
    key(index: number): string | null {
      return Object.keys(store)[index] ?? null
    },
    getItem(key: string): string | null {
      return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null
    },
    setItem(key: string, value: string): void {
      store[key] = String(value)
    },
    removeItem(key: string): void {
      delete store[key]
    },
    clear(): void {
      store = {}
    },
  }
}

if (typeof localStorage === 'undefined' || typeof localStorage.clear !== 'function') {
  const storage = createInMemoryStorage()
  Object.defineProperty(globalThis, 'localStorage', { value: storage, writable: true })
  if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'localStorage', { value: storage, writable: true })
  }
}
