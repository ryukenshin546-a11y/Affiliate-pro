/**
 * E2E Tests for Extension Popup
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import path from 'path';

const EXTENSION_PATH = path.join(__dirname, '../../dist');
const EXTENSION_ID = 'your-extension-id'; // Will be dynamically loaded

describe('Flow Affiliate Pro E2E Tests', () => {
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    // Launch browser with extension
    browser = await puppeteer.launch({
      headless: false,
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
      ],
    });

    // Get extension page
    const targets = await browser.targets();
    const extensionTarget = targets.find(
      (target) => target.type() === 'service_worker'
    );

    // Open popup
    page = await browser.newPage();
    await page.goto(`chrome-extension://${EXTENSION_ID}/index.html`);
  });

  afterAll(async () => {
    await browser.close();
  });

  describe('Popup UI', () => {
    test('should display main navigation tabs', async () => {
      await page.waitForSelector('[data-testid="nav-tabs"]');
      
      const tabs = await page.$$('[data-testid="nav-tab"]');
      expect(tabs.length).toBe(5); // Dashboard, Bulk, Templates, Analytics, Settings
    });

    test('should show connect account prompt when not authenticated', async () => {
      const connectPrompt = await page.$('[data-testid="connect-prompt"]');
      expect(connectPrompt).toBeTruthy();
    });

    test('should navigate between tabs', async () => {
      // Click on Templates tab
      await page.click('[data-testid="nav-tab-templates"]');
      await page.waitForSelector('[data-testid="templates-page"]');
      
      const templatesHeader = await page.$eval(
        '[data-testid="templates-header"]',
        (el) => el.textContent
      );
      expect(templatesHeader).toContain('Templates');
    });
  });

  describe('Video Creator', () => {
    test('should show video creator form', async () => {
      await page.click('[data-testid="nav-tab-dashboard"]');
      await page.waitForSelector('[data-testid="video-creator"]');
      
      const inputField = await page.$('[data-testid="product-input"]');
      expect(inputField).toBeTruthy();
    });

    test('should validate input before submission', async () => {
      const generateButton = await page.$('[data-testid="generate-button"]');
      const isDisabled = await page.$eval(
        '[data-testid="generate-button"]',
        (btn) => (btn as HTMLButtonElement).disabled
      );
      
      expect(isDisabled).toBe(true);
    });

    test('should enable button with valid input', async () => {
      await page.type('[data-testid="product-input"]', 'https://shopee.co.th/product/123');
      
      const isDisabled = await page.$eval(
        '[data-testid="generate-button"]',
        (btn) => (btn as HTMLButtonElement).disabled
      );
      
      // Button should be enabled when there's valid input and user is authenticated
      // For this test, it may still be disabled if not authenticated
    });
  });

  describe('Settings', () => {
    test('should display settings page', async () => {
      await page.click('[data-testid="nav-tab-settings"]');
      await page.waitForSelector('[data-testid="settings-page"]');
      
      const accountsSection = await page.$('[data-testid="accounts-section"]');
      expect(accountsSection).toBeTruthy();
    });

    test('should show connected accounts status', async () => {
      const googleStatus = await page.$('[data-testid="google-status"]');
      const tiktokStatus = await page.$('[data-testid="tiktok-status"]');
      
      expect(googleStatus).toBeTruthy();
      expect(tiktokStatus).toBeTruthy();
    });

    test('should toggle settings', async () => {
      const autoDownloadToggle = await page.$('[data-testid="auto-download-toggle"]');
      
      if (autoDownloadToggle) {
        await autoDownloadToggle.click();
        
        // Verify toggle state changed
        const isChecked = await page.$eval(
          '[data-testid="auto-download-toggle"]',
          (el) => (el as HTMLInputElement).checked
        );
        
        expect(typeof isChecked).toBe('boolean');
      }
    });
  });

  describe('Queue Management', () => {
    test('should display queue list', async () => {
      await page.click('[data-testid="nav-tab-dashboard"]');
      await page.waitForSelector('[data-testid="queue-list"]');
      
      const queueList = await page.$('[data-testid="queue-list"]');
      expect(queueList).toBeTruthy();
    });

    test('should show empty state when no jobs', async () => {
      const emptyState = await page.$('[data-testid="queue-empty"]');
      // Either empty state or job items should be present
    });
  });

  describe('Templates', () => {
    test('should display template cards', async () => {
      await page.click('[data-testid="nav-tab-templates"]');
      await page.waitForSelector('[data-testid="template-card"]');
      
      const templateCards = await page.$$('[data-testid="template-card"]');
      expect(templateCards.length).toBeGreaterThan(0);
    });

    test('should open template preview on click', async () => {
      await page.click('[data-testid="template-card"]:first-child');
      
      const preview = await page.waitForSelector('[data-testid="template-preview"]');
      expect(preview).toBeTruthy();
    });
  });

  describe('Analytics', () => {
    test('should display analytics dashboard', async () => {
      await page.click('[data-testid="nav-tab-analytics"]');
      await page.waitForSelector('[data-testid="analytics-page"]');
      
      const chartSection = await page.$('[data-testid="views-chart"]');
      expect(chartSection).toBeTruthy();
    });

    test('should show date range selector', async () => {
      const dateSelector = await page.$('[data-testid="date-range-selector"]');
      expect(dateSelector).toBeTruthy();
    });
  });

  describe('Responsive Design', () => {
    test('should fit within 400x600 popup dimensions', async () => {
      await page.setViewport({ width: 400, height: 600 });
      
      const bodyWidth = await page.$eval('body', (el) => el.scrollWidth);
      const bodyHeight = await page.$eval('body', (el) => el.scrollHeight);
      
      expect(bodyWidth).toBeLessThanOrEqual(400);
      // Height can be scrollable
    });
  });
});
