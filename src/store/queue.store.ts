import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { VideoJob, QueueState, QueueStats, VideoSettings, ProductInfo, Platform } from '@/types';
import { generateId } from '@/utils/crypto.util';
import { createLogger } from '@/utils/logger.util';
import { MAX_QUEUE_SIZE, DEFAULT_RETRY_COUNT } from '@/config/constants';

const logger = createLogger('QueueStore');

interface QueueActions {
  // Job management
  addJob: (params: {
    product: ProductInfo;
    prompt: string;
    customPrompt?: string;
    settings: VideoSettings;
    platforms: Platform[];
    scheduledAt?: number;
  }) => VideoJob;
  updateJob: (id: string, updates: Partial<VideoJob>) => void;
  removeJob: (id: string) => void;
  clearCompletedJobs: () => void;
  clearFailedJobs: () => void;
  clearAllJobs: () => void;
  
  // Job state transitions
  startJob: (id: string) => void;
  completeJob: (id: string, videoUrl: string, thumbnailUrl?: string) => void;
  failJob: (id: string, error: string) => void;
  retryJob: (id: string) => void;
  cancelJob: (id: string) => void;
  
  // Progress updates
  updateProgress: (id: string, progress: number) => void;
  setFlowJobId: (id: string, flowJobId: string) => void;
  
  // Queue operations
  setActiveJob: (id: string | undefined) => void;
  setProcessing: (isProcessing: boolean) => void;
  getNextPendingJob: () => VideoJob | undefined;
  getJobById: (id: string) => VideoJob | undefined;
  
  // Stats
  getStats: () => QueueStats;
  incrementDailyCreated: () => void;
  resetDailyStats: () => void;
}

const initialState: QueueState = {
  jobs: [],
  activeJobId: undefined,
  isProcessing: false,
  stats: {
    total: 0,
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
  },
  dailyLimit: 50,
  dailyCreated: 0,
};

// Chrome storage adapter
const chromeStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      const result = await chrome.storage.local.get(name);
      return result[name] || null;
    } catch {
      return localStorage.getItem(name);
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      await chrome.storage.local.set({ [name]: value });
    } catch {
      localStorage.setItem(name, value);
    }
  },
  removeItem: async (name: string): Promise<void> => {
    try {
      await chrome.storage.local.remove(name);
    } catch {
      localStorage.removeItem(name);
    }
  },
};

export const useQueueStore = create<QueueState & QueueActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      addJob: (params) => {
        const { jobs } = get();
        
        if (jobs.length >= MAX_QUEUE_SIZE) {
          logger.warn('Queue is full', { maxSize: MAX_QUEUE_SIZE });
          throw new Error(`Queue limit reached (${MAX_QUEUE_SIZE})`);
        }

        const newJob: VideoJob = {
          id: generateId(),
          status: 'pending',
          progress: 0,
          product: params.product,
          prompt: params.prompt,
          customPrompt: params.customPrompt,
          settings: params.settings,
          platforms: params.platforms,
          scheduledAt: params.scheduledAt,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          retryCount: 0,
        };

        logger.info('Adding job to queue', { jobId: newJob.id, product: newJob.product.name });
        
        set((state) => ({
          jobs: [...state.jobs, newJob],
        }));

        return newJob;
      },

      updateJob: (id, updates) => {
        set((state) => ({
          jobs: state.jobs.map((job) =>
            job.id === id
              ? { ...job, ...updates, updatedAt: Date.now() }
              : job
          ),
        }));
      },

      removeJob: (id) => {
        logger.info('Removing job', { jobId: id });
        set((state) => ({
          jobs: state.jobs.filter((job) => job.id !== id),
          activeJobId: state.activeJobId === id ? undefined : state.activeJobId,
        }));
      },

      clearCompletedJobs: () => {
        logger.info('Clearing completed jobs');
        set((state) => ({
          jobs: state.jobs.filter((job) => job.status !== 'completed'),
        }));
      },

      clearFailedJobs: () => {
        logger.info('Clearing failed/cancelled jobs');
        set((state) => ({
          jobs: state.jobs.filter((job) => job.status !== 'failed' && job.status !== 'cancelled'),
        }));
      },

      clearAllJobs: () => {
        logger.info('Clearing all jobs');
        set({
          jobs: [],
          activeJobId: undefined,
          isProcessing: false,
        });
      },

      startJob: (id) => {
        logger.info('Starting job', { jobId: id });
        set((state) => ({
          jobs: state.jobs.map((job) =>
            job.id === id
              ? { ...job, status: 'processing', progress: 0, updatedAt: Date.now() }
              : job
          ),
          activeJobId: id,
          isProcessing: true,
        }));
      },

      completeJob: (id, videoUrl, thumbnailUrl) => {
        logger.info('Job completed', { jobId: id, videoUrl });
        set((state) => ({
          jobs: state.jobs.map((job) =>
            job.id === id
              ? {
                  ...job,
                  status: 'completed',
                  progress: 100,
                  videoUrl,
                  thumbnailUrl,
                  completedAt: Date.now(),
                  updatedAt: Date.now(),
                }
              : job
          ),
          activeJobId: undefined,
          isProcessing: false,
          dailyCreated: state.dailyCreated + 1,
        }));
      },

      failJob: (id, error) => {
        logger.error('Job failed', { jobId: id, error });
        set((state) => ({
          jobs: state.jobs.map((job) =>
            job.id === id
              ? {
                  ...job,
                  status: 'failed',
                  error,
                  updatedAt: Date.now(),
                }
              : job
          ),
          activeJobId: undefined,
          isProcessing: false,
        }));
      },

      retryJob: (id) => {
        const job = get().jobs.find((j) => j.id === id);
        if (!job) return;

        if (job.retryCount >= DEFAULT_RETRY_COUNT) {
          logger.warn('Max retries reached', { jobId: id });
          return;
        }

        logger.info('Retrying job', { jobId: id, attempt: job.retryCount + 1 });
        set((state) => ({
          jobs: state.jobs.map((j) =>
            j.id === id
              ? {
                  ...j,
                  status: 'pending',
                  progress: 0,
                  error: undefined,
                  retryCount: j.retryCount + 1,
                  updatedAt: Date.now(),
                }
              : j
          ),
        }));
      },

      cancelJob: (id) => {
        logger.info('Cancelling job', { jobId: id });
        set((state) => ({
          jobs: state.jobs.map((job) =>
            job.id === id
              ? { ...job, status: 'cancelled', updatedAt: Date.now() }
              : job
          ),
          activeJobId: state.activeJobId === id ? undefined : state.activeJobId,
          isProcessing: state.activeJobId === id ? false : state.isProcessing,
        }));
      },

      updateProgress: (id, progress) => {
        set((state) => ({
          jobs: state.jobs.map((job) =>
            job.id === id ? { ...job, progress, updatedAt: Date.now() } : job
          ),
        }));
      },

      setFlowJobId: (id, flowJobId) => {
        set((state) => ({
          jobs: state.jobs.map((job) =>
            job.id === id ? { ...job, flowJobId, updatedAt: Date.now() } : job
          ),
        }));
      },

      setActiveJob: (id) => set({ activeJobId: id }),

      setProcessing: (isProcessing) => set({ isProcessing }),

      getNextPendingJob: () => {
        const { jobs } = get();
        return jobs.find((job) => job.status === 'pending');
      },

      getJobById: (id) => {
        return get().jobs.find((job) => job.id === id);
      },

      getStats: () => {
        const { jobs } = get();
        return {
          total: jobs.length,
          pending: jobs.filter((j) => j.status === 'pending').length,
          processing: jobs.filter((j) => j.status === 'processing').length,
          completed: jobs.filter((j) => j.status === 'completed').length,
          failed: jobs.filter((j) => j.status === 'failed').length,
        };
      },

      incrementDailyCreated: () => {
        set((state) => ({ dailyCreated: state.dailyCreated + 1 }));
      },

      resetDailyStats: () => {
        set({ dailyCreated: 0 });
      },
    }),
    {
      name: 'flow-affiliate-queue',
      storage: createJSONStorage(() => chromeStorage),
      partialize: (state) => ({
        jobs: state.jobs,
        dailyCreated: state.dailyCreated,
      }),
    }
  )
);
