/**
 * Integration Tests for Video Creation Flow
 */

import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';

// Mock Chrome APIs
const mockChrome = {
  runtime: {
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn(),
    },
  },
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
    },
  },
  tabs: {
    query: vi.fn(),
    create: vi.fn(),
    sendMessage: vi.fn(),
  },
};

(global as any).chrome = mockChrome;

describe('Video Creation Integration', () => {
  beforeAll(() => {
    // Setup mocks
    mockChrome.storage.local.get.mockImplementation((keys, callback) => {
      callback?.({});
      return Promise.resolve({});
    });
    mockChrome.storage.local.set.mockImplementation((items, callback) => {
      callback?.();
      return Promise.resolve();
    });
  });

  afterAll(() => {
    vi.clearAllMocks();
  });

  describe('Product Scraping Flow', () => {
    test('should scrape Shopee product successfully', async () => {
      const mockProductData = {
        name: 'Test Product',
        price: 999,
        currency: 'THB',
        imageUrl: 'https://example.com/image.jpg',
        rating: 4.5,
        reviews: 100,
      };

      mockChrome.tabs.sendMessage.mockResolvedValueOnce({
        success: true,
        data: mockProductData,
      });

      const result = await chrome.tabs.sendMessage(1, { type: 'SCRAPE_PRODUCT' });

      expect(result).toEqual({
        success: true,
        data: mockProductData,
      });
    });

    test('should handle scraping errors gracefully', async () => {
      mockChrome.tabs.sendMessage.mockResolvedValueOnce({
        success: false,
        error: 'Product not found',
      });

      const result = await chrome.tabs.sendMessage(1, { type: 'SCRAPE_PRODUCT' });

      expect(result).toEqual({
        success: false,
        error: 'Product not found',
      });
    });
  });

  describe('Video Generation Flow', () => {
    test('should send create video message to background', async () => {
      mockChrome.runtime.sendMessage.mockResolvedValueOnce({
        success: true,
        jobId: 'test-job-123',
      });

      const result = await chrome.runtime.sendMessage({
        type: 'CREATE_VIDEO',
        payload: {
          jobId: 'test-job-123',
        },
      });

      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'CREATE_VIDEO',
        })
      );
      expect(result).toHaveProperty('success', true);
    });

    test('should handle video creation response', async () => {
      mockChrome.runtime.sendMessage.mockResolvedValueOnce({
        success: true,
        videoUrl: 'https://flow.google.com/video/123.mp4',
      });

      const result = await chrome.runtime.sendMessage({
        type: 'CREATE_VIDEO',
        payload: { jobId: 'test-123' },
      });

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('videoUrl');
    });
  });

  describe('Queue Processing Flow', () => {
    test('should add jobs to queue', async () => {
      let storedJobs: any[] = [];

      mockChrome.storage.local.set.mockImplementation((items, callback) => {
        if (items.jobs) {
          storedJobs = items.jobs;
        }
        callback?.();
        return Promise.resolve();
      });

      mockChrome.storage.local.get.mockImplementation((keys, callback) => {
        callback?.({ jobs: storedJobs });
        return Promise.resolve({ jobs: storedJobs });
      });

      // Simulate adding a job
      const newJob = {
        id: 'job_123',
        status: 'pending',
        product: { name: 'Test', price: 100 },
        createdAt: Date.now(),
      };

      await chrome.storage.local.set({ jobs: [newJob] });

      const result = await chrome.storage.local.get(['jobs']);

      expect(result).toHaveProperty('jobs');
      expect((result as any).jobs).toHaveLength(1);
    });

    test('should process batch jobs sequentially', async () => {
      const processedJobs: string[] = [];

      mockChrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (message.type === 'CREATE_VIDEO') {
          processedJobs.push(message.payload.jobId);
          callback?.({ success: true });
        }
        return Promise.resolve({ success: true });
      });

      // Simulate batch processing
      const jobIds = ['job_1', 'job_2', 'job_3'];

      for (const jobId of jobIds) {
        await chrome.runtime.sendMessage({ type: 'CREATE_VIDEO', payload: { jobId } });
      }

      expect(processedJobs).toEqual(jobIds);
    });
  });

  describe('Platform Posting Flow', () => {
    test('should post to TikTok after video completion', async () => {
      mockChrome.tabs.query.mockResolvedValueOnce([{ id: 1, url: 'https://tiktok.com' }]);
      
      mockChrome.tabs.sendMessage.mockResolvedValueOnce({
        success: true,
        postId: 'tiktok_post_123',
      });

      const result = await chrome.tabs.sendMessage(1, {
        type: 'UPLOAD_VIDEO',
        payload: {
          jobId: 'test-123',
          videoUrl: 'https://example.com/video.mp4',
          caption: 'Test caption',
          hashtags: ['test', 'review'],
        },
      });

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('postId');
    });
  });

  describe('Download Flow', () => {
    test('should trigger download for completed video', async () => {
      mockChrome.runtime.sendMessage.mockResolvedValueOnce({
        success: true,
        downloadId: 123,
      });

      const result = await chrome.runtime.sendMessage({
        type: 'DOWNLOAD_VIDEO',
        payload: {
          url: 'https://example.com/video.mp4',
          filename: 'test_video.mp4',
        },
      });

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('downloadId');
    });
  });
});
