# GitHub Copilot Custom Instructions - Flow Affiliate Pro

## Project Context

You are working on **Flow Affiliate Pro**, a Chrome Extension (Manifest V3) for Thai affiliate marketers. The extension automates the entire workflow of creating and posting product review videos using AI.

**Core Technologies:**
- React 18 + TypeScript 5.3
- Vite 5.0 + CRXJS 2.0 (Chrome Extension framework)
- Zustand 4.4 (state management with Chrome Storage persistence)
- TailwindCSS 3.4 + Radix UI
- TanStack React Query
- Vitest + Playwright (testing)

---

## Architecture Overview

### Three Main Contexts

1. **Popup UI** (`src/popup/`): React app running in extension popup (400x600px)
2. **Background Service Worker** (`src/background/`): Persistent background script handling long-running tasks
3. **Content Scripts** (`src/content-scripts/`): Injected into Google Flow, TikTok, Shopee, Lazada pages

**Communication**: All contexts communicate via Chrome message passing API.

### Data Flow

```
User Input (Popup)
  → Message to Background
    → Background opens/activates relevant tab
      → Message to Content Script
        → Content Script automates page
          → Sends result back to Background
            → Background updates Storage
              → Popup observes changes via Zustand
```

---

## Detailed Repository Layout

### `/src/background/` - Background Service Worker

**Purpose**: Handles long-running operations, coordinates between contexts, manages Chrome APIs

- `service-worker.ts`: Main entry point, message router
  - Listens to `chrome.runtime.onMessage`
  - Routes messages to appropriate handlers
  - Handles extension lifecycle events

- `queue-processor.ts`: Video generation queue processor
  - Processes jobs sequentially with concurrency limit (3)
  - Opens Google Flow tabs when needed
  - Manages job state transitions (pending → processing → completed/failed)

- `auth-handler.ts`: OAuth authentication flows
  - Uses `chrome.identity.launchWebAuthFlow`
  - Manages token refresh for Google Flow, TikTok, Shopee, Lazada
  - Stores tokens in Chrome Storage

- `download-manager.ts`: Video download orchestration
  - Uses `chrome.downloads` API
  - Handles batch downloads
  - Generates unique filenames

- `notification-handler.ts`: Chrome notifications
  - Shows success/error notifications
  - Handles notification clicks (opens relevant tabs)

### `/src/content-scripts/` - Page Automation Scripts

**Purpose**: Automate UI interactions on target websites

- `flow-controller.ts`: **MOST CRITICAL FILE**
  - Automates Google Flow AI interface (labs.google.com)
  - Workflow:
    1. Waits for page load
    2. Injects prompt into textarea
    3. Sets video duration, aspect ratio via dropdowns
    4. Clicks "Generate" button
    5. Polls for video completion (checks for `<video>` element with signed URL)
    6. Extracts video URL from `storage.googleapis.com` domain
  - Uses DOM selectors from `GOOGLE_FLOW_SELECTORS` constant
  - Handles rate limiting and retries

- `tiktok-controller.ts`: TikTok posting automation
  - Opens TikTok Seller Center upload page
  - Fills video metadata (title, description, hashtags)
  - Uploads video file via TikTok API
  - Monitors upload progress

- `shopee-controller.ts`: Shopee operations
  - Scrapes product data from product pages
  - Posts videos to Shopee Seller Center

- `lazada-controller.ts`: Lazada operations
  - Scrapes product data from product pages
  - Posts videos to Lazada Seller Center

### `/src/popup/` - Extension Popup UI

**Purpose**: User interface for creating videos and managing queue

Structure:
```
popup/
├── App.tsx                    # Root component with tab navigation
├── main.tsx                   # Entry point, renders App
├── index.html                 # HTML shell
├── pages/                     # Full-page components
│   ├── Dashboard.tsx          # Main page: create video + queue overview
│   ├── BulkCreator.tsx        # Bulk video generation (paste multiple URLs)
│   ├── Templates.tsx          # Manage prompt templates
│   ├── Analytics.tsx          # View video performance metrics
│   └── Settings.tsx           # App settings, account connections
├── components/                # Reusable components
│   ├── VideoCreator.tsx       # Video creation form
│   ├── QueueList.tsx          # Job queue display
│   ├── StatsCard.tsx          # Metric display card
│   └── VideoPreview.tsx       # Video preview component
└── styles/
    └── globals.css            # Global styles, Tailwind imports
```

### `/src/services/` - Business Logic Layer

**Purpose**: Encapsulate API calls and complex operations

- `google-flow.service.ts`: Google Flow API client
  ```typescript
  class GoogleFlowService {
    generateVideo(params): Promise<GoogleFlowGenerateResponse>
    checkStatus(jobId): Promise<GoogleFlowStatusResponse>
    waitForCompletion(jobId, onProgress?, timeout?): Promise<...>
    getCredits(): Promise<GoogleFlowCreditsResponse>
  }
  ```

- `scraper.service.ts`: Product scraping orchestrator
  - Detects platform from URL
  - Routes to appropriate content script
  - Parses scraped data into `ProductInfo` type

- `prompt-generator.service.ts`: AI prompt generation
  - Loads templates from `PROMPT_TEMPLATES` constant
  - Substitutes variables: `{productName}`, `{price}`, `{features}`, etc.
  - Adds Thai-specific optimizations
  - Example template: "สร้างวิดีโอรีวิว {productName} ราคา {price} บาท..."

- `tiktok.service.ts`: TikTok API client
  - Video upload via chunked upload
  - Publish status checking
  - User info fetching

- `analytics.service.ts`: Analytics aggregation
  - Fetches video metrics from platforms
  - Calculates total stats, engagement rates

### `/src/store/` - Zustand State Management

**Purpose**: Global state with Chrome Storage persistence

- `queue.store.ts`: Video job queue state
  ```typescript
  interface QueueStore {
    jobs: VideoJob[];
    activeJobId?: string;
    isProcessing: boolean;
    addJob(params): VideoJob;
    updateJob(id, updates): void;
    startJob(id): void;
    completeJob(id, videoUrl): void;
    failJob(id, error): void;
    retryJob(id): void;
    cancelJob(id): void;
  }
  ```

- `auth.store.ts`: Authentication state
  ```typescript
  interface AuthStore {
    googleFlow?: GoogleFlowAuth;
    tiktok?: TikTokAuth;
    shopee?: ShopeeAuth;
    lazada?: LazadaAuth;
    login(platform, credentials): Promise<void>;
    logout(platform): void;
    refreshToken(platform): Promise<void>;
  }
  ```

- `settings.store.ts`: User preferences
  - Video defaults (resolution, duration, music volume)
  - Automation settings (auto-download, auto-post)
  - Post schedules per platform
  - Notification preferences
  - Theme and language

- `analytics.store.ts`: Video analytics
  - Stores video performance data
  - Syncs with platforms periodically
  - Calculates aggregate metrics

**Storage Adapter**: All stores use `persist` middleware with custom `chromeStorage` adapter:
```typescript
const chromeStorage = {
  getItem: async (name) => (await chrome.storage.local.get(name))[name],
  setItem: async (name, value) => await chrome.storage.local.set({ [name]: value }),
  removeItem: async (name) => await chrome.storage.local.remove(name),
};
```

### `/src/hooks/` - React Custom Hooks

**Purpose**: Encapsulate reusable stateful logic

- `useVideoCreator.ts`: Main video creation workflow
  ```typescript
  function useVideoCreator() {
    createVideo(input, settings?, platforms?): Promise<string | null>
    createFromProduct(product, settings?, platforms?): Promise<string | null>
    addToQueue(input, settings?, platforms?): Promise<string>
    generatePrompt(product, template?, customPrompt?): Promise<string>
    reset(): void
  }
  ```

- `useAuth.ts`: Authentication operations
- `useQueue.ts`: Queue management with real-time updates
- `useDownload.ts`: Video download handling

### `/src/types/` - TypeScript Definitions

**Critical Types:**

```typescript
// video.types.ts
type VideoStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
type VideoTemplate = 'product-review' | 'unboxing' | 'deal-alert' | 'before-after' | 'custom';
type Platform = 'tiktok' | 'shopee' | 'lazada';

interface VideoJob {
  id: string;
  status: VideoStatus;
  progress: number;
  product: ProductInfo;
  prompt: string;
  customPrompt?: string;
  settings: VideoSettings;
  videoUrl?: string;
  thumbnailUrl?: string;
  localPath?: string;
  flowJobId?: string;
  platforms: Platform[];
  scheduledAt?: number;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
  error?: string;
  retryCount: number;
}

interface ProductInfo {
  name: string;
  url: string;
  price: number;
  currency: string;
  imageUrl: string;
  description?: string;
  category?: string;
  seller?: string;
  rating?: number;
  reviews?: number;
}

interface VideoSettings {
  template: VideoTemplate;
  duration: 15 | 30 | 60;
  aspectRatio: '9:16' | '1:1' | '16:9';
  style: 'dynamic' | 'calm' | 'energetic';
  includeMusic: boolean;
  includeVoiceover: boolean;
  includePriceSticker: boolean;
  includeCTA: boolean;
}
```

### `/src/config/` - Configuration

- `api.config.ts`: API endpoints, OAuth config
  - Separate configs for Google Flow, TikTok, Shopee, Lazada
  - Environment-based client IDs/secrets
  - Timeout settings

- `constants.ts`: App constants
  - Rate limits, queue settings
  - Video settings arrays
  - Template IDs
  - Storage keys
  - Notification types
  - Default settings

### `/src/utils/` - Utility Functions

- `logger.util.ts`: Structured logging with namespace
- `crypto.util.ts`: UUID generation, hashing
- `validator.util.ts`: URL validation, platform detection
- `slugify.util.ts`: String formatting, currency formatting

---

## Running & Testing

### Development
```bash
npm run dev          # Vite dev server with hot reload
                     # Load extension from dist/ in chrome://extensions

npm run build        # Production build
npm run preview      # Preview production build
```

### Testing
```bash
npm test                 # Run all tests (Vitest)
npm run test:watch       # Watch mode
npm run test:ui          # Vitest UI
npm run test:coverage    # Coverage report
npm run test:e2e         # Playwright E2E tests
```

### Code Quality
```bash
npm run lint         # ESLint
npm run type-check   # TypeScript compiler check
```

---

## Coding Standards

### TypeScript

**✅ DO:**
- Use strict types everywhere
- Define interfaces for all data structures
- Use `type` for unions/intersections, `interface` for object shapes
- Use generics for reusable functions
- Prefer `const` over `let`, never `var`
- Use optional chaining (`?.`) and nullish coalescing (`??`)

**❌ DON'T:**
- Don't use `any` (use `unknown` if type is truly unknown)
- Don't use `@ts-ignore` (use `@ts-expect-error` with explanation)
- Don't use enums (use const objects with `as const`)

### React

**✅ DO:**
- Use function components with hooks
- Extract reusable logic into custom hooks
- Use `React.memo` for expensive components
- Use `useCallback` and `useMemo` appropriately
- Keep components small (<200 lines)

**❌ DON'T:**
- Don't use class components
- Don't pass inline functions to optimized children
- Don't use `useEffect` for data fetching (use React Query)

### File Naming

- Components: `PascalCase.tsx` (e.g., `VideoCreator.tsx`)
- Hooks: `useCamelCase.ts` (e.g., `useVideoCreator.ts`)
- Services: `kebab-case.service.ts` (e.g., `google-flow.service.ts`)
- Stores: `kebab-case.store.ts` (e.g., `queue.store.ts`)
- Utils: `kebab-case.util.ts` (e.g., `logger.util.ts`)
- Types: `kebab-case.types.ts` (e.g., `video.types.ts`)

### Import Organization

```typescript
// 1. External dependencies
import { useState, useEffect } from 'react';
import { create } from 'zustand';

// 2. Internal absolute imports (via @/ alias)
import { useQueueStore } from '@/store';
import { googleFlowService } from '@/services';
import type { VideoJob } from '@/types';

// 3. Relative imports
import { Button } from './Button';

// 4. Styles
import './styles.css';
```

### Error Handling

**Always wrap async operations:**
```typescript
// ✅ GOOD
try {
  const result = await riskyOperation();
  logger.info('Success', { result });
  return { success: true, data: result };
} catch (error) {
  const message = error instanceof Error ? error.message : 'Unknown error';
  logger.error('Operation failed', { error: message });
  return { success: false, error: message };
}

// ❌ BAD
const result = await riskyOperation(); // Unhandled rejection
```

### Chrome API Usage

**✅ DO:**
- Use message passing for cross-context communication
- Use Promises for Chrome APIs (supported in MV3)
- Check `chrome.runtime.lastError` in callbacks
- Use `chrome.storage.local` for persistence

**❌ DON'T:**
- Don't call Chrome APIs directly from popup (many don't work there)
- Don't use `chrome.storage.sync` (quota limits)
- Don't use synchronous APIs

### State Management

**Use Zustand for:**
- Global state (auth, queue, settings)
- State that needs Chrome Storage persistence
- State shared across components

**Use useState for:**
- Local component state
- Form inputs
- UI state (modals, dropdowns)

**Use React Query for:**
- Server/API data fetching
- Caching and invalidation

---

## Validation Checklist

Before submitting code, verify:

- [ ] TypeScript compiles without errors (`npm run type-check`)
- [ ] ESLint passes (`npm run lint`)
- [ ] All tests pass (`npm test`)
- [ ] New features have tests
- [ ] Changes work in Chrome extension context (test in browser)
- [ ] Message passing works correctly (check DevTools)
- [ ] Chrome Storage updates are persisted
- [ ] Rate limits are respected
- [ ] Error handling is comprehensive
- [ ] Logging uses `logger.util.ts`
- [ ] No hardcoded API keys (use env vars)
- [ ] UI is responsive (400px width)
- [ ] Thai text renders correctly

---

## Common Pitfalls to Avoid

1. **Chrome API Context Issues**
   - ❌ Calling `chrome.tabs` from popup
   - ✅ Send message to background, let it handle tabs

2. **Async State Updates**
   - ❌ Assuming state updates immediately after `setState`
   - ✅ Use callbacks or `useEffect` to react to state changes

3. **Content Script Communication**
   - ❌ Expecting content script to be injected instantly
   - ✅ Wait for tab load or check if script is ready

4. **Storage Synchronization**
   - ❌ Assuming Chrome Storage is instant
   - ✅ Use Zustand's persist middleware with proper typing

5. **Rate Limiting**
   - ❌ Sending API requests in tight loops
   - ✅ Respect `RATE_LIMIT` constants, add delays

6. **Error Recovery**
   - ❌ Leaving jobs in "processing" state on failure
   - ✅ Always update job status in `finally` blocks

---

## Key Patterns in This Codebase

### Message Passing Pattern
```typescript
// From popup
chrome.runtime.sendMessage({
  type: 'CREATE_VIDEO',
  payload: { jobId: '123' }
}, (response) => {
  if (response.success) {
    // Handle success
  }
});

// In background service-worker.ts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender)
    .then(sendResponse)
    .catch((error) => sendResponse({ success: false, error: error.message }));
  return true; // Keep channel open for async response
});
```

### Zustand Store Pattern
```typescript
export const useMyStore = create<State & Actions>()(
  persist(
    (set, get) => ({
      // State
      data: [],
      
      // Actions
      addItem: (item) => set((state) => ({
        data: [...state.data, item]
      })),
    }),
    {
      name: 'my-store',
      storage: createJSONStorage(() => chromeStorage),
    }
  )
);
```

### Service Pattern
```typescript
class MyService {
  private async fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    // Common fetch logic with error handling
  }
  
  async doSomething(params: Params): Promise<Result> {
    return retry(
      () => this.fetch<Result>('/endpoint', { method: 'POST', body: JSON.stringify(params) }),
      { maxRetries: 3 }
    );
  }
}

export const myService = new MyService(); // Singleton
```

### Content Script DOM Automation Pattern
```typescript
private async waitForElement(selector: string, timeout = 10000): Promise<Element | null> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    const element = document.querySelector(selector);
    if (element) return element;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  return null;
}

// Usage
const button = await this.waitForElement('button.generate');
if (button) button.click();
```

---

## Platform-Specific Notes

### Google Flow
- URL Pattern: `https://labs.google.com/` or `https://*.labs.google/*`
- Generated videos are served from: `storage.googleapis.com/ai-sandbox-videofx/video/`
- Video generation takes 30-90 seconds typically
- Rate limit: ~10 videos per hour per account

### TikTok
- Uses TikTok Content Posting API (not Creator API)
- Requires chunked upload for videos >10MB
- OAuth scopes: `user.info.basic`, `video.publish`, `video.upload`
- Rate limit: 100 posts per day per user

### Shopee
- No official API for video posting (uses UI automation)
- Product scraping via content script DOM parsing
- Rate limit: Conservative delays to avoid detection

### Lazada
- Similar to Shopee, UI automation based
- Seller Center URL: `https://sellercenter.lazada.co.th/`
- Rate limit: Conservative delays

---

## When Making Changes

### To Add a New Feature
1. Define types in `/src/types/`
2. Implement service logic in `/src/services/`
3. Update Zustand store if state is needed
4. Create/update UI components in `/src/popup/`
5. Add tests in `/tests/`
6. Update this file with any new patterns

### To Fix a Bug
1. Reproduce the issue
2. Check logs in relevant context (popup/background/content script)
3. Add test case that fails
4. Fix the bug
5. Verify test passes
6. Check for similar issues elsewhere

### To Refactor
1. Ensure tests exist for affected code
2. Make small, incremental changes
3. Run tests after each change
4. Update type definitions if needed
5. Update documentation

---

## References

- [Chrome Extension Docs](https://developer.chrome.com/docs/extensions/)
- [CRXJS Vite Plugin](https://crxjs.dev/vite-plugin)
- [Zustand Docs](https://zustand.docs.pmnd.rs/)
- [TanStack Query](https://tanstack.com/query/latest)
- [Radix UI](https://www.radix-ui.com/)

---

**Last Updated**: February 4, 2026  
**Maintained by**: Flow Affiliate Pro Team
