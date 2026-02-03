/**
 * useDownload Hook
 * Manages video download operations
 */

import { useState, useCallback } from 'react';

interface DownloadState {
  isDownloading: boolean;
  progress: number;
  error: string | null;
}

interface DownloadItem {
  id: number;
  filename: string;
  url: string;
  progress: number;
  state: 'in_progress' | 'complete' | 'interrupted';
}

interface UseDownloadReturn {
  state: DownloadState;
  activeDownloads: DownloadItem[];
  downloadVideo: (url: string, filename?: string) => Promise<number | null>;
  downloadMultiple: (videos: { url: string; filename?: string }[]) => Promise<void>;
  cancelDownload: (downloadId: number) => Promise<void>;
  openDownloadsFolder: () => Promise<void>;
  getRecentDownloads: (limit?: number) => Promise<DownloadItem[]>;
}

export function useDownload(): UseDownloadReturn {
  const [state, setState] = useState<DownloadState>({
    isDownloading: false,
    progress: 0,
    error: null,
  });

  const [activeDownloads, setActiveDownloads] = useState<DownloadItem[]>([]);

  const downloadVideo = useCallback(async (url: string, filename?: string): Promise<number | null> => {
    setState(prev => ({ ...prev, isDownloading: true, error: null }));

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'DOWNLOAD_VIDEO',
        payload: { url, filename },
      });

      if (!response.success) {
        throw new Error(response.error || 'Download failed');
      }

      // Track active download
      setActiveDownloads(prev => [
        ...prev,
        {
          id: response.downloadId,
          filename: filename || `video_${Date.now()}.mp4`,
          url,
          progress: 0,
          state: 'in_progress',
        },
      ]);

      return response.downloadId;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Download failed';
      setState(prev => ({ ...prev, error: errorMessage }));
      return null;

    } finally {
      setState(prev => ({ ...prev, isDownloading: false }));
    }
  }, []);

  const downloadMultiple = useCallback(async (videos: { url: string; filename?: string }[]): Promise<void> => {
    setState(prev => ({ ...prev, isDownloading: true, error: null }));

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'BATCH_DOWNLOAD',
        payload: { videos },
      });

      if (response.some((r: any) => !r.success)) {
        console.warn('Some downloads failed');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Batch download failed';
      setState(prev => ({ ...prev, error: errorMessage }));

    } finally {
      setState(prev => ({ ...prev, isDownloading: false }));
    }
  }, []);

  const cancelDownload = useCallback(async (downloadId: number): Promise<void> => {
    try {
      await chrome.downloads.cancel(downloadId);
      setActiveDownloads(prev => prev.filter(d => d.id !== downloadId));
    } catch (error) {
      console.error('Failed to cancel download:', error);
    }
  }, []);

  const openDownloadsFolder = useCallback(async (): Promise<void> => {
    const [download] = await chrome.downloads.search({
      limit: 1,
      orderBy: ['-startTime'],
      filenameRegex: 'FlowAffiliatePro',
    });

    if (download) {
      chrome.downloads.show(download.id);
    }
  }, []);

  const getRecentDownloads = useCallback(async (limit = 10): Promise<DownloadItem[]> => {
    const downloads = await chrome.downloads.search({
      limit,
      orderBy: ['-startTime'],
      filenameRegex: 'FlowAffiliatePro',
    });

    return downloads.map(d => ({
      id: d.id,
      filename: d.filename.split('/').pop() || d.filename,
      url: d.url,
      progress: d.totalBytes > 0 ? (d.bytesReceived / d.totalBytes) * 100 : 0,
      state: d.state === 'complete' ? 'complete' : d.state === 'interrupted' ? 'interrupted' : 'in_progress',
    }));
  }, []);

  return {
    state,
    activeDownloads,
    downloadVideo,
    downloadMultiple,
    cancelDownload,
    openDownloadsFolder,
    getRecentDownloads,
  };
}
