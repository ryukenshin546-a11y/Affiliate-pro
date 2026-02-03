/**
 * Unit Tests for Queue Store
 */

import { useQueueStore } from '@/store/queue.store';
import { act, renderHook } from '@testing-library/react';
import { vi } from 'vitest';

// Mock chrome storage
const mockStorage: Record<string, any> = {};

const mockChrome = {
  storage: {
    local: {
      get: vi.fn((keys, callback) => {
        const result: Record<string, any> = {};
        if (Array.isArray(keys)) {
          keys.forEach((key) => {
            if (mockStorage[key]) result[key] = mockStorage[key];
          });
        } else if (typeof keys === 'string') {
          if (mockStorage[keys]) result[keys] = mockStorage[keys];
        }
        callback?.(result);
        return Promise.resolve(result);
      }),
      set: vi.fn((items, callback) => {
        Object.assign(mockStorage, items);
        callback?.();
        return Promise.resolve();
      }),
    },
  },
};

(globalThis as any).chrome = mockChrome;

describe('Queue Store', () => {
  beforeEach(() => {
    // Reset store state
    useQueueStore.setState({
      jobs: [],
      isProcessing: false,
      dailyCreated: 0,
      dailyLimit: 50,
    });
    
    // Clear mock storage
    Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
  });

  test('should add job to queue', () => {
    const { result } = renderHook(() => useQueueStore());

    act(() => {
      result.current.addJob({
        product: {
          name: 'Test Product',
          url: 'https://example.com',
          price: 999,
          currency: 'THB',
          imageUrl: '',
        },
        prompt: 'Test prompt',
        settings: {
          template: 'product-review',
          duration: 30,
          aspectRatio: '9:16',
          style: 'dynamic',
          includeMusic: true,
          includeVoiceover: false,
          includePriceSticker: true,
          includeCTA: true,
        },
        platforms: ['tiktok'],
      });
    });

    expect(result.current.jobs).toHaveLength(1);
    expect(result.current.jobs[0].status).toBe('pending');
    expect(result.current.jobs[0].product.name).toBe('Test Product');
  });

  test('should start job', () => {
    const { result } = renderHook(() => useQueueStore());

    act(() => {
      result.current.addJob({
        product: { name: 'Test', url: '', price: 0, currency: 'THB', imageUrl: '' },
        prompt: 'Test',
        settings: {
          template: 'product-review',
          duration: 30,
          aspectRatio: '9:16',
          style: 'dynamic',
          includeMusic: true,
          includeVoiceover: false,
          includePriceSticker: true,
          includeCTA: true,
        },
        platforms: ['tiktok'],
      });
    });

    const jobId = result.current.jobs[0].id;

    act(() => {
      result.current.startJob(jobId);
    });

    expect(result.current.jobs[0].status).toBe('processing');
  });

  test('should complete job', () => {
    const { result } = renderHook(() => useQueueStore());

    act(() => {
      result.current.addJob({
        product: { name: 'Test', url: '', price: 0, currency: 'THB', imageUrl: '' },
        prompt: 'Test',
        settings: {
          template: 'product-review',
          duration: 30,
          aspectRatio: '9:16',
          style: 'dynamic',
          includeMusic: true,
          includeVoiceover: false,
          includePriceSticker: true,
          includeCTA: true,
        },
        platforms: ['tiktok'],
      });
    });

    const jobId = result.current.jobs[0].id;

    act(() => {
      result.current.completeJob(jobId, 'https://example.com/video.mp4');
    });

    expect(result.current.jobs[0].status).toBe('completed');
    expect(result.current.jobs[0].videoUrl).toBe('https://example.com/video.mp4');
  });

  test('should fail job with error', () => {
    const { result } = renderHook(() => useQueueStore());

    act(() => {
      result.current.addJob({
        product: { name: 'Test', url: '', price: 0, currency: 'THB', imageUrl: '' },
        prompt: 'Test',
        settings: {
          template: 'product-review',
          duration: 30,
          aspectRatio: '9:16',
          style: 'dynamic',
          includeMusic: true,
          includeVoiceover: false,
          includePriceSticker: true,
          includeCTA: true,
        },
        platforms: ['tiktok'],
      });
    });

    const jobId = result.current.jobs[0].id;

    act(() => {
      result.current.failJob(jobId, 'Test error message');
    });

    expect(result.current.jobs[0].status).toBe('failed');
    expect(result.current.jobs[0].error).toBe('Test error message');
  });

  test('should calculate stats correctly', () => {
    const { result } = renderHook(() => useQueueStore());

    // Add multiple jobs
    act(() => {
      result.current.addJob({
        product: { name: 'Test 1', url: '', price: 0, currency: 'THB', imageUrl: '' },
        prompt: 'Test',
        settings: {
          template: 'product-review',
          duration: 30,
          aspectRatio: '9:16',
          style: 'dynamic',
          includeMusic: true,
          includeVoiceover: false,
          includePriceSticker: true,
          includeCTA: true,
        },
        platforms: ['tiktok'],
      });
      result.current.addJob({
        product: { name: 'Test 2', url: '', price: 0, currency: 'THB', imageUrl: '' },
        prompt: 'Test',
        settings: {
          template: 'product-review',
          duration: 30,
          aspectRatio: '9:16',
          style: 'dynamic',
          includeMusic: true,
          includeVoiceover: false,
          includePriceSticker: true,
          includeCTA: true,
        },
        platforms: ['tiktok'],
      });
    });

    const stats = result.current.getStats();

    expect(stats.total).toBe(2);
    expect(stats.pending).toBe(2);
    expect(stats.processing).toBe(0);
    expect(stats.completed).toBe(0);
    expect(stats.failed).toBe(0);
  });

  test('should clear completed jobs', () => {
    const { result } = renderHook(() => useQueueStore());

    act(() => {
      result.current.addJob({
        product: { name: 'Test', url: '', price: 0, currency: 'THB', imageUrl: '' },
        prompt: 'Test',
        settings: {
          template: 'product-review',
          duration: 30,
          aspectRatio: '9:16',
          style: 'dynamic',
          includeMusic: true,
          includeVoiceover: false,
          includePriceSticker: true,
          includeCTA: true,
        },
        platforms: ['tiktok'],
      });
    });

    const jobId = result.current.jobs[0].id;

    act(() => {
      result.current.completeJob(jobId, 'https://example.com/video.mp4');
      result.current.clearCompletedJobs();
    });

    expect(result.current.jobs).toHaveLength(0);
  });
});
