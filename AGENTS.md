# Flow Affiliate Pro - Agent Guide

**AI Video Automation Chrome Extension for Thai Affiliate Marketers**  
Automatically generate product review videos using Google Flow AI and post them to TikTok, Shopee, and Lazada.

---

## Quick Project Overview

- **Type**: Chrome Extension (Manifest V3)
- **Main Tech**: React 18 + TypeScript + Vite + CRXJS + Zustand
- **Purpose**: Scrape product URLs → Generate AI videos → Auto-post to multiple platforms

---

## Folder Structure & Responsibilities

```
flow-affiliate-pro/
├── src/
│   ├── manifest.ts              # Chrome extension manifest config
│   ├── background/              # Background service worker scripts
│   │   ├── service-worker.ts    # Main message router
│   │   ├── queue-processor.ts   # Video job queue processor
│   │   ├── auth-handler.ts      # OAuth flows (Google/TikTok/Shopee/Lazada)
│   │   ├── download-manager.ts  # Video download handler
│   │   └── notification-handler.ts # Chrome notifications
│   ├── content-scripts/         # Scripts injected into web pages
│   │   ├── flow-controller.ts   # 🔥 CORE: Automate Google Flow UI
│   │   ├── tiktok-controller.ts # TikTok posting automation
│   │   ├── shopee-controller.ts # Shopee scraping + posting
│   │   └── lazada-controller.ts # Lazada scraping + posting
│   ├── sidepanel/               # ✅ Primary UI: Chrome Side Panel (React)
│   ├── popup/                   # Legacy/Dev: Popup UI (React) (kept for quick actions/testing)
│   │   ├── App.tsx              # Main app with tab navigation
│   │   ├── pages/               # Dashboard, BulkCreator, Templates, Analytics, Settings
│   │   └── components/          # Reusable UI components
│   ├── services/                # API service layers
│   │   ├── google-flow.service.ts # Google Flow API integration
│   │   ├── scraper.service.ts   # Product scraping logic
│   │   ├── prompt-generator.service.ts # Thai prompt templates
│   │   └── tiktok.service.ts    # TikTok API integration
│   ├── store/                   # Zustand state management
│   │   ├── queue.store.ts       # Video jobs queue state
│   │   ├── auth.store.ts        # Authentication tokens
│   │   ├── settings.store.ts    # User settings
│   │   └── analytics.store.ts   # Video analytics data
│   ├── hooks/                   # React custom hooks
│   │   ├── useVideoCreator.ts   # Main video creation workflow
│   │   ├── useAuth.ts           # Authentication hook
│   │   ├── useQueue.ts          # Queue management hook
│   │   └── useDownload.ts       # Download hook
│   ├── types/                   # TypeScript type definitions
│   │   ├── video.types.ts       # VideoJob, ProductInfo, Settings
│   │   ├── api.types.ts         # API request/response types
│   │   └── storage.types.ts     # Chrome storage types
│   ├── utils/                   # Utility functions
│   │   ├── logger.util.ts       # Logging utility
│   │   ├── crypto.util.ts       # ID generation, hashing
│   │   ├── validator.util.ts    # URL validation, platform detection
│   │   └── slugify.util.ts      # String formatting
│   └── config/                  # Configuration files
│       ├── api.config.ts        # API endpoints, OAuth config
│       └── constants.ts         # App constants, rate limits
├── public/
│   ├── icons/                   # Extension icons
│   └── templates/
│       └── prompt-templates.json # Video prompt templates (Thai)
└── tests/
    ├── unit/                    # Unit tests
    ├── integration/             # Integration tests
    └── e2e/                     # End-to-end tests (Playwright)
```

---

## Key Commands

```bash
# Development
npm run dev              # Start dev server with hot reload
npm run build            # Build for production
npm run preview          # Preview production build

# Testing
npm test                 # Run all tests
npm run test:watch       # Watch mode
npm run test:coverage    # With coverage report
npm run test:e2e         # E2E tests with Playwright

# Code Quality
npm run lint             # ESLint
npm run type-check       # TypeScript check
```

### Dev Workflow Notes (Important)

- UI หลักของโปรเจกต์นี้คือ **Side Panel** (ไม่ใช่ popup dropdown)
- ใน Dev Mode (CRXJS) service worker loader จะอ้าง `http://localhost:5173/...`
   - ให้เปิด dev server ด้วย `npm run dev` ก่อน
   - แล้วไป `chrome://extensions` → Reload extension
- ถ้าพบปัญหา CORS ตอน dev ให้เช็คว่า Vite dev server ส่ง CORS headers แล้ว (ตั้งไว้ใน `vite.config.ts`)

---

## Core Workflow (How It Works)

```
1. User inputs Product URL or Description
   ↓
2. ScraperService extracts product info (name, price, image)
   ↓
3. PromptGenerator creates Thai prompt from template
   ↓
4. Job added to Queue (status: 'pending')
   ↓
5. QueueProcessor picks up job → Opens Google Flow tab
   ↓
6. FlowController (content script) injects prompt & clicks generate
   ↓
7. Waits for AI video generation (~30-60s)
   ↓
8. Extracts video URL from storage.googleapis.com
   ↓
9. Downloads video OR auto-posts to TikTok/Shopee/Lazada
```

---

## Coding Conventions

### ✅ DO
- **TypeScript**: Use strict types, avoid `any`
- **Naming**: 
  - Components: `PascalCase` (e.g., `VideoCreator.tsx`)
  - Files: `kebab-case` (e.g., `google-flow.service.ts`)
  - Hooks: `useXxx` prefix (e.g., `useVideoCreator`)
  - Stores: `xxxStore` suffix (e.g., `queueStore`)
- **Imports**: Use `@/` path alias for `src/`
- **State**: Use Zustand for global state, useState for local
- **Async**: Use async/await, not callbacks
- **Error Handling**: Always wrap async calls in try-catch
- **Logging**: Use `logger.util.ts` (info, warn, error, debug)

### ❌ DON'T
- Don't use `var`, only `const` and `let`
- Don't use default exports for utilities/services (use named exports)
- Don't hardcode API keys (use environment variables)
- Don't use inline styles (use Tailwind classes)
- Don't call Chrome APIs from popup (use message passing)

---

## Message Passing Architecture

```typescript
// Popup → Background
chrome.runtime.sendMessage({
  type: 'CREATE_VIDEO',
  payload: { jobId: '123' }
})

// Background → Content Script
chrome.tabs.sendMessage(tabId, {
  type: 'CREATE_VIDEO',
  payload: { prompt: '...' }
})

// All messages go through service-worker.ts router
```

---

## Where to Edit for Common Tasks

| Task | Primary Files |
|------|---------------|
| **Add new video template** | `config/constants.ts`, `services/prompt-generator.service.ts` |
| **Change queue behavior** | `store/queue.store.ts`, `background/queue-processor.ts` |
| **Modify Google Flow automation** | `content-scripts/flow-controller.ts` |
| **Add new UI page** | `popup/pages/`, update `App.tsx` |
| **Change API endpoints** | `config/api.config.ts` |
| **Add new platform** | Create `xxx-controller.ts` + update `manifest.ts` |
| **Fix scraping logic** | `services/scraper.service.ts`, platform-specific controller |
| **Adjust rate limits** | `config/constants.ts` (RATE_LIMIT) |
| **Change video settings** | `types/video.types.ts`, `config/constants.ts` |
| **Add analytics tracking** | `store/analytics.store.ts`, `services/analytics.service.ts` |

---

## Important Types

```typescript
// Main Job Type
interface VideoJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  product: ProductInfo;
  prompt: string;
  settings: VideoSettings;
  platforms: Platform[];
  videoUrl?: string;
  createdAt: number;
  updatedAt: number;
}

// Product Info
interface ProductInfo {
  name: string;
  url: string;
  price: number;
  currency: string;
  imageUrl: string;
  description?: string;
  rating?: number;
}

// Video Settings
interface VideoSettings {
  template: VideoTemplate;
  duration: 15 | 30 | 60;
  aspectRatio: '9:16' | '1:1' | '16:9';
  style: 'dynamic' | 'calm' | 'energetic';
  includeMusic: boolean;
  includeVoiceover: boolean;
}
```

---

## Rate Limits & Constraints

- **Max Queue Size**: 100 jobs
- **Max Concurrent Jobs**: 3
- **Daily Video Limit**: 50
- **Posts Per Hour**: 10
- **Delay Between Jobs**: 2 minutes
- **Video Generation Timeout**: 5 minutes

---

## Testing Guidelines

- **Unit Tests**: For stores, hooks, utils (pure logic)
- **Integration Tests**: For complete workflows (video creation)
- **E2E Tests**: For UI interactions (Playwright)
- Use `vitest` for unit/integration, `@playwright/test` for E2E

---

## Environment Variables

Required in `.env`:
```env
VITE_GOOGLE_FLOW_CLIENT_ID=xxx
VITE_GOOGLE_FLOW_CLIENT_SECRET=xxx
VITE_TIKTOK_CLIENT_KEY=xxx
VITE_SHOPEE_PARTNER_ID=xxx
VITE_LAZADA_APP_KEY=xxx
```

---

## Critical Files to Understand First

1. `src/manifest.ts` - Extension configuration
2. `src/background/service-worker.ts` - Message routing hub
3. `src/content-scripts/flow-controller.ts` - Core automation logic
4. `src/store/queue.store.ts` - Queue state management
5. `src/hooks/useVideoCreator.ts` - Main workflow orchestration
6. `src/types/video.types.ts` - Core data structures

---

## Debugging Tips

- Check Chrome DevTools → Extensions → Inspect Service Worker (background logs)
- Check Chrome DevTools → Console on target pages (content script logs)
- Use `chrome://extensions` → Errors to see runtime errors
- Check queue state with Redux DevTools (Zustand middleware enabled)
- Monitor network requests in DevTools → Network tab

---

**Last Updated**: February 4, 2026  
**Maintained by**: Flow Affiliate Pro Team
