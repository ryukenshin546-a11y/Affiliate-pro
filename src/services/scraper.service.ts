import type { ScrapedProduct, ProductInfo } from '@/types';
import { detectPlatform, isValidUrl } from '@/utils/validator.util';
import { createLogger } from '@/utils/logger.util';

const logger = createLogger('ScraperService');

class ScraperService {
  /**
   * Scrape product information from URL
   */
  async scrapeProduct(url: string): Promise<ScrapedProduct> {
    if (!isValidUrl(url)) {
      return { success: false, platform: 'unknown', error: 'Invalid URL' };
    }

    const platform = detectPlatform(url);
    logger.info('Scraping product', { url, platform });

    try {
      switch (platform) {
        case 'shopee':
          return await this.scrapeShopee(url);
        case 'lazada':
          return await this.scrapeLazada(url);
        case 'tiktok':
          return await this.scrapeTikTok(url);
        default:
          return { success: false, platform: 'unknown', error: 'Unsupported platform' };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Scraping failed', { url, error: message });
      return { success: false, platform, error: message };
    }
  }

  /**
   * Scrape Shopee product page via content script
   */
  private async scrapeShopee(url: string): Promise<ScrapedProduct> {
    // This will be executed via content script messaging
    // For now, return a placeholder that triggers content script
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { type: 'SCRAPE_PRODUCT', payload: { url, platform: 'shopee' } },
        (response) => {
          if (chrome.runtime.lastError) {
            resolve({
              success: false,
              platform: 'shopee',
              error: chrome.runtime.lastError.message,
            });
          } else {
            resolve(response);
          }
        }
      );
    });
  }

  /**
   * Scrape Lazada product page via content script
   */
  private async scrapeLazada(url: string): Promise<ScrapedProduct> {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { type: 'SCRAPE_PRODUCT', payload: { url, platform: 'lazada' } },
        (response) => {
          if (chrome.runtime.lastError) {
            resolve({
              success: false,
              platform: 'lazada',
              error: chrome.runtime.lastError.message,
            });
          } else {
            resolve(response);
          }
        }
      );
    });
  }

  /**
   * Scrape TikTok Shop product
   */
  private async scrapeTikTok(url: string): Promise<ScrapedProduct> {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { type: 'SCRAPE_PRODUCT', payload: { url, platform: 'tiktok' } },
        (response) => {
          if (chrome.runtime.lastError) {
            resolve({
              success: false,
              platform: 'tiktok',
              error: chrome.runtime.lastError.message,
            });
          } else {
            resolve(response);
          }
        }
      );
    });
  }

  /**
   * Parse scraped data into ProductInfo
   */
  parseToProductInfo(scraped: ScrapedProduct): ProductInfo | null {
    if (!scraped.success || !scraped.data) {
      return null;
    }

    return {
      name: scraped.data.name,
      url: scraped.data.url,
      price: scraped.data.price,
      currency: scraped.data.currency || 'THB',
      imageUrl: scraped.data.imageUrl,
      description: scraped.data.description,
      category: scraped.data.category,
      seller: scraped.data.seller,
      rating: scraped.data.rating,
      reviews: scraped.data.reviews,
    };
  }

  /**
   * Extract basic product info from URL (fallback)
   */
  extractBasicInfo(url: string): Partial<ProductInfo> {
    const platform = detectPlatform(url);
    
    // Try to extract product name from URL
    let name = 'Unknown Product';
    
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      
      // Extract name from URL slug
      const segments = pathname.split('/').filter(Boolean);
      const productSegment = segments.find(s => 
        !s.match(/^(product|item|i\.\d+)/) && s.length > 3
      );
      
      if (productSegment) {
        name = productSegment
          .replace(/-/g, ' ')
          .replace(/\.\d+$/, '')
          .split(' ')
          .map(w => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');
      }
    } catch {
      // Ignore URL parsing errors
    }

    return {
      name,
      url,
      currency: 'THB',
    };
  }
}

// Singleton instance
export const scraperService = new ScraperService();
