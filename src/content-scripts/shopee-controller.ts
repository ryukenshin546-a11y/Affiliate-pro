/**
 * Shopee Controller - Content Script
 * Scrapes product information and manages affiliate links
 */

import { SHOPEE_SELECTORS } from '@/config/constants';
import { logger } from '@/utils/logger.util';
import type { ProductInfo } from '@/types';

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
    rating: number;
    responseRate?: number;
  };
  rating: number;
  reviews: number;
  sold: number;
  stock?: number;
  specifications?: Record<string, string>;
  url: string;
  productId: string;
  shopId: string;
}

class ShopeeController {
  private selectors = SHOPEE_SELECTORS;

  constructor() {
    this.initMessageListener();
    logger.info('ShopeeController initialized');
  }

  /**
   * Initialize message listener
   */
  private initMessageListener(): void {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      logger.debug('ShopeeController received message:', message);

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
        logger.warn('Invalid selector in ShopeeController', { selector, error });
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
   * Parse price from Shopee format (e.g., "฿1,299")
   */
  private parsePrice(priceText: string): { price: number; currency: string } {
    const currencyMatch = priceText.match(/^([฿$€])/);
    const currency = currencyMatch ? (currencyMatch[1] === '฿' ? 'THB' : 'USD') : 'THB';
    const price = this.extractNumber(priceText);
    return { price, currency };
  }

  /**
   * Scrape product from current page
   */
  async scrapeCurrentProduct(): Promise<{ success: boolean; data?: ScrapedProduct; error?: string }> {
    try {
      // Wait for product page to load
      await this.waitForElement(this.selectors.productName, 15000);

      // Extract product ID and shop ID from URL
      const urlMatch = window.location.pathname.match(/i\.(\d+)\.(\d+)/);
      const productId = urlMatch?.[2] || '';
      const shopId = urlMatch?.[1] || '';

      // Product name
      const name = this.getText(this.selectors.productName);
      if (!name) {
        throw new Error('Could not find product name');
      }

      // Price
      const priceText = this.getText(this.selectors.price);
      const { price, currency } = this.parsePrice(priceText);

      // Original price (if discounted)
      const originalPriceText = this.getText(this.selectors.originalPrice);
      const originalPrice = originalPriceText ? this.extractNumber(originalPriceText) : undefined;

      // Discount percentage
      const discountText = this.getText(this.selectors.discount);
      const discount = discountText ? this.extractNumber(discountText) : undefined;

      // Main image
      const imageEl = document.querySelector(this.selectors.mainImage) as HTMLImageElement;
      const imageUrl = imageEl?.src || '';

      // All images
      const imageElements = document.querySelectorAll(this.selectors.thumbnailImages);
      const images = Array.from(imageElements).map((img) => (img as HTMLImageElement).src || img.getAttribute('data-src') || '').filter(Boolean);

      // Description
      const descriptionEl = document.querySelector(this.selectors.description);
      const description = descriptionEl?.textContent?.trim() || '';

      // Category
      const categoryElements = document.querySelectorAll(this.selectors.breadcrumb);
      const category = Array.from(categoryElements).map((el) => el.textContent?.trim()).filter(Boolean).join(' > ');

      // Seller info
      const sellerName = this.getText(this.selectors.sellerName);
      const sellerRatingText = this.getText(this.selectors.sellerRating);
      const sellerRating = this.extractNumber(sellerRatingText);
      const responseRateText = this.getText(this.selectors.sellerResponseRate);
      const responseRate = this.extractNumber(responseRateText);

      // Product rating
      const ratingText = this.getText(this.selectors.rating);
      const rating = this.extractNumber(ratingText);

      // Reviews count
      const reviewsText = this.getText(this.selectors.reviewCount);
      const reviews = this.extractNumber(reviewsText);

      // Sold count
      const soldText = this.getText(this.selectors.soldCount);
      const sold = this.extractNumber(soldText.replace(/[^\d]/g, ''));

      // Stock
      const stockText = this.getText(this.selectors.stock);
      const stock = stockText ? this.extractNumber(stockText) : undefined;

      // Specifications
      const specifications: Record<string, string> = {};
      const specRows = document.querySelectorAll(this.selectors.specifications);
      specRows.forEach((row) => {
        const label = row.querySelector('.label')?.textContent?.trim();
        const value = row.querySelector('.value')?.textContent?.trim();
        if (label && value) {
          specifications[label] = value;
        }
      });

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
          responseRate,
        },
        rating,
        reviews,
        sold,
        stock,
        specifications,
        url: window.location.href,
        productId,
        shopId,
      };

      logger.info('Scraped product:', product.name);

      return { success: true, data: product };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Scraping failed:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Get affiliate link for current product
   */
  async getAffiliateLink(): Promise<{ success: boolean; link?: string; error?: string }> {
    try {
      // Try to find affiliate button
      const affiliateButton = await this.waitForElement(this.selectors.affiliateButton, 5000);
      
      if (affiliateButton) {
        (affiliateButton as HTMLElement).click();
        await this.sleep(1000);

        // Wait for affiliate link to be generated
        const linkInput = await this.waitForElement(this.selectors.affiliateLinkInput, 5000);
        if (linkInput) {
          const link = (linkInput as HTMLInputElement).value;
          return { success: true, link };
        }
      }

      // Fallback: Generate affiliate link format
      const urlMatch = window.location.pathname.match(/i\.(\d+)\.(\d+)/);
      if (urlMatch) {
        const affiliateLink = `https://shope.ee/affiliate/${urlMatch[1]}/${urlMatch[2]}`;
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
        const imageEl = card.querySelector(this.selectors.cardImage) as HTMLImageElement;
        const soldEl = card.querySelector(this.selectors.cardSold);
        const ratingEl = card.querySelector(this.selectors.cardRating);
        const linkEl = card.querySelector('a');

        const priceText = priceEl?.textContent || '';
        const { price, currency } = this.parsePrice(priceText);

        products.push({
          name: nameEl?.textContent?.trim() || '',
          price,
          currency,
          imageUrl: imageEl?.src || imageEl?.getAttribute('data-src') || '',
          sold: soldEl ? this.extractNumber(soldEl.textContent || '') : 0,
          rating: ratingEl ? this.extractNumber(ratingEl.textContent || '') : 0,
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
const shopeeController = new ShopeeController();

// Export for direct access
(window as any).__shopeeController = shopeeController;

export default ShopeeController;
