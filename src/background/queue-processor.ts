/**
 * Queue Processor
 * Manages video generation queue processing
 */

import { logger } from '@/utils/logger.util';
import type { VideoJob, Platform } from '@/types';

export class QueueProcessor {
  private isProcessing = false;
  private isPaused = false;
  private maxConcurrent = 2;
  private activeJobs = new Set<string>();

  constructor() {
    logger.info('QueueProcessor initialized');
  }

  /**
   * Process a specific job
   */
  async processJob(jobId: string): Promise<{ success: boolean; error?: string }> {
    if (this.activeJobs.has(jobId)) {
      return { success: false, error: 'Job already processing' };
    }

    if (this.isPaused) {
      return { success: false, error: 'Queue is paused' };
    }

    try {
      this.activeJobs.add(jobId);
      await this.updateJobStatus(jobId, 'processing');

      const job = await this.getJob(jobId);
      if (!job) {
        throw new Error('Job not found');
      }

      // Find Google Flow tab or create one
      const flowTab = await this.findOrCreateFlowTab();
      if (!flowTab?.id) {
        throw new Error('Could not open Google Flow');
      }

      // Send message to content script
      const result = await this.sendToTab(flowTab.id, {
        type: 'CREATE_VIDEO',
        payload: {
          jobId,
          prompt: job.prompt,
          duration: job.settings?.duration || 30,
          aspectRatio: job.settings?.aspectRatio || '9:16',
          includeMusic: job.settings?.includeMusic ?? true,
          includeVoiceover: job.settings?.includeVoiceover ?? false,
        },
      });

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.updateJobStatus(jobId, 'failed', { error: errorMessage });
      return { success: false, error: errorMessage };

    } finally {
      this.activeJobs.delete(jobId);
    }
  }

  /**
   * Start batch processing
   */
  async startBatchProcessing(): Promise<{ success: boolean }> {
    this.isPaused = false;
    this.isProcessing = true;
    
    // Process next in queue
    await this.processNextInQueue();
    
    return { success: true };
  }

  /**
   * Process next job in queue
   */
  async processNextInQueue(): Promise<void> {
    if (this.isPaused || this.activeJobs.size >= this.maxConcurrent) {
      return;
    }

    const pendingJobs = await this.getPendingJobs();
    
    for (const job of pendingJobs) {
      if (this.activeJobs.size >= this.maxConcurrent) {
        break;
      }

      if (!this.activeJobs.has(job.id)) {
        // Don't await - process in background
        this.processJob(job.id).catch((error) => {
          logger.error('Job processing error:', error);
        });
      }
    }
  }

  /**
   * Pause processing
   */
  async pauseProcessing(): Promise<{ success: boolean }> {
    this.isPaused = true;
    logger.info('Queue processing paused');
    return { success: true };
  }

  /**
   * Resume processing
   */
  async resumeProcessing(): Promise<{ success: boolean }> {
    this.isPaused = false;
    logger.info('Queue processing resumed');
    await this.processNextInQueue();
    return { success: true };
  }

  /**
   * Cancel a job
   */
  async cancelJob(jobId: string): Promise<{ success: boolean }> {
    await this.updateJobStatus(jobId, 'cancelled');
    this.activeJobs.delete(jobId);
    logger.info('Job cancelled:', jobId);
    return { success: true };
  }

  /**
   * Retry a failed job
   */
  async retryJob(jobId: string): Promise<{ success: boolean }> {
    const job = await this.getJob(jobId);
    if (!job) {
      return { success: false };
    }

    await this.updateJobStatus(jobId, 'pending', { 
      retryCount: (job.retryCount || 0) + 1,
      error: null,
    });

    // Process immediately
    return this.processJob(jobId);
  }

  /**
   * Post to platform
   */
  async postToplatform(jobId: string, platform: Platform, videoUrl: string): Promise<{ success: boolean }> {
    const job = await this.getJob(jobId);
    if (!job) {
      return { success: false };
    }

    try {
      const tab = await this.findOrCreatePlatformTab(platform);
      if (!tab?.id) {
        throw new Error(`Could not open ${platform}`);
      }

      // Generate caption
      const caption = this.generateCaption(job);
      const hashtags = this.generateHashtags(job, platform);

      await this.sendToTab(tab.id, {
        type: 'UPLOAD_VIDEO',
        payload: {
          jobId,
          videoUrl,
          caption,
          hashtags,
        },
      });

      return { success: true };

    } catch (error) {
      logger.error(`Failed to post to ${platform}:`, error);
      return { success: false };
    }
  }

  /**
   * Find or create Google Flow tab
   */
  private async findOrCreateFlowTab(): Promise<chrome.tabs.Tab | null> {
    const tabs = await chrome.tabs.query({ url: '*://flow.google.com/*' });
    
    if (tabs.length > 0) {
      // Activate existing tab
      await chrome.tabs.update(tabs[0].id!, { active: true });
      return tabs[0];
    }

    // Create new tab
    return chrome.tabs.create({ url: 'https://flow.google.com/create', active: false });
  }

  /**
   * Find or create platform tab
   */
  private async findOrCreatePlatformTab(platform: Platform): Promise<chrome.tabs.Tab | null> {
    const urlMap: Record<Platform, string> = {
      tiktok: 'https://www.tiktok.com/upload',
      shopee: 'https://seller.shopee.co.th',
      lazada: 'https://sellercenter.lazada.co.th',
    };

    const tabs = await chrome.tabs.query({ url: `*://*.${platform}.com/*` });
    
    if (tabs.length > 0) {
      return tabs[0];
    }

    return chrome.tabs.create({ url: urlMap[platform], active: false });
  }

  /**
   * Send message to tab
   */
  private async sendToTab(tabId: number, message: any): Promise<any> {
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tabId, message, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });
  }

  /**
   * Get job from storage
   */
  private async getJob(jobId: string): Promise<VideoJob | null> {
    const result = await chrome.storage.local.get('jobs');
    const jobs = result.jobs || [];
    return jobs.find((j: VideoJob) => j.id === jobId) || null;
  }

  /**
   * Get pending jobs
   */
  private async getPendingJobs(): Promise<VideoJob[]> {
    const result = await chrome.storage.local.get('jobs');
    const jobs = result.jobs || [];
    return jobs.filter((j: VideoJob) => j.status === 'pending');
  }

  /**
   * Update job status
   */
  private async updateJobStatus(jobId: string, status: string, data?: any): Promise<void> {
    const result = await chrome.storage.local.get('jobs');
    const jobs = result.jobs || [];
    const jobIndex = jobs.findIndex((j: VideoJob) => j.id === jobId);
    
    if (jobIndex >= 0) {
      jobs[jobIndex] = { 
        ...jobs[jobIndex], 
        status, 
        ...data, 
        updatedAt: Date.now(),
      };
      await chrome.storage.local.set({ jobs });
    }
  }

  /**
   * Generate caption for post
   */
  private generateCaption(job: VideoJob): string {
    const productName = job.product?.name || 'สินค้า';
    const price = job.product?.price ? `฿${job.product.price.toLocaleString()}` : '';
    
    const templates = [
      `🔥 ${productName} ${price}\n\nมาแล้วจ้า! สินค้าดีๆ ที่ต้องมี ✨\nกดลิงก์ในโปรไฟล์เลย! 👆`,
      `⚡ ${productName}\n\nราคาเบาๆ ${price} เท่านั้น!\n📦 ส่งฟรี | 🔄 คืนได้`,
      `✨ รีวิว ${productName}\n\nใช้ดีมากก บอกเลย! ${price}\n🛒 ลิงก์อยู่ในโปรไฟล์นะคะ`,
    ];

    return templates[Math.floor(Math.random() * templates.length)];
  }

  /**
   * Generate hashtags
   */
  private generateHashtags(job: VideoJob, platform: Platform): string[] {
    const baseHashtags = ['รีวิว', 'ของดี', 'แนะนำ', 'ลดราคา', 'ส่งฟรี'];
    
    const platformHashtags: Record<Platform, string[]> = {
      tiktok: ['TikTokShop', 'fyp', 'ของมันต้องมี', 'รีวิวสินค้า'],
      shopee: ['ShopeeTH', 'ShopeeHaul', 'ShopeeReview'],
      lazada: ['LazadaTH', 'LazadaSale', 'LazadaReview'],
    };

    const categoryHashtags = job.product?.category ? [job.product.category.replace(/\s+/g, '')] : [];

    return [...baseHashtags, ...platformHashtags[platform], ...categoryHashtags];
  }
}
