/**
 * Google Flow Controller - Content Script
 * Automates video generation on Google Flow AI platform
 */

import { GOOGLE_FLOW_SELECTORS, RATE_LIMITS } from '@/config/constants';
import { logger } from '@/utils/logger.util';

interface VideoCreationRequest {
  jobId: string;
  prompt: string;
  duration: number;
  aspectRatio: '9:16' | '16:9' | '1:1';
  includeMusic: boolean;
  includeVoiceover: boolean;
  voiceSettings?: {
    language: string;
    gender: string;
  };
}

interface FlowControllerState {
  isProcessing: boolean;
  currentJobId: string | null;
  lastActionTime: number;
}

class FlowController {
  private state: FlowControllerState = {
    isProcessing: false,
    currentJobId: null,
    lastActionTime: 0,
  };

  private selectors = GOOGLE_FLOW_SELECTORS;

  private static readonly FLOW_VIDEO_HOST = 'storage.googleapis.com';
  private static readonly FLOW_VIDEO_PATH_FRAGMENT = '/ai-sandbox-videofx/video/';

  constructor() {
    this.initMessageListener();
    logger.info('FlowController initialized');
  }

  /**
   * Initialize message listener for background script communication
   */
  private initMessageListener(): void {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      logger.debug('FlowController received message:', message);

      switch (message.type) {
        case 'CREATE_VIDEO':
          this.handleCreateVideo(message.payload)
            .then(sendResponse)
            .catch((error) => sendResponse({ success: false, error: error.message }));
          return true; // Keep channel open for async response

        case 'CHECK_STATUS':
          sendResponse(this.checkGenerationStatus());
          break;

        case 'GET_VIDEO_URL':
          sendResponse(this.getVideoDownloadUrl());
          break;

        case 'CANCEL_GENERATION':
          this.cancelGeneration()
            .then(sendResponse)
            .catch((error) => sendResponse({ success: false, error: error.message }));
          return true;

        case 'GET_CREDITS':
          sendResponse(this.getCreditsInfo());
          break;

        default:
          sendResponse({ success: false, error: 'Unknown action' });
      }
    });
  }

  /**
   * Wait for an element to appear in DOM
   */
  private async waitForElement(selector: string, timeout = 10000): Promise<Element | null> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const element = this.querySelectorSafe(selector);
      if (element) return element;
      await this.sleep(100);
    }

    return null;
  }

  private querySelectorSafe(selector: string): Element | null {
    try {
      return document.querySelector(selector);
    } catch (error) {
      logger.warn('Invalid selector in FlowController', { selector, error });
      return null;
    }
  }

  private isFlowSignedVideoUrl(url: string): boolean {
    const trimmed = url.trim();
    if (!trimmed) return false;

    try {
      const parsed = new URL(trimmed, window.location.href);
      return (
        parsed.hostname === FlowController.FLOW_VIDEO_HOST &&
        parsed.pathname.includes(FlowController.FLOW_VIDEO_PATH_FRAGMENT)
      );
    } catch {
      return trimmed.includes(`${FlowController.FLOW_VIDEO_HOST}${FlowController.FLOW_VIDEO_PATH_FRAGMENT}`);
    }
  }

  private findGeneratedVideoUrl(): string | null {
    // 1) Look for <video> tags with a signed URL
    const videos = Array.from(document.querySelectorAll('video')) as HTMLVideoElement[];
    for (const video of videos) {
      const candidates = [video.currentSrc, video.src].filter(Boolean) as string[];
      const match = candidates.find((u) => this.isFlowSignedVideoUrl(u));
      if (match) return match;

      // Some players use <source>
      const sources = Array.from(video.querySelectorAll('source')) as HTMLSourceElement[];
      for (const source of sources) {
        if (source.src && this.isFlowSignedVideoUrl(source.src)) return source.src;
      }
    }

    // 2) Look for download links/buttons carrying the URL
    const linkCandidates = Array.from(
      document.querySelectorAll('a[href], a[download], button[data-url], [data-url]')
    ) as HTMLElement[];

    for (const el of linkCandidates) {
      const href = (el as HTMLAnchorElement).href;
      if (href && this.isFlowSignedVideoUrl(href)) return href;

      const dataUrl = el.getAttribute('data-url');
      if (dataUrl && this.isFlowSignedVideoUrl(dataUrl)) return dataUrl;
    }

    return null;
  }

  /**
   * Wait for multiple elements
   */
  private async waitForElements(selector: string, timeout = 10000): Promise<Element[]> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      let elements: NodeListOf<Element>;
      try {
        elements = document.querySelectorAll(selector);
      } catch (error) {
        logger.warn('Invalid selector in FlowController', { selector, error });
        return [];
      }
      if (elements.length > 0) return Array.from(elements);
      await this.sleep(100);
    }

    return [];
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Enforce rate limiting
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
   * Simulate human-like typing
   */
  private async typeText(element: HTMLElement, text: string): Promise<void> {
    const input = element as HTMLInputElement | HTMLTextAreaElement;
    input.focus();

    // Clear existing text
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    // Type character by character with random delays
    for (const char of text) {
      input.value += char;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await this.sleep(30 + Math.random() * 50);
    }

    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  /**
   * Click element with human-like behavior
   */
  private async clickElement(element: Element): Promise<void> {
    const htmlElement = element as HTMLElement;

    // Scroll into view
    htmlElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await this.sleep(200);

    // Simulate hover
    htmlElement.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    await this.sleep(100);

    // Click
    htmlElement.click();
    await this.sleep(300);
  }

  private findButtonByText(texts: string[]): HTMLButtonElement | null {
    const normalizedTargets = texts.map((t) => t.trim()).filter(Boolean);
    if (normalizedTargets.length === 0) return null;

    const buttons = Array.from(document.querySelectorAll('button')) as HTMLButtonElement[];
    for (const button of buttons) {
      const label = (button.innerText || button.textContent || '').trim();
      if (!label) continue;
      if (normalizedTargets.some((t) => label.includes(t))) {
        return button;
      }
    }

    return null;
  }

  /**
   * Main video creation handler
   */
  private async handleCreateVideo(request: VideoCreationRequest): Promise<{ success: boolean; videoUrl?: string; error?: string }> {
    if (this.state.isProcessing) {
      return { success: false, error: 'Another video is being processed' };
    }

    this.state.isProcessing = true;
    this.state.currentJobId = request.jobId;

    try {
      await this.enforceRateLimit();

      // Step 1: Navigate to create new video (if not already there)
      await this.navigateToCreatePage();

      // Step 2: Enter prompt
      await this.enterPrompt(request.prompt);

      // Step 3: Configure video settings
      await this.configureSettings(request);

      // Step 4: Start generation
      await this.startGeneration();

      // Step 5: Wait for completion
      const videoUrl = await this.waitForCompletion();

      // Notify success
      chrome.runtime.sendMessage({
        type: 'VIDEO_CREATED',
        payload: {
          jobId: request.jobId,
          videoUrl,
        },
      });

      return { success: true, videoUrl };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Video creation failed:', errorMessage);

      chrome.runtime.sendMessage({
        type: 'VIDEO_FAILED',
        payload: {
          jobId: request.jobId,
          error: errorMessage,
        },
      });

      return { success: false, error: errorMessage };

    } finally {
      this.state.isProcessing = false;
      this.state.currentJobId = null;
    }
  }

  /**
   * Navigate to the video creation page
   */
  private async navigateToCreatePage(): Promise<void> {
    // Current Flow UI typically shows the prompt composer on the project page already.
    // Avoid brittle navigation; just ensure the prompt input exists.
    const promptInput = await this.waitForElement(this.selectors.promptInput, 10000);
    
    if (!promptInput) {
      throw new Error('Could not find prompt input field');
    }
  }

  /**
   * Enter the video prompt
   */
  private async enterPrompt(prompt: string): Promise<void> {
    const promptInput = await this.waitForElement(this.selectors.promptInput);
    
    if (!promptInput) {
      throw new Error('Prompt input not found');
    }

    await this.typeText(promptInput as HTMLElement, prompt);
    await this.sleep(500);
  }

  /**
   * Configure video generation settings
   */
  private async configureSettings(request: VideoCreationRequest): Promise<void> {
    // Flow UI changes frequently; keep settings automation best-effort.
    // Attempt to set aspect ratio via Settings dialog (การตั้งค่า) if present.
    await this.trySetAspectRatio(request.aspectRatio);

    // Set duration
    const durationSelector = await this.waitForElement(this.selectors.durationSelector, 3000);
    if (durationSelector) {
      await this.clickElement(durationSelector);
      await this.sleep(300);

      // Find and click the duration option
      const durationOptions = await this.waitForElements('[data-duration]', 2000);
      const targetOption = durationOptions.find(
        (el) => el.getAttribute('data-duration') === String(request.duration)
      );
      if (targetOption) {
        await this.clickElement(targetOption);
      }
    }

    // Set aspect ratio
    const aspectSelector = await this.waitForElement(this.selectors.aspectRatioSelector, 3000);
    if (aspectSelector) {
      await this.clickElement(aspectSelector);
      await this.sleep(300);

      const aspectOptions = await this.waitForElements('[data-aspect]', 2000);
      const targetAspect = aspectOptions.find(
        (el) => el.getAttribute('data-aspect') === request.aspectRatio
      );
      if (targetAspect) {
        await this.clickElement(targetAspect);
      }
    }

    // Configure music
    if (request.includeMusic) {
      const musicToggle = await this.waitForElement(this.selectors.musicToggle, 3000);
      if (musicToggle && !musicToggle.classList.contains('active')) {
        await this.clickElement(musicToggle);
      }
    }

    // Configure voiceover
    if (request.includeVoiceover) {
      const voiceToggle = await this.waitForElement(this.selectors.voiceoverToggle, 3000);
      if (voiceToggle) {
        await this.clickElement(voiceToggle);
        await this.sleep(500);

        // Set voice language (Thai)
        if (request.voiceSettings) {
          const languageSelector = await this.waitForElement('[data-voice-language]', 2000);
          if (languageSelector) {
            await this.clickElement(languageSelector);
            // Select Thai language
          }
        }
      }
    }
  }

  /**
   * Start the video generation process
   */
  private async startGeneration(): Promise<void> {
    const generateButton =
      (await this.waitForElement(this.selectors.generateButton, 2000)) ||
      this.findButtonByText(['สร้าง', 'Generate', 'Create']);
    
    if (!generateButton) {
      throw new Error('Generate button not found');
    }

    if ((generateButton as HTMLButtonElement).disabled) {
      throw new Error('Generate button is disabled - check credits or input');
    }

    await this.clickElement(generateButton);
    await this.sleep(1000);

    // Verify generation started
    const progressIndicator = await this.waitForElement(this.selectors.progressIndicator, 5000);
    
    if (!progressIndicator) {
      throw new Error('Generation did not start');
    }
  }

  private async trySetAspectRatio(aspectRatio: VideoCreationRequest['aspectRatio']): Promise<void> {
    // Open settings dialog
    const settingsButton = this.findButtonByText(['การตั้งค่า', 'Settings']);
    if (!settingsButton) return;

    await this.clickElement(settingsButton);
    await this.sleep(300);

    const dialog = await this.waitForElement('[role="dialog"]', 2000);
    if (!dialog) return;

    const comboboxes = Array.from(dialog.querySelectorAll('[role="combobox"]')) as HTMLElement[];
    const aspectCombobox = comboboxes.find((el) => {
      const text = (el.innerText || el.textContent || '').toLowerCase();
      return text.includes('9:16') || text.includes('16:9') || text.includes('1:1') || text.includes('สัดส่วน');
    });

    if (!aspectCombobox) return;

    await this.clickElement(aspectCombobox);
    await this.sleep(200);

    const listbox = await this.waitForElement('[role="listbox"]', 1500);
    if (!listbox) return;

    const targetText = aspectRatio === '9:16' ? '9:16' : aspectRatio === '16:9' ? '16:9' : '1:1';
    const options = Array.from(listbox.querySelectorAll('[role="option"]')) as HTMLElement[];
    const option = options.find((o) => (o.innerText || o.textContent || '').includes(targetText));
    if (option) {
      await this.clickElement(option);
      await this.sleep(200);
    }

    // Close dialog
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await this.sleep(200);
  }

  /**
   * Wait for video generation to complete
   */
  private async waitForCompletion(): Promise<string> {
    const maxWaitTime = 5 * 60 * 1000; // 5 minutes
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      const generatedUrl = this.findGeneratedVideoUrl();
      if (generatedUrl) {
        return generatedUrl;
      }

      // Check for completion
      const downloadButton = document.querySelector(this.selectors.downloadButton);
      if (downloadButton) {
        // Get video URL
        const videoElement = document.querySelector(this.selectors.videoPreview) as HTMLVideoElement;
        if (videoElement?.currentSrc && this.isFlowSignedVideoUrl(videoElement.currentSrc)) {
          return videoElement.currentSrc;
        }

        if (videoElement?.src && this.isFlowSignedVideoUrl(videoElement.src)) {
          return videoElement.src;
        }

        // Try to get from download button
        const downloadUrl = downloadButton.getAttribute('href') || downloadButton.getAttribute('data-url');
        if (downloadUrl && this.isFlowSignedVideoUrl(downloadUrl)) {
          return downloadUrl;
        }
      }

      // Check for errors
      const errorElement = document.querySelector(this.selectors.errorMessage);
      if (errorElement) {
        throw new Error(errorElement.textContent || 'Generation failed');
      }

      // Check progress
      const progressText = document.querySelector(this.selectors.progressText);
      if (progressText) {
        logger.debug('Generation progress:', progressText.textContent);
      }

      await this.sleep(2000);
    }

    throw new Error('Video generation timed out');
  }

  /**
   * Check current generation status
   */
  private checkGenerationStatus(): { status: string; progress?: number; jobId?: string } {
    if (!this.state.isProcessing) {
      return { status: 'idle' };
    }

    const progressText = document.querySelector(this.selectors.progressText);
    const progressValue = progressText?.textContent?.match(/(\d+)%/)?.[1];

    return {
      status: 'processing',
      progress: progressValue ? parseInt(progressValue, 10) : undefined,
      jobId: this.state.currentJobId || undefined,
    };
  }

  /**
   * Get video download URL after completion
   */
  private getVideoDownloadUrl(): { success: boolean; url?: string } {
    const generatedUrl = this.findGeneratedVideoUrl();
    if (generatedUrl) {
      return { success: true, url: generatedUrl };
    }

    const downloadButton = document.querySelector(this.selectors.downloadButton);
    const url = downloadButton?.getAttribute('href') || downloadButton?.getAttribute('data-url');

    if (url && this.isFlowSignedVideoUrl(url)) {
      return { success: true, url };
    }

    const videoElement = document.querySelector(this.selectors.videoPreview) as HTMLVideoElement;
    if (videoElement?.currentSrc && this.isFlowSignedVideoUrl(videoElement.currentSrc)) {
      return { success: true, url: videoElement.currentSrc };
    }

    if (videoElement?.src && this.isFlowSignedVideoUrl(videoElement.src)) {
      return { success: true, url: videoElement.src };
    }

    return { success: false };
  }

  /**
   * Cancel ongoing generation
   */
  private async cancelGeneration(): Promise<{ success: boolean }> {
    const cancelButton = document.querySelector(this.selectors.cancelButton);
    
    if (cancelButton) {
      await this.clickElement(cancelButton);
      this.state.isProcessing = false;
      this.state.currentJobId = null;
      return { success: true };
    }

    return { success: false };
  }

  /**
   * Get current credits information
   */
  private getCreditsInfo(): { credits: number; total: number } | null {
    const creditsElement = document.querySelector(this.selectors.creditsDisplay);
    
    if (creditsElement) {
      const text = creditsElement.textContent || '';
      const match = text.match(/(\d+)\s*\/\s*(\d+)/);
      
      if (match) {
        return {
          credits: parseInt(match[1], 10),
          total: parseInt(match[2], 10),
        };
      }
    }

    return null;
  }
}

// Initialize controller
const flowController = new FlowController();

// Export for potential direct access
(window as any).__flowController = flowController;

export default FlowController;
