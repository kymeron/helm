import '@testing-library/jest-dom'

// Mock crypto.randomUUID for tests
if (!globalThis.crypto) {
  globalThis.crypto = {
    randomUUID: () => 'test-uuid-' + Math.random().toString(36).slice(2),
  } as Crypto
}

// Mock localStorage for tests
class MockStorage implements Storage {
  private store = new Map<string, string>()

  get length(): number {
    return this.store.size
  }

  clear(): void {
    this.store.clear()
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null
  }

  removeItem(key: string): void {
    this.store.delete(key)
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value)
  }
}

Object.defineProperty(window, 'localStorage', {
  value: new MockStorage(),
  writable: true,
})

// Mock IndexedDB for tests
const mockIndexedDB = {
  open: () => ({
    result: {
      createObjectStore: () => {},
      transaction: () => ({
        objectStore: () => ({
          get: () => ({ result: null }),
          put: () => {},
          delete: () => {},
          getAll: () => ({ result: [] }),
        }),
      }),
    },
  }),
}

if (!globalThis.indexedDB) {
  globalThis.indexedDB = mockIndexedDB as unknown as IDBFactory
}