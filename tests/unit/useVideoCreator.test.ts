/**
 * Unit Tests for Video Creator Hook
 */

import { renderHook, act } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { useVideoCreator } from '@/hooks/useVideoCreator';
import { useQueueStore, useAuthStore, useSettingsStore } from '@/store';

describe('useVideoCreator', () => {
  beforeEach(() => {
    // Ensure chrome.runtime.sendMessage is a spy we can assert on
    (globalThis as any).chrome = {
      ...(globalThis as any).chrome,
      runtime: {
        ...(globalThis as any).chrome?.runtime,
        sendMessage: vi.fn(),
      },
    };

    // Reset relevant store state
    useQueueStore.setState({
      jobs: [],
      activeJobId: undefined,
      isProcessing: false,
      dailyCreated: 0,
      dailyLimit: 50,
      stats: { total: 0, pending: 0, processing: 0, completed: 0, failed: 0 },
    });

    useAuthStore.setState({
      googleFlow: {
        accessToken: 'test-token',
        refreshToken: 'test-refresh',
        expiresAt: Date.now() + 60_000,
        creditsRemaining: 50,
        creditsTotal: 50,
      },
      tiktok: undefined,
      shopee: undefined,
      lazada: undefined,
      isLoading: false,
      lastSynced: undefined,
    });

    useSettingsStore.setState({
      ...useSettingsStore.getState(),
      videoDefaults: {
        resolution: '1080x1920',
        duration: 30,
        musicVolume: 50,
        addWatermark: false,
      },
    });
  });

  test('should initialize with idle state', () => {
    const { result } = renderHook(() => useVideoCreator());

    expect(result.current.state).toEqual({
      isLoading: false,
      isGenerating: false,
      error: null,
      currentStep: 'idle',
    });
  });

  test('should create video from text input', async () => {
    const { result } = renderHook(() => useVideoCreator());

    let jobId: string | null = null;

    await act(async () => {
      jobId = await result.current.createVideo('Test product description');
    });

    expect(jobId).toBeTypeOf('string');

    const jobs = useQueueStore.getState().jobs;
    expect(jobs).toHaveLength(1);
    expect(jobs[0].status).toBe('processing');

    expect((globalThis as any).chrome.runtime.sendMessage).toHaveBeenCalledWith({
      type: 'CREATE_VIDEO',
      payload: { jobId },
    });
  });

  test('should return error when not authenticated', async () => {
    useAuthStore.setState({
      ...useAuthStore.getState(),
      googleFlow: undefined,
    });

    const { result } = renderHook(() => useVideoCreator());

    let jobId: string | null = null;

    await act(async () => {
      jobId = await result.current.createVideo('Test product');
    });

    expect(jobId).toBeNull();
    expect(result.current.state.error).toBe('Please connect your Google Flow account first');
  });

  test('should add to queue without starting', async () => {
    const { result } = renderHook(() => useVideoCreator());

    let jobId: string = '';

    await act(async () => {
      jobId = await result.current.addToQueue('Test product');
    });

    expect(jobId).toBeTypeOf('string');
    const jobs = useQueueStore.getState().jobs;
    expect(jobs).toHaveLength(1);
    expect(jobs[0].status).toBe('pending');
  });

  test('should reset state', () => {
    const { result } = renderHook(() => useVideoCreator());

    act(() => {
      result.current.reset();
    });

    expect(result.current.state).toEqual({
      isLoading: false,
      isGenerating: false,
      error: null,
      currentStep: 'idle',
    });
  });
});
