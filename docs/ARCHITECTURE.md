# Architecture Documentation - Flow Affiliate Pro

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     CHROME EXTENSION CONTEXTS                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐         ┌──────────────────┐                 │
│  │   POPUP UI   │◄────────│  Chrome Storage  │                 │
│  │   (React)    │         │   (Persistent)   │                 │
│  └──────┬───────┘         └─────────▲────────┘                 │
│         │                            │                          │
│         │ chrome.runtime.sendMessage │                          │
│         │                            │                          │
│  ┌──────▼────────────────────────────┴────────┐                │
│  │       BACKGROUND SERVICE WORKER             │                │
│  │  ┌────────────┐  ┌──────────────┐          │                │
│  │  │   Queue    │  │     Auth     │          │                │
│  │  │ Processor  │  │   Handler    │          │                │
│  │  └────────────┘  └──────────────┘          │                │
│  │  ┌────────────┐  ┌──────────────┐          │                │
│  │  │  Download  │  │ Notification │          │                │
│  │  │  Manager   │  │   Handler    │          │                │
│  │  └────────────┘  └──────────────┘          │                │
│  └──────────────────┬───────────────────────┬─┘                │
│                     │                       │                   │
│     chrome.tabs.sendMessage                 │                   │
│                     │                       │                   │
│  ┌──────────────────▼───┐  ┌───────────────▼───┐              │
│  │   CONTENT SCRIPTS    │  │  CONTENT SCRIPTS   │              │
│  │                      │  │                    │              │
│  │  Flow Controller     │  │ Platform           │              │
│  │  (Google Flow AI)    │  │ Controllers        │              │
│  │                      │  │ (TikTok/Shopee/    │              │
│  │  • Inject prompts    │  │  Lazada)           │              │
│  │  • Click buttons     │  │                    │              │
│  │  • Extract videos    │  │ • Scrape products  │              │
│  │                      │  │ • Post videos      │              │
│  └──────────────────────┘  └────────────────────┘              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP Requests
                            │
        ┌───────────────────▼───────────────────┐
        │         EXTERNAL SERVICES              │
        ├────────────────────────────────────────┤
        │  • Google Flow API                     │
        │  • TikTok Content Posting API          │
        │  • Shopee Partner API                  │
        │  • Lazada Open Platform API            │
        │  • OAuth Providers                     │
        └────────────────────────────────────────┘
```

---

## Component Interaction Flow

### Video Creation Flow

```
┌──────────┐
│   USER   │
└────┬─────┘
     │ 1. Enters product URL
     │
     ▼
┌──────────────────┐
│  Popup UI        │
│  (Dashboard)     │
└────┬─────────────┘
     │ 2. useVideoCreator.createVideo()
     │
     ▼
┌──────────────────┐
│ ScraperService   │◄──────────┐
│ scrapeProduct()  │           │ Content Script
└────┬─────────────┘           │ extracts data
     │ 3. Scrapes product info │
     │                         │
     ▼                         │
┌──────────────────┐           │
│PromptGenerator   │           │
│ generatePrompt() │           │
└────┬─────────────┘           │
     │ 4. Creates Thai prompt  │
     │                         │
     ▼                         │
┌──────────────────┐           │
│   QueueStore     │           │
│   addJob()       │           │
└────┬─────────────┘           │
     │ 5. Adds to queue        │
     │                         │
     │ Message                 │
     │ CREATE_VIDEO            │
     ▼                         │
┌──────────────────┐           │
│   Background     │           │
│ QueueProcessor   │           │
└────┬─────────────┘           │
     │ 6. Processes job        │
     │                         │
     │ Opens/activates tab     │
     │ labs.google.com         │
     │                         │
     │ Message to tab          │
     ▼                         │
┌──────────────────┐           │
│ FlowController   │───────────┘
│ (Content Script) │
└────┬─────────────┘
     │ 7. Automates UI:
     │    - Inject prompt
     │    - Set duration
     │    - Click generate
     │    - Wait for video
     │    - Extract URL
     │
     │ Message back
     │ VIDEO_CREATED
     ▼
┌──────────────────┐
│   Background     │
└────┬─────────────┘
     │ 8. Updates job status
     │    Downloads video
     │
     ▼
┌──────────────────┐
│   QueueStore     │
│ completeJob()    │
└────┬─────────────┘
     │ 9. State update triggers
     │    Zustand listeners
     │
     ▼
┌──────────────────┐
│   Popup UI       │
│   Updates        │
└──────────────────┘
```

---

## State Management Architecture

### Zustand Stores with Chrome Storage Persistence

```typescript
┌─────────────────────────────────────────────────────────┐
│                    APPLICATION STATE                     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ QueueStore   │  │  AuthStore   │  │SettingsStore │ │
│  │              │  │              │  │              │ │
│  │ • jobs[]     │  │ • googleFlow │  │ • videoDefaults│
│  │ • activeJobId│  │ • tiktok     │  │ • automation │ │
│  │ • stats      │  │ • shopee     │  │ • schedules  │ │
│  │              │  │ • lazada     │  │ • notifications│
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘ │
│         │                 │                  │         │
│         └─────────────────┼──────────────────┘         │
│                           │                            │
│                    Zustand Persist                     │
│                      Middleware                        │
│                           │                            │
│  ┌────────────────────────▼─────────────────────────┐ │
│  │           Chrome Storage Adapter                 │ │
│  │                                                   │ │
│  │  getItem: async (key) =>                         │ │
│  │    chrome.storage.local.get(key)                 │ │
│  │                                                   │ │
│  │  setItem: async (key, value) =>                  │ │
│  │    chrome.storage.local.set({ [key]: value })    │ │
│  └───────────────────────┬───────────────────────────┘ │
│                          │                             │
└──────────────────────────┼─────────────────────────────┘
                           │
                           ▼
                  ┌────────────────┐
                  │ Chrome Storage │
                  │   (Persistent) │
                  └────────────────┘
```

### State Update Propagation

```
User Action in Popup
        │
        ▼
Store Action Called
(e.g., addJob())
        │
        ▼
Zustand Updates State
        │
        ├──────────────────┐
        │                  │
        ▼                  ▼
Persist Middleware   React Components
writes to Storage    Re-render
        │                  │
        ▼                  │
Chrome Storage             │
Updated                    │
        │                  │
        └──────────────────┘
        │
        ▼
All contexts observing
this store get updates
```

---

## Message Passing Protocol

### Message Types

```typescript
type MessageType = 
  // Auth
  | 'AUTH_GOOGLE'
  | 'AUTH_TIKTOK'
  | 'AUTH_SHOPEE'
  | 'AUTH_LAZADA'
  | 'LOGOUT'
  
  // Video Creation
  | 'CREATE_VIDEO'
  | 'CANCEL_VIDEO'
  | 'VIDEO_CREATED'
  | 'VIDEO_FAILED'
  
  // Queue Management
  | 'START_BATCH_PROCESSING'
  | 'PAUSE_PROCESSING'
  | 'RESUME_PROCESSING'
  | 'CANCEL_JOB'
  
  // Posting
  | 'POST_TO_PLATFORM'
  | 'VIDEO_POSTED'
  | 'POST_FAILED'
  
  // Scraping
  | 'SCRAPE_PRODUCT'
  
  // Downloads
  | 'DOWNLOAD_VIDEO'
  | 'BATCH_DOWNLOAD'
  
  // Settings
  | 'GET_SETTINGS'
  | 'UPDATE_SETTINGS'
  
  // Stats
  | 'GET_STATS'
  | 'SYNC_ANALYTICS'
  
  // Flow Automation
  | 'FLOW_AUTOMATION_START'
  | 'FLOW_AUTOMATION_STATUS'
  | 'FLOW_AUTOMATION_COMPLETE';

interface ExtensionMessage<T = unknown> {
  type: MessageType;
  payload?: T;
  tabId?: number;
  timestamp?: number;
}

interface ExtensionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
```

### Message Flow Patterns

#### Pattern 1: Popup → Background → Content Script

```typescript
// Popup sends message
chrome.runtime.sendMessage({
  type: 'CREATE_VIDEO',
  payload: { jobId: '123' }
}, (response) => {
  if (response.success) {
    console.log('Video creation started');
  }
});

// Background receives and forwards
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CREATE_VIDEO') {
    const tabId = await findOrCreateFlowTab();
    chrome.tabs.sendMessage(tabId, {
      type: 'CREATE_VIDEO',
      payload: message.payload
    }, sendResponse);
  }
  return true;
});

// Content script receives and processes
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CREATE_VIDEO') {
    automateVideoCreation(message.payload)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
  }
  return true;
});
```

#### Pattern 2: Content Script → Background → Popup (via Storage)

```typescript
// Content script completes task
chrome.runtime.sendMessage({
  type: 'VIDEO_CREATED',
  payload: { jobId: '123', videoUrl: 'https://...' }
});

// Background updates storage
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'VIDEO_CREATED') {
    updateJobInStorage(message.payload);
  }
});

// Popup observes storage changes via Zustand
// (automatically re-renders when store updates)
```

---

## API Integration Architecture

### Google Flow API

```
┌────────────────────────────────────────────────────┐
│              Google Flow Service                   │
├────────────────────────────────────────────────────┤
│                                                     │
│  generateVideo(prompt, duration, aspectRatio)      │
│         │                                           │
│         ▼                                           │
│  POST /generate                                     │
│         │                                           │
│         ▼                                           │
│  { job_id, status, estimated_time }                │
│         │                                           │
│         ▼                                           │
│  waitForCompletion(job_id)                         │
│         │                                           │
│         ├──► Poll GET /status/:job_id              │
│         │    every 3 seconds                        │
│         │    max 5 minutes                          │
│         │                                           │
│         ▼                                           │
│  { status: 'completed', video_url, thumbnail_url } │
│                                                     │
└────────────────────────────────────────────────────┘
```

### TikTok Upload Flow

```
┌────────────────────────────────────────────────────┐
│              TikTok Service                        │
├────────────────────────────────────────────────────┤
│                                                     │
│  uploadVideo(videoFile, metadata)                  │
│         │                                           │
│         ▼                                           │
│  1. POST /post/publish/video/init/                 │
│     { post_info, source_info }                     │
│         │                                           │
│         ▼                                           │
│     { publish_id, upload_url }                     │
│         │                                           │
│         ▼                                           │
│  2. PUT to upload_url (chunked)                    │
│     - Split video into 10MB chunks                 │
│     - Upload each chunk                            │
│     - Show progress                                │
│         │                                           │
│         ▼                                           │
│  3. Poll GET /post/publish/status/fetch/           │
│     ?publish_id={publish_id}                       │
│     until status = 'PUBLISH_COMPLETE'              │
│                                                     │
└────────────────────────────────────────────────────┘
```

---

## Data Flow Diagrams

### Product Scraping Flow

```
User provides URL
      │
      ▼
┌──────────────┐
│ detectPlatform(url)
│ → 'shopee' | 'lazada' | 'tiktok'
└──────┬───────┘
      │
      ▼
┌──────────────┐
│ Send message to background
│ type: 'SCRAPE_PRODUCT'
│ payload: { url, platform }
└──────┬───────┘
      │
      ▼
┌──────────────┐
│ Background finds/creates tab
│ for platform URL
└──────┬───────┘
      │
      ▼
┌──────────────┐
│ Send to content script
│ (shopee-controller.ts)
└──────┬───────┘
      │
      ▼
┌──────────────────────────┐
│ Content Script extracts: │
│ • Product name           │
│ • Price                  │
│ • Images                 │
│ • Description            │
│ • Rating/Reviews         │
│ • Seller info            │
└──────┬───────────────────┘
      │
      ▼
┌──────────────┐
│ Send back to background
│ { success, data: ProductInfo }
└──────┬───────┘
      │
      ▼
┌──────────────┐
│ Return to popup
│ useVideoCreator receives ProductInfo
└──────────────┘
```

### Queue Processing Flow

```
┌─────────────────────────────────────────────────────┐
│            QUEUE PROCESSOR STATE MACHINE            │
├─────────────────────────────────────────────────────┤
│                                                      │
│  IDLE                                                │
│   │                                                  │
│   │ startBatchProcessing()                           │
│   ▼                                                  │
│  PROCESSING                                          │
│   │                                                  │
│   ├──► Get pending jobs                             │
│   │                                                  │
│   ├──► For each (up to MAX_CONCURRENT):             │
│   │     │                                            │
│   │     ├──► processJob(jobId)                      │
│   │     │     │                                      │
│   │     │     ├──► Open Google Flow tab             │
│   │     │     ├──► Send to FlowController           │
│   │     │     ├──► Wait for completion              │
│   │     │     ├──► Download video                   │
│   │     │     └──► Update job status                │
│   │     │                                            │
│   │     └──► On complete: processNextInQueue()      │
│   │                                                  │
│   ├──► If no more pending: IDLE                     │
│   │                                                  │
│   └──► On pause: PAUSED                             │
│                                                      │
│  PAUSED                                              │
│   │                                                  │
│   │ resumeProcessing()                               │
│   └──► PROCESSING                                   │
│                                                      │
└─────────────────────────────────────────────────────┘
```

---

## Security Architecture

### Authentication Flow

```
┌────────────────────────────────────────────────────┐
│               OAuth 2.0 Flow                       │
├────────────────────────────────────────────────────┤
│                                                     │
│  User clicks "Connect Google Flow"                 │
│         │                                           │
│         ▼                                           │
│  AuthHandler.authenticateGoogle()                  │
│         │                                           │
│         ▼                                           │
│  chrome.identity.launchWebAuthFlow({               │
│    url: authUrl + clientId + scopes + redirectUri  │
│  })                                                 │
│         │                                           │
│         ▼                                           │
│  User logs in on Google's page                     │
│         │                                           │
│         ▼                                           │
│  Redirect to chrome-extension://.../oauth2callback │
│  ?code={auth_code}                                  │
│         │                                           │
│         ▼                                           │
│  Exchange code for tokens                          │
│  POST to tokenUrl                                   │
│  { code, client_id, client_secret, redirect_uri }  │
│         │                                           │
│         ▼                                           │
│  { access_token, refresh_token, expires_in }       │
│         │                                           │
│         ▼                                           │
│  Store in Chrome Storage (encrypted)               │
│  AuthStore.googleFlow = { accessToken, ... }       │
│                                                     │
└────────────────────────────────────────────────────┘
```

### Token Refresh Strategy

```typescript
// Automatic refresh before expiry
setInterval(() => {
  const { googleFlow } = useAuthStore.getState();
  if (googleFlow && Date.now() >= googleFlow.expiresAt - 5 * 60 * 1000) {
    // Refresh 5 minutes before expiry
    authHandler.refreshGoogleCredits();
  }
}, 60 * 1000); // Check every minute
```

---

## Performance Considerations

### Rate Limiting

```typescript
// Constants from config/constants.ts
export const RATE_LIMIT = {
  videosPerDay: 50,
  postsPerHour: 10,
  apiCallsPerMinute: 30,
  delayBetweenJobs: 2 * 60 * 1000, // 2 minutes
  MIN_ACTION_DELAY_MS: 700,
};

// Enforced in QueueProcessor
async processNextInQueue() {
  const lastProcessedTime = this.getLastProcessedTime();
  const timeSinceLastJob = Date.now() - lastProcessedTime;
  
  if (timeSinceLastJob < RATE_LIMIT.delayBetweenJobs) {
    const waitTime = RATE_LIMIT.delayBetweenJobs - timeSinceLastJob;
    await sleep(waitTime);
  }
  
  // Process job...
}
```

### Concurrency Control

```typescript
// Max 3 concurrent jobs
class QueueProcessor {
  private maxConcurrent = 3;
  private activeJobs = new Set<string>();
  
  async processNextInQueue() {
    if (this.activeJobs.size >= this.maxConcurrent) {
      return;
    }
    
    const pendingJobs = await this.getPendingJobs();
    for (const job of pendingJobs) {
      if (this.activeJobs.size >= this.maxConcurrent) break;
      
      if (!this.activeJobs.has(job.id)) {
        this.processJob(job.id); // Don't await - parallel execution
      }
    }
  }
}
```

### Memory Management

- Video files are downloaded directly to disk (not held in memory)
- Queue is persisted to Chrome Storage (not kept in memory after popup closes)
- Completed jobs can be cleared manually or after 7 days
- Chrome Storage quota: 10MB (monitored, alerts at 80%)

---

## Error Handling Strategy

### Layered Error Handling

```
┌────────────────────────────────────────┐
│         UI Layer (Popup)               │
│  • Display user-friendly messages      │
│  • Show retry buttons                  │
│  • Log to console                      │
└────────────┬───────────────────────────┘
            │
            ▼
┌────────────────────────────────────────┐
│      Service Layer                     │
│  • Catch and transform errors          │
│  • Retry with exponential backoff      │
│  • Log structured errors               │
└────────────┬───────────────────────────┘
            │
            ▼
┌────────────────────────────────────────┐
│      Store Layer                       │
│  • Update job status to 'failed'       │
│  • Store error messages                │
│  • Increment retry count               │
└────────────┬───────────────────────────┘
            │
            ▼
┌────────────────────────────────────────┐
│    Background Layer                    │
│  • Send failure notifications          │
│  • Log to extension console            │
│  • Report to analytics (if enabled)    │
└────────────────────────────────────────┘
```

### Retry Logic

```typescript
// utils/retry.ts
async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries: number;
    delay?: number;
    exponential?: boolean;
    onRetry?: (error: Error, attempt: number) => void;
  }
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt < options.maxRetries) {
        options.onRetry?.(lastError, attempt + 1);
        
        const delay = options.exponential
          ? (options.delay || 1000) * Math.pow(2, attempt)
          : (options.delay || 1000);
        
        await sleep(delay);
      }
    }
  }
  
  throw lastError!;
}
```

---

## Deployment Architecture

### Build Process

```
npm run build
      │
      ▼
┌──────────────────────────────────────┐
│  Vite Build + CRXJS Plugin           │
│  • Compiles TypeScript               │
│  • Bundles React components          │
│  • Processes Tailwind CSS            │
│  • Generates manifest.json           │
│  • Optimizes assets                  │
│  • Creates source maps               │
└──────────────┬───────────────────────┘
              │
              ▼
        ┌──────────┐
        │   dist/  │
        │          │
        │ manifest.json
        │ service-worker.js
        │ popup.html
        │ popup.js
        │ content-scripts/
        │   flow-controller.js
        │   tiktok-controller.js
        │   shopee-controller.js
        │   lazada-controller.js
        │ icons/
        │ assets/
        └──────────┘
```

### Extension Loading

```
Developer Mode:
  chrome://extensions → Load unpacked → Select dist/

Production:
  Package dist/ as .zip → Upload to Chrome Web Store
```

---

## Monitoring & Logging

### Logger Architecture

```typescript
// utils/logger.util.ts
export function createLogger(namespace: string) {
  return {
    info: (message: string, meta?: object) => {
      console.log(`[${namespace}] ${message}`, meta);
    },
    warn: (message: string, meta?: object) => {
      console.warn(`[${namespace}] ${message}`, meta);
    },
    error: (message: string, meta?: object) => {
      console.error(`[${namespace}] ${message}`, meta);
      // Optional: Send to external error tracking service
    },
    debug: (message: string, meta?: object) => {
      if (import.meta.env.DEV) {
        console.debug(`[${namespace}] ${message}`, meta);
      }
    },
  };
}
```

### Debugging Contexts

- **Popup**: Chrome DevTools on popup window
- **Background**: chrome://extensions → Inspect Service Worker
- **Content Scripts**: Chrome DevTools on target page → Console
- **Storage**: chrome://extensions → Inspect → Application → Storage

---

**Last Updated**: February 4, 2026  
**Maintained by**: Flow Affiliate Pro Team
