/**
 * Vitest Test Setup
 */

import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Chrome API
const mockChrome = {
  runtime: {
    id: 'test-extension-id',
    sendMessage: vi.fn().mockImplementation((message, callback) => {
      callback?.({ success: true });
      return Promise.resolve({ success: true });
    }),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
    onInstalled: {
      addListener: vi.fn(),
    },
    onStartup: {
      addListener: vi.fn(),
    },
    lastError: null,
  },
  storage: {
    local: {
      get: vi.fn().mockImplementation((keys, callback) => {
        callback?.({});
        return Promise.resolve({});
      }),
      set: vi.fn().mockImplementation((items, callback) => {
        callback?.();
        return Promise.resolve();
      }),
      remove: vi.fn().mockImplementation((keys, callback) => {
        callback?.();
        return Promise.resolve();
      }),
    },
    sync: {
      get: vi.fn().mockImplementation((keys, callback) => {
        callback?.({});
        return Promise.resolve({});
      }),
      set: vi.fn().mockImplementation((items, callback) => {
        callback?.();
        return Promise.resolve();
      }),
    },
  },
  tabs: {
    query: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({ id: 1 }),
    update: vi.fn().mockResolvedValue({}),
    sendMessage: vi.fn().mockImplementation((tabId, message, callback) => {
      callback?.({ success: true });
      return Promise.resolve({ success: true });
    }),
  },
  downloads: {
    download: vi.fn().mockResolvedValue(1),
    cancel: vi.fn().mockResolvedValue(undefined),
    search: vi.fn().mockResolvedValue([]),
    show: vi.fn(),
    erase: vi.fn().mockResolvedValue([]),
    onChanged: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
  notifications: {
    create: vi.fn().mockResolvedValue('notification-id'),
    clear: vi.fn().mockResolvedValue(true),
    onClicked: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
    onButtonClicked: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
    onClosed: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
  alarms: {
    create: vi.fn(),
    clear: vi.fn().mockResolvedValue(true),
    get: vi.fn().mockResolvedValue(null),
    getAll: vi.fn().mockResolvedValue([]),
    onAlarm: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
  action: {
    setBadgeText: vi.fn().mockResolvedValue(undefined),
    setBadgeBackgroundColor: vi.fn().mockResolvedValue(undefined),
  },
  identity: {
    launchWebAuthFlow: vi.fn().mockImplementation((options, callback) => {
      callback?.('https://redirect.url?code=test-code');
    }),
  },
  scripting: {
    executeScript: vi.fn().mockResolvedValue([]),
  },
};

// Assign to global
(global as any).chrome = mockChrome;

// Mock fetch
global.fetch = vi.fn().mockImplementation(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    blob: () => Promise.resolve(new Blob()),
  })
);

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
(global as any).IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock ResizeObserver
(global as any).ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Console silence for cleaner test output (optional)
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
// };

export {};
