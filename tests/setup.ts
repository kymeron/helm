import '@testing-library/jest-dom'

// Mock crypto.randomUUID for tests
if (!globalThis.crypto) {
  globalThis.crypto = {
    randomUUID: () => 'test-uuid-' + Math.random().toString(36).slice(2),
  } as Crypto
}

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