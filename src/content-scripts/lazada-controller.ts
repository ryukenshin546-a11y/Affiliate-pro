/**
 * Lazada Controller - Content Script
 * Scrapes product information and manages affiliate links
 */

import { LAZADA_SELECTORS } from '@/config/constants';
import { logger } from '@/utils/logger.util';

interface ScrapedProduct {
  name: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  currency: string;
  imageUrl: string;
  images: string[];
  description: string;
  category: string;
  seller: {
    name: string;
    rating?: number;
    positiveRating?: number;
  };
  rating: number;
  reviews: number;
  url: string;
  productId: string;
  skuId?: string;
}

class LazadaController {
  private selectors = LAZADA_SELECTORS;

  constructor() {
    this.initMessageListener();
    logger.info('LazadaController initialized');
  }

  /**
   * Initialize message listener
   */
  private initMessageListener(): void {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      logger.debug('LazadaController received message:', message);

      switch (message.type) {
        case 'SCRAPE_PRODUCT':
          this.scrapeCurrentProduct()
            .then(sendResponse)
            .catch((error) => sendResponse({ success: false, error: error.message }));
          return true;

        case 'GET_AFFILIATE_LINK':
          this.getAffiliateLink()
            .then(sendResponse)
            .catch((error) => sendResponse({ success: false, error: error.message }));
          return true;

        case 'SCRAPE_CATEGORY':
          this.scrapeCategoryProducts(message.payload?.limit || 20)
            .then(sendResponse)
            .catch((error) => sendResponse({ success: false, error: error.message }));
          return true;

        default:
          sendResponse({ success: false, error: 'Unknown action' });
      }
    });
  }

  /**
   * Wait for element with timeout
   */
  private async waitForElement(selector: string, timeout = 10000): Promise<Element | null> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      let element: Element | null = null;
      try {
        element = document.querySelector(selector);
      } catch (error) {
        logger.warn('Invalid selector in LazadaController', { selector, error });
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
   * Extract text content safely
   */
  private getText(selector: string, parent?: Element): string {
    const el = (parent || document).querySelector(selector);
    return el?.textContent?.trim() || '';
  }

  /**
   * Extract number from text
   */
  private extractNumber(text: string): number {
    const cleaned = text.replace(/[^\d.]/g, '');
    return parseFloat(cleaned) || 0;
  }

  /**
   * Parse price from Lazada format (e.g., "฿1,299.00")
   */
  private parsePrice(priceText: string): { price: number; currency: string } {
    const currencyMatch = priceText.match(/^([฿$€])/);
    const currency = currencyMatch ? (currencyMatch[1] === '฿' ? 'THB' : 'USD') : 'THB';
    const price = this.extractNumber(priceText);
    return { price, currency };
  }

  /**
   * Extract product ID from URL
   */
  private extractProductId(): string {
    const urlMatch = window.location.pathname.match(/-i(\d+)/);
    return urlMatch?.[1] || '';
  }

  /**
   * Scrape product from current page
   */
  async scrapeCurrentProduct(): Promise<{ success: boolean; data?: ScrapedProduct; error?: string }> {
    try {
      // Wait for product page to load
      await this.waitForElement(this.selectors.productName, 15000);

      // Product ID from URL
      const productId = this.extractProductId();

      // Product name
      const name = this.getText(this.selectors.productName);
      if (!name) {
        throw new Error('Could not find product name');
      }

      // Price
      const priceText = this.getText(this.selectors.price);
      const { price, currency } = this.parsePrice(priceText);

      // Original price
      const originalPriceText = this.getText(this.selectors.originalPrice);
      const originalPrice = originalPriceText ? this.extractNumber(originalPriceText) : undefined;

      // Discount
      const discountText = this.getText(this.selectors.discount);
      const discount = discountText ? this.extractNumber(discountText) : undefined;

      // Main image
      const imageEl = document.querySelector(this.selectors.mainImage) as HTMLImageElement;
      const imageUrl = imageEl?.src || '';

      // All images from gallery
      const imageElements = document.querySelectorAll(this.selectors.thumbnailImages);
      const images = Array.from(imageElements)
        .map((img) => {
          const src = (img as HTMLImageElement).src || img.getAttribute('data-src') || '';
          // Convert thumbnail URL to full size
          return src.replace(/_80x80\./g, '_720x720.');
        })
        .filter(Boolean);

      // Description
      const descriptionEl = document.querySelector(this.selectors.description);
      const description = descriptionEl?.innerHTML
        ?.replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim() || '';

      // Category from breadcrumb
      const breadcrumbElements = document.querySelectorAll(this.selectors.breadcrumb);
      const category = Array.from(breadcrumbElements)
        .map((el) => el.textContent?.trim())
        .filter(Boolean)
        .join(' > ');

      // Seller info
      const sellerName = this.getText(this.selectors.sellerName);
      const sellerRatingText = this.getText(this.selectors.sellerRating);
      const sellerRating = this.extractNumber(sellerRatingText);
      const positiveRatingText = this.getText(this.selectors.sellerPositiveRating);
      const positiveRating = this.extractNumber(positiveRatingText);

      // Product rating
      const ratingText = this.getText(this.selectors.rating);
      const rating = this.extractNumber(ratingText);

      // Reviews count
      const reviewsText = this.getText(this.selectors.reviewCount);
      const reviews = this.extractNumber(reviewsText.replace(/[^\d]/g, ''));

      const product: ScrapedProduct = {
        name,
        price,
        originalPrice,
        discount,
        currency,
        imageUrl,
        images,
        description,
        category,
        seller: {
          name: sellerName,
          rating: sellerRating,
          positiveRating,
        },
        rating,
        reviews,
        url: window.location.href,
        productId,
      };

      logger.info('Scraped Lazada product:', product.name);

      return { success: true, data: product };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Lazada scraping failed:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Get affiliate link for current product
   */
  async getAffiliateLink(): Promise<{ success: boolean; link?: string; error?: string }> {
    try {
      // Try to find affiliate button (Lazada affiliate program integration)
      const affiliateButton = await this.waitForElement(this.selectors.affiliateButton, 3000);
      
      if (affiliateButton) {
        (affiliateButton as HTMLElement).click();
        await this.sleep(1000);

        const linkInput = await this.waitForElement(this.selectors.affiliateLinkInput, 3000);
        if (linkInput) {
          const link = (linkInput as HTMLInputElement).value;
          return { success: true, link };
        }
      }

      // Fallback: Generate affiliate link format
      const productId = this.extractProductId();
      if (productId) {
        const affiliateLink = `https://s.lazada.co.th/s.${productId}`;
        return { success: true, link: affiliateLink };
      }

      return { success: false, error: 'Could not generate affiliate link' };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Scrape products from category/search page
   */
  async scrapeCategoryProducts(limit: number): Promise<{ success: boolean; products?: Partial<ScrapedProduct>[]; error?: string }> {
    try {
      const products: Partial<ScrapedProduct>[] = [];
      const productCards = document.querySelectorAll(this.selectors.productCard);

      for (let i = 0; i < Math.min(productCards.length, limit); i++) {
        const card = productCards[i];

        const nameEl = card.querySelector(this.selectors.cardProductName);
        const priceEl = card.querySelector(this.selectors.cardPrice);
        const originalPriceEl = card.querySelector(this.selectors.cardOriginalPrice);
        const imageEl = card.querySelector(this.selectors.cardImage) as HTMLImageElement;
        const ratingEl = card.querySelector(this.selectors.cardRating);
        const reviewsEl = card.querySelector(this.selectors.cardReviews);
        const linkEl = card.querySelector('a') as HTMLAnchorElement;

        const priceText = priceEl?.textContent || '';
        const { price, currency } = this.parsePrice(priceText);

        products.push({
          name: nameEl?.textContent?.trim() || '',
          price,
          originalPrice: originalPriceEl ? this.extractNumber(originalPriceEl.textContent || '') : undefined,
          currency,
          imageUrl: imageEl?.src || imageEl?.getAttribute('data-src') || '',
          rating: ratingEl ? this.extractNumber(ratingEl.textContent || '') : 0,
          reviews: reviewsEl ? this.extractNumber(reviewsEl.textContent || '') : 0,
          url: linkEl?.href || '',
        });
      }

      return { success: true, products };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }
}

// Initialize controller
const lazadaController = new LazadaController();

// Export for direct access
(window as any).__lazadaController = lazadaController;

export default LazadaController;
