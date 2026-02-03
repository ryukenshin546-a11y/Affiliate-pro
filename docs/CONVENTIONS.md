# Coding Conventions - Flow Affiliate Pro

## File Naming Conventions

### React Components
```
PascalCase.tsx
Examples:
  ✅ VideoCreator.tsx
  ✅ QueueList.tsx
  ✅ StatsCard.tsx
  ❌ video-creator.tsx
  ❌ videoCreator.tsx
```

### Hooks
```
useCamelCase.ts
Examples:
  ✅ useVideoCreator.ts
  ✅ useAuth.ts
  ✅ useQueue.ts
  ❌ use-video-creator.ts
  ❌ UseVideoCreator.ts
```

### Services
```
kebab-case.service.ts
Examples:
  ✅ google-flow.service.ts
  ✅ scraper.service.ts
  ✅ prompt-generator.service.ts
  ❌ googleFlowService.ts
  ❌ GoogleFlow.service.ts
```

### Stores (Zustand)
```
kebab-case.store.ts
Examples:
  ✅ queue.store.ts
  ✅ auth.store.ts
  ✅ settings.store.ts
  ❌ queueStore.ts
  ❌ Queue.store.ts
```

### Utilities
```
kebab-case.util.ts
Examples:
  ✅ logger.util.ts
  ✅ crypto.util.ts
  ✅ validator.util.ts
  ❌ loggerUtil.ts
  ❌ Logger.util.ts
```

### Types
```
kebab-case.types.ts
Examples:
  ✅ video.types.ts
  ✅ api.types.ts
  ✅ storage.types.ts
  ❌ videoTypes.ts
  ❌ Video.types.ts
```

### Content Scripts
```
kebab-case-controller.ts
Examples:
  ✅ flow-controller.ts
  ✅ tiktok-controller.ts
  ✅ shopee-controller.ts
  ❌ flowController.ts
  ❌ FlowController.ts
```

---

## Folder Structure Rules

### Flat Structure (No Nesting)
Each category of files should be in its own flat folder:

```
✅ GOOD:
src/
├── services/
│   ├── google-flow.service.ts
│   ├── scraper.service.ts
│   └── tiktok.service.ts
├── hooks/
│   ├── useVideoCreator.ts
│   └── useAuth.ts

❌ BAD:
src/
├── services/
│   └── google-flow/
│       ├── google-flow.service.ts
│       └── google-flow.types.ts  # Types go in types/
```

### Index Files for Re-exports
```typescript
// src/services/index.ts
export * from './google-flow.service';
export * from './scraper.service';
export * from './tiktok.service';

// Usage in other files:
import { googleFlowService, scraperService } from '@/services';
```

### Types Organization
```
types/
├── index.ts          # Re-exports all types
├── video.types.ts    # Video-related types
├── api.types.ts      # API request/response types
├── storage.types.ts  # Chrome Storage types

// Import from index only:
import type { VideoJob, ProductInfo, VideoSettings } from '@/types';
```

---

## TypeScript Conventions

### Type vs Interface

**Use `interface` for:**
- Object shapes (data structures)
- Class contracts
- Extendable structures

```typescript
✅ interface VideoJob {
  id: string;
  status: VideoStatus;
  product: ProductInfo;
}

✅ interface QueueStore extends BaseStore {
  jobs: VideoJob[];
  addJob: (params: JobParams) => VideoJob;
}
```

**Use `type` for:**
- Union types
- Intersection types
- Mapped types
- Utility types

```typescript
✅ type VideoStatus = 'pending' | 'processing' | 'completed' | 'failed';
✅ type Platform = 'tiktok' | 'shopee' | 'lazada';
✅ type Nullable<T> = T | null;
✅ type AsyncResult<T, E = Error> = Promise<
  | { success: true; data: T }
  | { success: false; error: E }
>;
```

### Enums vs Const Objects

**❌ DON'T use enums:**
```typescript
❌ enum VideoStatus {
  Pending = 'pending',
  Processing = 'processing',
  Completed = 'completed',
}
```

**✅ DO use const objects with `as const`:**
```typescript
✅ export const VIDEO_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
} as const;

export type VideoStatus = typeof VIDEO_STATUS[keyof typeof VIDEO_STATUS];
```

### Strict Mode
Always use strict types:

```typescript
✅ DO:
const job: VideoJob = { /* ... */ };
const response: ApiResponse<VideoData> = await api.call();
function processJob(job: VideoJob): Promise<void> { }

❌ DON'T:
const job: any = { /* ... */ };
const response = await api.call();
function processJob(job) { }
```

### Avoid `any`

```typescript
❌ BAD:
function handleMessage(message: any) { }

✅ GOOD:
function handleMessage(message: unknown) {
  if (isVideoMessage(message)) {
    // message is now VideoMessage
  }
}

// Type guard
function isVideoMessage(msg: unknown): msg is VideoMessage {
  return typeof msg === 'object' &&
         msg !== null &&
         'type' in msg &&
         msg.type === 'CREATE_VIDEO';
}
```

### Optional Chaining & Nullish Coalescing

```typescript
✅ DO:
const name = job?.product?.name ?? 'Unknown';
const duration = settings?.duration ?? 30;

❌ DON'T:
const name = job && job.product && job.product.name || 'Unknown';
const duration = settings && settings.duration ? settings.duration : 30;
```

---

## React Conventions

### Function Components Only

```typescript
✅ DO:
export function VideoCreator({ initialSettings }: Props) {
  const [state, setState] = useState<State>(defaultState);
  return <div>...</div>;
}

❌ DON'T:
export class VideoCreator extends React.Component {
  // Class components not used in this project
}
```

### Props Interface

```typescript
✅ DO:
interface VideoCreatorProps {
  initialSettings?: VideoSettings;
  onComplete: (videoUrl: string) => void;
  className?: string;
}

export function VideoCreator({ 
  initialSettings, 
  onComplete, 
  className 
}: VideoCreatorProps) {
  // ...
}

❌ DON'T:
export function VideoCreator(props: any) { }
export function VideoCreator(props) { }
```

### Hooks Order

Always declare hooks in this order:

```typescript
function MyComponent() {
  // 1. Context hooks
  const theme = useTheme();
  
  // 2. Store hooks
  const { jobs, addJob } = useQueueStore();
  const { googleFlow } = useAuthStore();
  
  // 3. State hooks
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 4. Ref hooks
  const inputRef = useRef<HTMLInputElement>(null);
  
  // 5. Derived state (useMemo)
  const sortedJobs = useMemo(() => 
    jobs.sort((a, b) => a.createdAt - b.createdAt),
    [jobs]
  );
  
  // 6. Callbacks (useCallback)
  const handleSubmit = useCallback(() => {
    // ...
  }, [deps]);
  
  // 7. Effects (useEffect)
  useEffect(() => {
    // ...
  }, [deps]);
  
  return <div>...</div>;
}
```

### Event Handlers

```typescript
✅ DO:
function VideoCreator() {
  const handleSubmit = useCallback((event: React.FormEvent) => {
    event.preventDefault();
    // ...
  }, [deps]);
  
  const handleChange = useCallback((value: string) => {
    // ...
  }, [deps]);
  
  return (
    <form onSubmit={handleSubmit}>
      <input onChange={(e) => handleChange(e.target.value)} />
    </form>
  );
}

❌ DON'T:
<button onClick={() => { /* inline logic */ }}>Click</button>
```

### Conditional Rendering

```typescript
✅ DO:
{isLoading && <Spinner />}
{error && <ErrorMessage message={error} />}
{jobs.length > 0 && <QueueList jobs={jobs} />}

✅ ALSO GOOD (for complex conditions):
{(() => {
  if (isLoading) return <Spinner />;
  if (error) return <ErrorMessage message={error} />;
  return <JobsList jobs={jobs} />;
})()}

❌ DON'T:
{isLoading ? <Spinner /> : null}
{error ? <ErrorMessage message={error} /> : null}
```

---

## State Management Conventions

### Zustand Store Pattern

```typescript
interface StoreState {
  // Data
  items: Item[];
  selectedId?: string;
  isLoading: boolean;
}

interface StoreActions {
  // Actions
  addItem: (item: Item) => void;
  removeItem: (id: string) => void;
  selectItem: (id: string) => void;
  reset: () => void;
}

const initialState: StoreState = {
  items: [],
  selectedId: undefined,
  isLoading: false,
};

export const useMyStore = create<StoreState & StoreActions>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      addItem: (item) => set((state) => ({
        items: [...state.items, item]
      })),
      
      removeItem: (id) => set((state) => ({
        items: state.items.filter(item => item.id !== id)
      })),
      
      selectItem: (id) => set({ selectedId: id }),
      
      reset: () => set(initialState),
    }),
    {
      name: 'my-store',
      storage: createJSONStorage(() => chromeStorage),
    }
  )
);
```

### Store Usage

```typescript
✅ DO:
// Select only what you need
const jobs = useQueueStore((state) => state.jobs);
const addJob = useQueueStore((state) => state.addJob);

// Or destructure
const { jobs, addJob, removeJob } = useQueueStore();

❌ DON'T:
// Don't select entire store
const store = useQueueStore();
```

---

## Service Layer Conventions

### Service Class Pattern

```typescript
class MyService {
  private baseUrl: string;
  private accessToken: string | null = null;
  
  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }
  
  setAccessToken(token: string): void {
    this.accessToken = token;
  }
  
  private async fetch<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    if (!this.accessToken) {
      throw new Error('Access token not set');
    }
    
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    return response.json();
  }
  
  async getData(id: string): Promise<Data> {
    return this.fetch<Data>(`/data/${id}`);
  }
  
  async postData(data: DataInput): Promise<DataOutput> {
    return this.fetch<DataOutput>('/data', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

// Singleton export
export const myService = new MyService('https://api.example.com');
```

### Service Error Handling

```typescript
✅ DO:
async getData(id: string): Promise<AsyncResult<Data>> {
  try {
    const data = await this.fetch<Data>(`/data/${id}`);
    logger.info('Data fetched', { id });
    return { success: true, data };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to fetch data', { id, error: message });
    return { success: false, error: message };
  }
}

❌ DON'T:
async getData(id: string): Promise<Data> {
  return this.fetch<Data>(`/data/${id}`); // Unhandled errors
}
```

---

## Import/Export Conventions

### Import Order

```typescript
// 1. External dependencies (alphabetical)
import { create } from 'zustand';
import { useCallback, useEffect, useState } from 'react';

// 2. Internal absolute imports (via @/ alias)
import { useQueueStore } from '@/store';
import { googleFlowService } from '@/services';
import type { VideoJob, VideoSettings } from '@/types';
import { logger } from '@/utils/logger.util';

// 3. Relative imports
import { Button } from './Button';
import { Input } from './Input';

// 4. Styles
import './styles.css';
```

### Named Exports

```typescript
✅ DO (Named exports):
// my-component.tsx
export function MyComponent() { }
export function MyOtherComponent() { }

// Usage
import { MyComponent, MyOtherComponent } from './my-component';

✅ DO (Services/Utils):
// my-service.ts
export const myService = new MyService();

// my-util.ts
export function formatCurrency(amount: number): string { }
export function parseDate(str: string): Date { }

❌ DON'T (Default exports for utilities):
export default myService;
export default function formatCurrency() { }
```

### Index Files

```typescript
// src/components/index.ts
export { VideoCreator } from './VideoCreator';
export { QueueList } from './QueueList';
export { StatsCard } from './StatsCard';
export type { VideoCreatorProps } from './VideoCreator';

// Usage
import { VideoCreator, QueueList, StatsCard } from '@/popup/components';
```

---

## Styling Conventions

### Tailwind CSS

```typescript
✅ DO:
<div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm">
  <Icon className="w-5 h-5 text-gray-500" />
  <span className="text-sm font-medium text-gray-900">{title}</span>
</div>

✅ DO (Conditional classes):
<button className={`btn ${isLoading ? 'btn-loading' : 'btn-primary'}`}>
  {isLoading ? 'Loading...' : 'Submit'}
</button>

✅ DO (Using clsx for complex conditions):
import clsx from 'clsx';

<div className={clsx(
  'base-classes',
  isActive && 'active-classes',
  isDisabled && 'disabled-classes',
  variant === 'primary' && 'primary-classes',
  className
)}>

❌ DON'T (Inline styles):
<div style={{ padding: '8px', backgroundColor: 'white' }}>
```

### Custom CSS (globals.css)

```css
/* Use CSS custom properties for theme colors */
:root {
  --color-primary: #6366f1;
  --color-success: #10b981;
  --color-error: #ef4444;
}

/* Utility classes for common patterns */
.btn {
  @apply px-4 py-2 rounded-lg font-medium transition-colors;
}

.btn-primary {
  @apply bg-primary-500 text-white hover:bg-primary-600;
}

.card {
  @apply bg-white rounded-lg shadow-sm p-4;
}
```

---

## Logging Conventions

### Logger Usage

```typescript
import { createLogger } from '@/utils/logger.util';

const logger = createLogger('ServiceName');

// Info: Normal operations
logger.info('Video creation started', { jobId: '123', product: 'Widget' });

// Warn: Potential issues
logger.warn('Rate limit approaching', { remaining: 5, limit: 50 });

// Error: Actual errors
logger.error('Video generation failed', { jobId: '123', error: error.message });

// Debug: Development only
logger.debug('Processing queue', { pendingCount: 3, processingCount: 1 });
```

### Log Structure

```typescript
logger.info('Action description', {
  // Context data (object)
  relevantId: 'value',
  otherContext: 'data',
});

// ❌ Don't log raw errors
logger.error('Failed', error);

// ✅ Extract message and stack
logger.error('Failed to process', {
  error: error.message,
  stack: error.stack,
  jobId: '123',
});
```

---

## Testing Conventions

### Test File Naming

```
Component:        VideoCreator.tsx
Test:            VideoCreator.test.tsx

Hook:            useVideoCreator.ts
Test:           useVideoCreator.test.ts

Service:         google-flow.service.ts
Test:           google-flow.service.test.ts

Store:           queue.store.ts
Test:           queue.store.test.ts
```

### Test Structure

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useVideoCreator } from './useVideoCreator';

describe('useVideoCreator', () => {
  beforeEach(() => {
    // Reset state before each test
  });
  
  describe('createVideo', () => {
    it('should create video from product URL', async () => {
      const { result } = renderHook(() => useVideoCreator());
      
      const videoUrl = await result.current.createVideo('https://...');
      
      expect(videoUrl).toBeTruthy();
      expect(videoUrl).toContain('storage.googleapis.com');
    });
    
    it('should handle invalid URL', async () => {
      const { result } = renderHook(() => useVideoCreator());
      
      const videoUrl = await result.current.createVideo('invalid-url');
      
      expect(videoUrl).toBeNull();
      expect(result.current.state.error).toBeTruthy();
    });
  });
});
```

---

## Chrome API Conventions

### Message Passing

```typescript
✅ DO (With response):
chrome.runtime.sendMessage({
  type: 'CREATE_VIDEO',
  payload: { jobId: '123' }
}, (response) => {
  if (chrome.runtime.lastError) {
    logger.error('Message failed', { error: chrome.runtime.lastError.message });
    return;
  }
  
  if (response.success) {
    logger.info('Video created', { data: response.data });
  } else {
    logger.error('Video failed', { error: response.error });
  }
});

✅ DO (Fire-and-forget):
chrome.runtime.sendMessage({
  type: 'LOG_EVENT',
  payload: { event: 'button_clicked' }
});
```

### Storage Operations

```typescript
✅ DO (Async/await):
// Set
await chrome.storage.local.set({ key: value });

// Get
const result = await chrome.storage.local.get('key');
const value = result.key;

// Get multiple
const result = await chrome.storage.local.get(['key1', 'key2']);

// Remove
await chrome.storage.local.remove('key');

// Clear
await chrome.storage.local.clear();

❌ DON'T (Callbacks - old style):
chrome.storage.local.get('key', (result) => {
  const value = result.key;
});
```

---

## Git Commit Conventions

### Commit Message Format

```
type(scope): short description

Longer explanation if needed.

- Bullet points for details
- Multiple lines OK

type: feat, fix, docs, style, refactor, test, chore
scope: component/file affected (optional)
```

### Examples

```
feat(queue): add batch video processing

Implements concurrent video generation up to 3 jobs.
Includes:
- QueueProcessor.startBatchProcessing()
- Rate limiting between jobs
- Progress tracking

fix(scraper): handle missing product images

Fallback to placeholder image when imageUrl is empty.

docs(readme): update installation instructions

refactor(store): simplify queue state updates

test(hooks): add useVideoCreator tests

chore(deps): update dependencies
```

---

**Last Updated**: February 4, 2026  
**Maintained by**: Flow Affiliate Pro Team
