/**
 * Background Service Worker
 * Main background script for Flow Affiliate Pro extension
 */

import { logger } from '@/utils/logger.util';
import { QueueProcessor } from './queue-processor';
import { DownloadManager } from './download-manager';
import { NotificationHandler } from './notification-handler';
import { AuthHandler } from './auth-handler';

// Initialize handlers
const queueProcessor = new QueueProcessor();
const downloadManager = new DownloadManager();
const notificationHandler = new NotificationHandler();
const authHandler = new AuthHandler();

// Best-effort Side Panel setup on every service worker start.
setupSidePanel().catch((error) => {
  logger.warn('Side panel setup failed', {
    error: error instanceof Error ? error.message : String(error),
  });
});

// Extension installation/update handler
chrome.runtime.onInstalled.addListener((details) => {
  logger.info('Extension installed/updated', { reason: details.reason });

  setupSidePanel().catch((error) => {
    logger.warn('Side panel setup failed', {
      error: error instanceof Error ? error.message : String(error),
    });
  });

  if (details.reason === 'install') {
    // First-time installation
    initializeDefaultSettings();
    showWelcomeNotification();
  } else if (details.reason === 'update') {
    // Extension updated
    logger.info('Updated from version:', details.previousVersion);
    migrateSettingsIfNeeded(details.previousVersion || '0.0.0');
  }
});

chrome.action.onClicked.addListener((tab) => {
  if (!tab.id) return;

  if (!chrome.sidePanel) {
    logger.warn('Side Panel API is not available in this Chrome version');
    return;
  }

  ensureSidePanelForTab(tab.id)
    .finally(() => chrome.sidePanel.open({ tabId: tab.id! }))
    .catch((error) => {
      logger.warn('Failed to open side panel', {
        error: error instanceof Error ? error.message : String(error),
      });
    });
});

chrome.tabs.onActivated.addListener(({ tabId }) => {
  ensureSidePanelForTab(tabId).catch(() => undefined);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'complete') {
    ensureSidePanelForTab(tabId).catch(() => undefined);
  }
});

async function setupSidePanel(): Promise<void> {
  // Some Chrome versions may not support the Side Panel API.
  if (!chrome.sidePanel) return;

  // Prefer opening Side Panel when the user clicks the extension icon.
  // (In Chrome versions that support it.)
  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

  // Best effort: enable the panel and set its path.
  // Some versions require per-tab options; ignore failures.
  try {
    await chrome.sidePanel.setOptions({
      enabled: true,
      path: 'src/sidepanel/index.html',
    });
  } catch {
    // no-op
  }
}

async function ensureSidePanelForTab(tabId: number): Promise<void> {
  if (!chrome.sidePanel) return;

  try {
    await chrome.sidePanel.setOptions({
      tabId,
      enabled: true,
      path: 'src/sidepanel/index.html',
    });
  } catch {
    // no-op
  }
}

// Startup handler
chrome.runtime.onStartup.addListener(() => {
  logger.info('Extension startup');
  setupSidePanel().catch((error) => {
    logger.warn('Side panel setup failed', {
      error: error instanceof Error ? error.message : String(error),
    });
  });
  queueProcessor.resumeProcessing();
});

// Message handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  logger.debug('Background received message:', message.type);

  handleMessage(message, sender)
    .then(sendResponse)
    .catch((error) => {
      logger.error('Message handling error:', error);
      sendResponse({ success: false, error: error.message });
    });

  return true; // Keep channel open for async response
});

/**
 * Handle incoming messages
 */
async function handleMessage(message: any, sender: chrome.runtime.MessageSender): Promise<any> {
  switch (message.type) {
    // === Auth Messages ===
    case 'AUTH_GOOGLE':
      return authHandler.authenticateGoogle();

    case 'AUTH_TIKTOK':
      return authHandler.authenticateTikTok();

    case 'AUTH_SHOPEE':
      return authHandler.authenticateShopee();

    case 'AUTH_LAZADA':
      return authHandler.authenticateLazada();

    case 'REFRESH_GOOGLE_CREDITS':
      return authHandler.refreshGoogleCredits();

    // === Video Creation Messages ===
    case 'CREATE_VIDEO':
      return queueProcessor.processJob(message.payload.jobId);

    case 'START_BATCH_PROCESSING':
      return queueProcessor.startBatchProcessing();

    case 'PAUSE_PROCESSING':
      return queueProcessor.pauseProcessing();

    case 'RESUME_PROCESSING':
      return queueProcessor.resumeProcessing();

    case 'CANCEL_JOB':
      return queueProcessor.cancelJob(message.payload.jobId);

    // === Video Completion Messages (from content scripts) ===
    case 'VIDEO_CREATED':
      return handleVideoCreated(message.payload);

    case 'VIDEO_FAILED':
      return handleVideoFailed(message.payload);

    case 'VIDEO_POSTED':
      return handleVideoPosted(message.payload);

    case 'POST_FAILED':
      return handlePostFailed(message.payload);

    // === Download Messages ===
    case 'DOWNLOAD_VIDEO':
      return downloadManager.downloadVideo(message.payload);

    case 'BATCH_DOWNLOAD':
      return downloadManager.batchDownload(message.payload.videos);

    // === Notification Messages ===
    case 'SHOW_NOTIFICATION':
      return notificationHandler.show(message.payload);

    // === Scraping Messages ===
    case 'SCRAPE_PRODUCT':
      return forwardToContentScript(sender.tab?.id, message);

    // === Settings Messages ===
    case 'GET_SETTINGS':
      return getSettings();

    case 'UPDATE_SETTINGS':
      return updateSettings(message.payload);

    // === Stats Messages ===
    case 'GET_STATS':
      return getStats();

    default:
      throw new Error(`Unknown message type: ${message.type}`);
  }
}

/**
 * Forward message to content script
 */
async function forwardToContentScript(tabId: number | undefined, message: any): Promise<any> {
  if (!tabId) {
    throw new Error('No tab ID provided');
  }

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
 * Handle video created event
 */
async function handleVideoCreated(payload: { jobId: string; videoUrl: string }): Promise<void> {
  logger.info('Video created:', payload.jobId);

  // Update job status in storage
  await updateJobStatus(payload.jobId, 'completed', { videoUrl: payload.videoUrl });

  // Get settings for auto-actions
  const settings = await getSettings();

  // Auto-download if enabled
  if (settings.automation?.autoDownload) {
    await downloadManager.downloadVideo({
      url: payload.videoUrl,
      filename: `video_${payload.jobId}.mp4`,
    });
  }

  // Auto-post if enabled
  if (settings.automation?.autoPost) {
    const job = await getJob(payload.jobId);
    if (job?.platforms?.length > 0) {
      for (const platform of job.platforms) {
        await queueProcessor.postToplatform(payload.jobId, platform, payload.videoUrl);
      }
    }
  }

  // Show notification
  if (settings.notifications?.onComplete) {
    notificationHandler.show({
      title: 'Video Complete! 🎬',
      message: `Your video has been generated successfully.`,
      type: 'success',
    });
  }

  // Update daily count
  await incrementDailyCount();
}

/**
 * Handle video failed event
 */
async function handleVideoFailed(payload: { jobId: string; error: string }): Promise<void> {
  logger.error('Video failed:', payload.jobId, payload.error);

  await updateJobStatus(payload.jobId, 'failed', { error: payload.error });

  const settings = await getSettings();
  
  // Show error notification
  if (settings.notifications?.onFailed) {
    notificationHandler.show({
      title: 'Video Failed ❌',
      message: payload.error,
      type: 'error',
    });
  }

  // Auto-retry if enabled
  if (settings.automation?.retryFailedCount > 0) {
    const job = await getJob(payload.jobId);
    if (job && (job.retryCount || 0) < settings.automation.retryFailedCount) {
      await queueProcessor.retryJob(payload.jobId);
    }
  }
}

/**
 * Handle video posted event
 */
async function handleVideoPosted(payload: { jobId: string; platform: string; postId: string }): Promise<void> {
  logger.info('Video posted:', payload);

  await updateJobPost(payload.jobId, payload.platform, payload.postId);

  notificationHandler.show({
    title: 'Posted! 🎉',
    message: `Video posted to ${payload.platform}`,
    type: 'success',
  });
}

/**
 * Handle post failed event
 */
async function handlePostFailed(payload: { jobId: string; platform: string; error: string }): Promise<void> {
  logger.error('Post failed:', payload);

  notificationHandler.show({
    title: 'Post Failed',
    message: `Failed to post to ${payload.platform}: ${payload.error}`,
    type: 'error',
  });
}

/**
 * Initialize default settings
 */
async function initializeDefaultSettings(): Promise<void> {
  const defaultSettings = {
    videoDefaults: {
      resolution: '1080x1920',
      duration: 30,
      musicVolume: 50,
      addWatermark: false,
    },
    automation: {
      autoDownload: true,
      autoPost: false,
      generateCaptions: true,
      addTrendingHashtags: true,
      maxConcurrentJobs: 2,
      retryFailedCount: 1,
    },
    notifications: {
      onComplete: true,
      onFailed: true,
      onViralAlert: true,
      lowCreditsWarning: true,
    },
    dailyCreated: 0,
    dailyLimit: 50,
    lastResetDate: new Date().toDateString(),
  };

  await chrome.storage.local.set({ settings: defaultSettings });
  logger.info('Default settings initialized');
}

/**
 * Show welcome notification
 */
function showWelcomeNotification(): void {
  notificationHandler.show({
    title: 'Welcome to Flow Affiliate Pro! 🚀',
    message: 'Start creating AI videos for your affiliate products.',
    type: 'info',
  });
}

/**
 * Migrate settings if needed
 */
async function migrateSettingsIfNeeded(previousVersion: string): Promise<void> {
  // Add migration logic for future versions
  logger.info('Settings migration check for version:', previousVersion);
}

/**
 * Get settings from storage
 */
async function getSettings(): Promise<any> {
  const result = await chrome.storage.local.get('settings');
  return result.settings || {};
}

/**
 * Update settings in storage
 */
async function updateSettings(newSettings: any): Promise<void> {
  const currentSettings = await getSettings();
  await chrome.storage.local.set({ settings: { ...currentSettings, ...newSettings } });
}

/**
 * Get job from storage
 */
async function getJob(jobId: string): Promise<any> {
  const result = await chrome.storage.local.get('jobs');
  const jobs = result.jobs || [];
  return jobs.find((j: any) => j.id === jobId);
}

/**
 * Update job status
 */
async function updateJobStatus(jobId: string, status: string, data?: any): Promise<void> {
  const result = await chrome.storage.local.get('jobs');
  const jobs = result.jobs || [];
  const jobIndex = jobs.findIndex((j: any) => j.id === jobId);
  
  if (jobIndex >= 0) {
    jobs[jobIndex] = { ...jobs[jobIndex], status, ...data, updatedAt: Date.now() };
    await chrome.storage.local.set({ jobs });
  }
}

/**
 * Update job post info
 */
async function updateJobPost(jobId: string, platform: string, postId: string): Promise<void> {
  const result = await chrome.storage.local.get('jobs');
  const jobs = result.jobs || [];
  const jobIndex = jobs.findIndex((j: any) => j.id === jobId);
  
  if (jobIndex >= 0) {
    const posts = jobs[jobIndex].posts || {};
    posts[platform] = { postId, postedAt: Date.now() };
    jobs[jobIndex].posts = posts;
    await chrome.storage.local.set({ jobs });
  }
}

/**
 * Increment daily count
 */
async function incrementDailyCount(): Promise<void> {
  const settings = await getSettings();
  const today = new Date().toDateString();

  if (settings.lastResetDate !== today) {
    // Reset daily count
    settings.dailyCreated = 1;
    settings.lastResetDate = today;
  } else {
    settings.dailyCreated = (settings.dailyCreated || 0) + 1;
  }

  await updateSettings(settings);

  // Check low credits warning
  if (settings.dailyCreated >= settings.dailyLimit * 0.8) {
    if (settings.notifications?.lowCreditsWarning) {
      notificationHandler.show({
        title: 'Daily Limit Warning',
        message: `You've used ${settings.dailyCreated}/${settings.dailyLimit} of your daily video quota.`,
        type: 'warning',
      });
    }
  }
}

/**
 * Get stats
 */
async function getStats(): Promise<any> {
  const result = await chrome.storage.local.get(['jobs', 'settings', 'analytics']);
  const jobs = result.jobs || [];
  const settings = result.settings || {};
  const analytics = result.analytics || {};

  return {
    total: jobs.length,
    completed: jobs.filter((j: any) => j.status === 'completed').length,
    pending: jobs.filter((j: any) => j.status === 'pending' || j.status === 'processing').length,
    failed: jobs.filter((j: any) => j.status === 'failed').length,
    dailyCreated: settings.dailyCreated || 0,
    dailyLimit: settings.dailyLimit || 50,
    totalViews: analytics.totalViews || 0,
    totalLikes: analytics.totalLikes || 0,
  };
}

// Alarm handler for scheduled tasks
chrome.alarms.onAlarm.addListener((alarm) => {
  logger.debug('Alarm triggered:', alarm.name);

  switch (alarm.name) {
    case 'processQueue':
      queueProcessor.processNextInQueue();
      break;
    case 'syncAnalytics':
      syncAnalytics();
      break;
    case 'resetDailyCount':
      resetDailyCount();
      break;
  }
});

// Create scheduled alarms
chrome.alarms.create('processQueue', { periodInMinutes: 1 });
chrome.alarms.create('syncAnalytics', { periodInMinutes: 30 });
chrome.alarms.create('resetDailyCount', { periodInMinutes: 60 });

/**
 * Sync analytics data
 */
async function syncAnalytics(): Promise<void> {
  // TODO: Implement analytics sync from TikTok, Shopee, Lazada
  logger.debug('Syncing analytics...');
}

/**
 * Reset daily count at midnight
 */
async function resetDailyCount(): Promise<void> {
  const settings = await getSettings();
  const today = new Date().toDateString();

  if (settings.lastResetDate !== today) {
    settings.dailyCreated = 0;
    settings.lastResetDate = today;
    await updateSettings(settings);
    logger.info('Daily count reset');
  }
}

logger.info('Background service worker initialized');
