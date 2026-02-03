/**
 * useQueue Hook
 * Manages queue operations and status
 */

import { useCallback, useMemo } from 'react';
import { useQueueStore } from '@/store';
import type { VideoJob } from '@/types';

interface QueueStats {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  cancelled: number;
}

interface UseQueueReturn {
  jobs: VideoJob[];
  activeJobs: VideoJob[];
  pendingJobs: VideoJob[];
  completedJobs: VideoJob[];
  failedJobs: VideoJob[];
  stats: QueueStats;
  isProcessing: boolean;
  dailyCreated: number;
  dailyLimit: number;
  canCreateMore: boolean;
  getJob: (id: string) => VideoJob | undefined;
  addJob: (job: Omit<VideoJob, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => VideoJob;
  startJob: (id: string) => void;
  cancelJob: (id: string) => void;
  retryJob: (id: string) => void;
  removeJob: (id: string) => void;
  clearCompleted: () => void;
  clearFailed: () => void;
  clearAll: () => void;
  pauseQueue: () => void;
  resumeQueue: () => void;
  reorderJobs: (fromIndex: number, toIndex: number) => void;
}

export function useQueue(): UseQueueReturn {
  const store = useQueueStore();

  const jobs = store.jobs;

  const activeJobs = useMemo(
    () => jobs.filter(j => j.status === 'processing'),
    [jobs]
  );

  const pendingJobs = useMemo(
    () => jobs.filter(j => j.status === 'pending'),
    [jobs]
  );

  const completedJobs = useMemo(
    () => jobs.filter(j => j.status === 'completed'),
    [jobs]
  );

  const failedJobs = useMemo(
    () => jobs.filter(j => j.status === 'failed'),
    [jobs]
  );

  const stats = useMemo((): QueueStats => ({
    total: jobs.length,
    pending: jobs.filter(j => j.status === 'pending').length,
    processing: jobs.filter(j => j.status === 'processing').length,
    completed: jobs.filter(j => j.status === 'completed').length,
    failed: jobs.filter(j => j.status === 'failed').length,
    cancelled: jobs.filter(j => j.status === 'cancelled').length,
  }), [jobs]);

  const isProcessing = activeJobs.length > 0;

  const canCreateMore = store.dailyCreated < store.dailyLimit;

  const getJob = useCallback((id: string) => {
    return jobs.find(j => j.id === id);
  }, [jobs]);

  const pauseQueue = useCallback(() => {
    chrome.runtime.sendMessage({ type: 'PAUSE_PROCESSING' });
  }, []);

  const resumeQueue = useCallback(() => {
    chrome.runtime.sendMessage({ type: 'RESUME_PROCESSING' });
  }, []);

  const reorderJobs = useCallback((fromIndex: number, toIndex: number) => {
    const newJobs = [...jobs];
    const [removed] = newJobs.splice(fromIndex, 1);
    newJobs.splice(toIndex, 0, removed);
    // Update jobs order in store
    // Note: Would need to add this action to the store
  }, [jobs]);

  return {
    jobs,
    activeJobs,
    pendingJobs,
    completedJobs,
    failedJobs,
    stats,
    isProcessing,
    dailyCreated: store.dailyCreated,
    dailyLimit: store.dailyLimit,
    canCreateMore,
    getJob,
    addJob: store.addJob,
    startJob: store.startJob,
    cancelJob: store.cancelJob,
    retryJob: store.retryJob,
    removeJob: store.removeJob,
    clearCompleted: store.clearCompletedJobs,
    clearFailed: store.clearFailedJobs,
    clearAll: store.clearAllJobs,
    pauseQueue,
    resumeQueue,
    reorderJobs,
  };
}
