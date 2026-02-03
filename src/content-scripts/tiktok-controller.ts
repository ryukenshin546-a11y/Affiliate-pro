/**
 * TikTok Controller - Content Script
 * Automates video upload and posting on TikTok
 */

import { TIKTOK_SELECTORS, RATE_LIMITS } from '@/config/constants';
import { logger } from '@/utils/logger.util';

interface VideoUploadRequest {
  jobId: string;
  videoUrl: string;
  caption: string;
  hashtags: string[];
  scheduledTime?: number; // Unix timestamp
  visibility?: 'public' | 'private' | 'friends';
}

interface TikTokControllerState {
  isUploading: boolean;
  currentJobId: string | null;
  lastActionTime: number;
}

class TikTokController {
  private state: TikTokControllerState = {
    isUploading: false,
    currentJobId: null,
    lastActionTime: 0,
  };

  private selectors = TIKTOK_SELECTORS;

  constructor() {
    this.initMessageListener();
    logger.info('TikTokController initialized');
  }

  /**
   * Initialize message listener
   */
  private initMessageListener(): void {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      logger.debug('TikTokController received message:', message);

      switch (message.type) {
        case 'UPLOAD_VIDEO':
          this.handleUploadVideo(message.payload)
            .then(sendResponse)
            .catch((error) => sendResponse({ success: false, error: error.message }));
          return true;

        case 'CHECK_AUTH':
          sendResponse(this.checkAuthentication());
          break;

        case 'GET_PROFILE':
          sendResponse(this.getProfileInfo());
          break;

        default:
          sendResponse({ success: false, error: 'Unknown action' });
      }
    });
  }

  /**
   * Wait for element
   */
  private async waitForElement(selector: string, timeout = 10000): Promise<Element | null> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      let element: Element | null = null;
      try {
        element = document.querySelector(selector);
      } catch (error) {
        logger.warn('Invalid selector in TikTokController', { selector, error });
        return null;
      }
      if (element) return element;
      await this.sleep(100);
    }
    return null;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Enforce rate limit
   */
  private async enforceRateLimit(): Promise<void> {
    const timeSinceLastAction = Date.now() - this.state.lastActionTime;
    const minDelay = RATE_LIMITS.MIN_ACTION_DELAY_MS;

    if (timeSinceLastAction < minDelay) {
      await this.sleep(minDelay - timeSinceLastAction);
    }

    this.state.lastActionTime = Date.now();
  }

  /**
   * Type text with human-like behavior
   */
  private async typeText(element: HTMLElement, text: string): Promise<void> {
    const input = element as HTMLInputElement | HTMLTextAreaElement;
    input.focus();
    input.value = '';

    for (const char of text) {
      input.value += char;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await this.sleep(30 + Math.random() * 50);
    }

    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  /**
   * Click element
   */
  private async clickElement(element: Element): Promise<void> {
    const htmlElement = element as HTMLElement;
    htmlElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await this.sleep(200);
    htmlElement.click();
    await this.sleep(300);
  }

  /**
   * Handle video upload
   */
  private async handleUploadVideo(request: VideoUploadRequest): Promise<{ success: boolean; postId?: string; error?: string }> {
    if (this.state.isUploading) {
      return { success: false, error: 'Another upload in progress' };
    }

    this.state.isUploading = true;
    this.state.currentJobId = request.jobId;

    try {
      await this.enforceRateLimit();

      // Check if on upload page
      if (!window.location.href.includes('/upload')) {
        window.location.href = 'https://www.tiktok.com/upload';
        await this.sleep(3000);
      }

      // Wait for upload interface
      const uploadArea = await this.waitForElement(this.selectors.uploadArea, 15000);
      if (!uploadArea) {
        throw new Error('Upload interface not found');
      }

      // Download video file and create File object
      const videoBlob = await this.downloadVideo(request.videoUrl);
      const videoFile = new File([videoBlob], `video_${request.jobId}.mp4`, { type: 'video/mp4' });

      // Trigger file input
      const fileInput = await this.waitForElement(this.selectors.fileInput) as HTMLInputElement;
      if (fileInput) {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(videoFile);
        fileInput.files = dataTransfer.files;
        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      } else {
        throw new Error('File input not found');
      }

      // Wait for upload to complete
      await this.waitForUploadComplete();

      // Add caption and hashtags
      const caption = request.caption + ' ' + request.hashtags.map(h => `#${h}`).join(' ');
      await this.addCaption(caption);

      // Set visibility
      if (request.visibility) {
        await this.setVisibility(request.visibility);
      }

      // Schedule or post immediately
      if (request.scheduledTime) {
        await this.schedulePost(request.scheduledTime);
      } else {
        await this.publishPost();
      }

      // Get post ID
      const postId = await this.extractPostId();

      chrome.runtime.sendMessage({
        type: 'VIDEO_POSTED',
        payload: {
          jobId: request.jobId,
          platform: 'tiktok',
          postId,
        },
      });

      return { success: true, postId };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('TikTok upload failed:', errorMessage);

      chrome.runtime.sendMessage({
        type: 'POST_FAILED',
        payload: {
          jobId: request.jobId,
          platform: 'tiktok',
          error: errorMessage,
        },
      });

      return { success: false, error: errorMessage };

    } finally {
      this.state.isUploading = false;
      this.state.currentJobId = null;
    }
  }

  /**
   * Download video from URL
   */
  private async downloadVideo(url: string): Promise<Blob> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to download video');
    }
    return response.blob();
  }

  /**
   * Wait for video upload to complete
   */
  private async waitForUploadComplete(): Promise<void> {
    const maxWait = 60000; // 1 minute
    const startTime = Date.now();

    while (Date.now() - startTime < maxWait) {
      const uploadComplete = document.querySelector(this.selectors.uploadComplete);
      const uploadProgress = document.querySelector(this.selectors.uploadProgress);

      if (uploadComplete) {
        return;
      }

      if (uploadProgress) {
        const progress = uploadProgress.textContent;
        logger.debug('Upload progress:', progress);
      }

      await this.sleep(1000);
    }

    throw new Error('Upload timeout');
  }

  /**
   * Add caption to video
   */
  private async addCaption(caption: string): Promise<void> {
    const captionInput = await this.waitForElement(this.selectors.captionInput);
    
    if (!captionInput) {
      throw new Error('Caption input not found');
    }

    // Clear existing content
    const editableDiv = captionInput as HTMLDivElement;
    editableDiv.innerHTML = '';
    
    // Set new caption
    await this.typeText(captionInput as HTMLElement, caption);
    await this.sleep(500);
  }

  /**
   * Set post visibility
   */
  private async setVisibility(visibility: 'public' | 'private' | 'friends'): Promise<void> {
    const visibilitySelector = await this.waitForElement(this.selectors.visibilitySelector, 3000);
    
    if (visibilitySelector) {
      await this.clickElement(visibilitySelector);
      await this.sleep(300);

      const optionMap = {
        public: this.selectors.visibilityPublic,
        private: this.selectors.visibilityPrivate,
        friends: this.selectors.visibilityFriends,
      };

      const option = await this.waitForElement(optionMap[visibility], 2000);
      if (option) {
        await this.clickElement(option);
      }
    }
  }

  /**
   * Schedule post for later
   */
  private async schedulePost(timestamp: number): Promise<void> {
    const scheduleToggle = await this.waitForElement(this.selectors.scheduleToggle, 3000);
    
    if (scheduleToggle) {
      await this.clickElement(scheduleToggle);
      await this.sleep(500);

      // Set date/time
      const dateInput = await this.waitForElement(this.selectors.scheduleDateInput, 2000);
      if (dateInput) {
        const date = new Date(timestamp);
        // Format and set date
        (dateInput as HTMLInputElement).value = date.toISOString().slice(0, 16);
        dateInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  }

  /**
   * Publish post immediately
   */
  private async publishPost(): Promise<void> {
    const postButton = await this.waitForElement(this.selectors.postButton, 5000);
    
    if (!postButton) {
      throw new Error('Post button not found');
    }

    await this.clickElement(postButton);
    await this.sleep(2000);

    // Wait for success confirmation
    const successMessage = await this.waitForElement(this.selectors.successMessage, 30000);
    
    if (!successMessage) {
      // Check for errors
      const errorMessage = document.querySelector(this.selectors.errorMessage);
      if (errorMessage) {
        throw new Error(errorMessage.textContent || 'Post failed');
      }
      throw new Error('Post confirmation not received');
    }
  }

  /**
   * Extract post ID after successful publish
   */
  private async extractPostId(): Promise<string> {
    // Try to get from URL
    const url = window.location.href;
    const match = url.match(/\/video\/(\d+)/);
    
    if (match) {
      return match[1];
    }

    // Generate placeholder if not found
    return `tiktok_${Date.now()}`;
  }

  /**
   * Check if user is authenticated
   */
  private checkAuthentication(): { isAuthenticated: boolean; username?: string } {
    const profileElement = document.querySelector(this.selectors.profileAvatar);
    const usernameElement = document.querySelector(this.selectors.username);

    return {
      isAuthenticated: !!profileElement,
      username: usernameElement?.textContent || undefined,
    };
  }

  /**
   * Get user profile info
   */
  private getProfileInfo(): { username?: string; followers?: number; avatar?: string } | null {
    const usernameEl = document.querySelector(this.selectors.username);
    const followersEl = document.querySelector(this.selectors.followerCount);
    const avatarEl = document.querySelector(this.selectors.profileAvatar) as HTMLImageElement;

    if (!usernameEl) return null;

    return {
      username: usernameEl.textContent || undefined,
      followers: followersEl ? parseInt(followersEl.textContent || '0', 10) : undefined,
      avatar: avatarEl?.src || undefined,
    };
  }
}

// Initialize controller
const tiktokController = new TikTokController();

// Export for potential direct access
(window as any).__tiktokController = tiktokController;

export default TikTokController;
