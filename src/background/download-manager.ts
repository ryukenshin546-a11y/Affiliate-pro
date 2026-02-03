/**
 * Download Manager
 * Handles video downloads and file management
 */

import { logger } from '@/utils/logger.util';
import { sanitizeFilename } from '@/utils/slugify.util';

interface DownloadOptions {
  url: string;
  filename?: string;
  folder?: string;
}

interface DownloadResult {
  success: boolean;
  downloadId?: number;
  error?: string;
}

export class DownloadManager {
  private activeDownloads = new Map<number, string>();
  private downloadFolder = 'FlowAffiliatePro';

  constructor() {
    this.initDownloadListener();
    logger.info('DownloadManager initialized');
  }

  /**
   * Initialize download state listener
   */
  private initDownloadListener(): void {
    chrome.downloads.onChanged.addListener((delta) => {
      if (delta.state?.current === 'complete') {
        const jobId = this.activeDownloads.get(delta.id);
        if (jobId) {
          logger.info('Download complete:', jobId);
          this.activeDownloads.delete(delta.id);
          
          // Notify completion
          chrome.runtime.sendMessage({
            type: 'DOWNLOAD_COMPLETE',
            payload: { downloadId: delta.id, jobId },
          });
        }
      } else if (delta.error) {
        const jobId = this.activeDownloads.get(delta.id);
        if (jobId) {
          logger.error('Download failed:', jobId, delta.error.current);
          this.activeDownloads.delete(delta.id);
        }
      }
    });
  }

  /**
   * Download a video
   */
  async downloadVideo(options: DownloadOptions): Promise<DownloadResult> {
    try {
      const filename = this.buildFilename(options);

      const downloadId = await chrome.downloads.download({
        url: options.url,
        filename,
        saveAs: false,
      });

      this.activeDownloads.set(downloadId, filename);
      logger.info('Download started:', downloadId, filename);

      return { success: true, downloadId };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Download failed';
      logger.error('Download error:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Download multiple videos
   */
  async batchDownload(videos: { url: string; filename?: string }[]): Promise<DownloadResult[]> {
    const results: DownloadResult[] = [];

    for (const video of videos) {
      // Add delay between downloads to avoid rate limiting
      await this.sleep(500);
      const result = await this.downloadVideo(video);
      results.push(result);
    }

    return results;
  }

  /**
   * Build filename with sanitization
   */
  private buildFilename(options: DownloadOptions): string {
    const folder = options.folder || this.downloadFolder;
    const timestamp = new Date().toISOString().slice(0, 10);
    
    let filename = options.filename || `video_${Date.now()}`;
    
    // Ensure .mp4 extension
    if (!filename.endsWith('.mp4')) {
      filename += '.mp4';
    }

    // Sanitize filename
    filename = sanitizeFilename(filename);

    return `${folder}/${timestamp}/${filename}`;
  }

  /**
   * Get download progress
   */
  async getDownloadProgress(downloadId: number): Promise<{ progress: number; state: string } | null> {
    const [download] = await chrome.downloads.search({ id: downloadId });
    
    if (!download) {
      return null;
    }

    const progress = download.totalBytes > 0 
      ? (download.bytesReceived / download.totalBytes) * 100 
      : 0;

    return {
      progress,
      state: download.state,
    };
  }

  /**
   * Cancel a download
   */
  async cancelDownload(downloadId: number): Promise<void> {
    try {
      await chrome.downloads.cancel(downloadId);
      this.activeDownloads.delete(downloadId);
      logger.info('Download cancelled:', downloadId);
    } catch (error) {
      logger.error('Cancel download error:', error);
    }
  }

  /**
   * Open downloads folder
   */
  async openDownloadsFolder(): Promise<void> {
    const [download] = await chrome.downloads.search({ 
      limit: 1, 
      orderBy: ['-startTime'],
      filenameRegex: `${this.downloadFolder}`,
    });

    if (download) {
      chrome.downloads.show(download.id);
    }
  }

  /**
   * Get recent downloads
   */
  async getRecentDownloads(limit = 10): Promise<chrome.downloads.DownloadItem[]> {
    return chrome.downloads.search({
      limit,
      orderBy: ['-startTime'],
      filenameRegex: `${this.downloadFolder}`,
    });
  }

  /**
   * Clear old downloads (older than specified days)
   */
  async clearOldDownloads(daysOld = 30): Promise<number> {
    const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
    
    const oldDownloads = await chrome.downloads.search({
      filenameRegex: `${this.downloadFolder}`,
      startedBefore: new Date(cutoffTime).toISOString(),
    });

    let cleared = 0;
    for (const download of oldDownloads) {
      try {
        await chrome.downloads.erase({ id: download.id });
        cleared++;
      } catch (error) {
        logger.error('Failed to clear download:', download.id);
      }
    }

    logger.info(`Cleared ${cleared} old downloads`);
    return cleared;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
