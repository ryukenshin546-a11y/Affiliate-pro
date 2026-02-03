/**
 * Notification Handler
 * Manages Chrome notifications for the extension
 */

import { logger } from '@/utils/logger.util';

interface NotificationOptions {
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  iconUrl?: string;
  buttons?: { title: string }[];
  requireInteraction?: boolean;
  silent?: boolean;
}

export class NotificationHandler {
  private defaultIcon = 'icons/icon128.png';
  private notificationCallbacks = new Map<string, (buttonIndex?: number) => void>();

  constructor() {
    this.initClickListener();
    logger.info('NotificationHandler initialized');
  }

  /**
   * Initialize notification click listener
   */
  private initClickListener(): void {
    chrome.notifications.onClicked.addListener((notificationId) => {
      logger.debug('Notification clicked', { notificationId });
      
      const callback = this.notificationCallbacks.get(notificationId);
      if (callback) {
        callback();
        this.notificationCallbacks.delete(notificationId);
      }

      // Clear the notification
      chrome.notifications.clear(notificationId);
    });

    chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
      logger.debug('Notification button clicked', { notificationId, buttonIndex });
      
      const callback = this.notificationCallbacks.get(notificationId);
      if (callback) {
        callback(buttonIndex);
        this.notificationCallbacks.delete(notificationId);
      }

      chrome.notifications.clear(notificationId);
    });

    chrome.notifications.onClosed.addListener((notificationId) => {
      this.notificationCallbacks.delete(notificationId);
    });
  }

  /**
   * Show a notification
   */
  async show(options: NotificationOptions): Promise<string> {
    const notificationId = `flow_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    const iconMap: Record<string, string> = {
      info: 'icons/icon128.png',
      success: 'icons/icon128.png',
      warning: 'icons/icon128.png',
      error: 'icons/icon128.png',
    };

    const iconUrl = options.iconUrl ?? iconMap[options.type ?? 'info'] ?? this.defaultIcon;
    const notificationOptions: chrome.notifications.NotificationOptions<true> = {
      type: 'basic',
      iconUrl,
      title: options.title,
      message: options.message,
      priority: options.type === 'error' ? 2 : 1,
      requireInteraction: options.requireInteraction ?? false,
      silent: options.silent ?? false,
    };

    if (options.buttons) {
      notificationOptions.buttons = options.buttons;
    }

    try {
      await new Promise<string>((resolve, reject) => {
        chrome.notifications.create(notificationId, notificationOptions, (createdId) => {
          const err = chrome.runtime.lastError;
          if (err) {
            reject(new Error(err.message));
            return;
          }
          resolve(createdId);
        });
      });
      logger.debug('Notification shown:', notificationId);
      return notificationId;
    } catch (error) {
      logger.error('Failed to show notification:', error);
      throw error;
    }
  }

  /**
   * Show notification with callback
   */
  async showWithCallback(
    options: NotificationOptions, 
    callback: (buttonIndex?: number) => void
  ): Promise<string> {
    const notificationId = await this.show(options);
    this.notificationCallbacks.set(notificationId, callback);
    return notificationId;
  }

  /**
   * Show video complete notification
   */
  async showVideoComplete(productName: string, videoUrl?: string): Promise<string> {
    return this.show({
      title: 'Video Complete! 🎬',
      message: `"${productName}" video is ready for download.`,
      type: 'success',
      buttons: videoUrl ? [
        { title: 'Download' },
        { title: 'View' },
      ] : undefined,
    });
  }

  /**
   * Show error notification
   */
  async showError(title: string, message: string): Promise<string> {
    return this.show({
      title,
      message,
      type: 'error',
      requireInteraction: true,
    });
  }

  /**
   * Show viral alert notification
   */
  async showViralAlert(videoTitle: string, views: number): Promise<string> {
    return this.show({
      title: '🔥 Viral Alert!',
      message: `"${videoTitle}" has reached ${views.toLocaleString()} views!`,
      type: 'success',
      requireInteraction: true,
    });
  }

  /**
   * Show low credits warning
   */
  async showLowCreditsWarning(remaining: number, total: number): Promise<string> {
    return this.show({
      title: '⚠️ Low Credits',
      message: `You have ${remaining} out of ${total} credits remaining. Consider upgrading your plan.`,
      type: 'warning',
      requireInteraction: true,
      buttons: [
        { title: 'Upgrade Now' },
        { title: 'Dismiss' },
      ],
    });
  }

  /**
   * Show queue status notification
   */
  async showQueueStatus(completed: number, total: number): Promise<string> {
    return this.show({
      title: 'Queue Progress',
      message: `${completed} of ${total} videos completed.`,
      type: 'info',
    });
  }

  /**
   * Clear a specific notification
   */
  async clear(notificationId: string): Promise<void> {
    try {
      await chrome.notifications.clear(notificationId);
      this.notificationCallbacks.delete(notificationId);
    } catch (error) {
      logger.error('Failed to clear notification:', error);
    }
  }

  /**
   * Clear all notifications
   */
  async clearAll(): Promise<void> {
    this.notificationCallbacks.clear();
    // Note: Chrome doesn't have a "clear all" API, 
    // would need to track all notification IDs
  }

  /**
   * Update badge with count
   */
  async updateBadge(count: number | null): Promise<void> {
    if (count === null || count === 0) {
      await chrome.action.setBadgeText({ text: '' });
    } else {
      await chrome.action.setBadgeText({ text: count.toString() });
      await chrome.action.setBadgeBackgroundColor({ color: '#6366F1' });
    }
  }

  /**
   * Set badge to processing state
   */
  async setBadgeProcessing(): Promise<void> {
    await chrome.action.setBadgeText({ text: '...' });
    await chrome.action.setBadgeBackgroundColor({ color: '#F59E0B' });
  }

  /**
   * Set badge to error state
   */
  async setBadgeError(): Promise<void> {
    await chrome.action.setBadgeText({ text: '!' });
    await chrome.action.setBadgeBackgroundColor({ color: '#EF4444' });
  }
}
