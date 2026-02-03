/**
 * Unit Tests for Utility Functions
 */

import { isValidProductUrl, detectPlatform, isValidEmail } from '@/utils/validator.util';
import { sanitizeFilename, slugify, formatNumber, formatCurrency } from '@/utils/slugify.util';
import { generateId, generateJobId, generateSessionId } from '@/utils/crypto.util';

describe('Validator Utils', () => {
  describe('isValidProductUrl', () => {
    test('should validate Shopee URLs', () => {
      expect(isValidProductUrl('https://shopee.co.th/product/123')).toBe(true);
      expect(isValidProductUrl('https://shopee.co.th/shop/product-name-i.123.456')).toBe(true);
    });

    test('should validate Lazada URLs', () => {
      expect(isValidProductUrl('https://lazada.co.th/products/test-i123456.html')).toBe(true);
      expect(isValidProductUrl('https://www.lazada.co.th/products/name-i789.html')).toBe(true);
    });

    test('should validate TikTok URLs', () => {
      expect(isValidProductUrl('https://www.tiktok.com/@shop/video/123')).toBe(true);
    });

    test('should reject invalid URLs', () => {
      expect(isValidProductUrl('not-a-url')).toBe(false);
      expect(isValidProductUrl('https://google.com')).toBe(false);
      expect(isValidProductUrl('')).toBe(false);
    });
  });

  describe('detectPlatform', () => {
    test('should detect Shopee', () => {
      expect(detectPlatform('https://shopee.co.th/product')).toBe('shopee');
    });

    test('should detect Lazada', () => {
      expect(detectPlatform('https://lazada.co.th/products')).toBe('lazada');
    });

    test('should detect TikTok', () => {
      expect(detectPlatform('https://tiktok.com/shop')).toBe('tiktok');
    });

    test('should return unknown for unknown', () => {
      expect(detectPlatform('https://example.com')).toBe('unknown');
    });
  });

  describe('isValidEmail', () => {
    test('should validate correct emails', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.co.th')).toBe(true);
    });

    test('should reject invalid emails', () => {
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('no@domain')).toBe(false);
      expect(isValidEmail('')).toBe(false);
    });
  });
});

describe('Slugify Utils', () => {
  describe('sanitizeFilename', () => {
    test('should remove invalid characters', () => {
      expect(sanitizeFilename('test<>file:name.mp4')).toBe('testfilename.mp4');
    });

    test('should replace spaces with underscores', () => {
      expect(sanitizeFilename('my video file.mp4')).toBe('my_video_file.mp4');
    });

    test('should truncate long filenames', () => {
      const longName = 'a'.repeat(300) + '.mp4';
      const result = sanitizeFilename(longName);
      expect(result.length).toBeLessThanOrEqual(255);
    });
  });

  describe('slugify', () => {
    test('should create URL-safe slugs', () => {
      expect(slugify('Hello World')).toBe('hello-world');
      expect(slugify('Test Product 123')).toBe('test-product-123');
    });

    test('should handle Thai characters', () => {
      const result = slugify('สินค้า Test');
      expect(result).not.toContain(' ');
    });
  });

  describe('formatNumber', () => {
    test('should format numbers with commas', () => {
      expect(formatNumber(1000)).toBe('1,000');
      expect(formatNumber(1234567)).toBe('1,234,567');
    });

    test('should handle K/M suffixes', () => {
      expect(formatNumber(1500, true)).toBe('1.5K');
      expect(formatNumber(1500000, true)).toBe('1.5M');
    });
  });

  describe('formatCurrency', () => {
    test('should format THB currency', () => {
      expect(formatCurrency(1000)).toBe('฿1,000');
      expect(formatCurrency(1000, 'THB')).toBe('฿1,000');
    });

    test('should format USD currency', () => {
      expect(formatCurrency(1000, 'USD')).toBe('$1,000');
    });
  });
});

describe('Crypto Utils', () => {
  describe('generateId', () => {
    test('should generate unique IDs', () => {
      const id1 = generateId();
      const id2 = generateId();
      expect(id1).not.toBe(id2);
    });

    test('should generate IDs of correct length', () => {
      const id = generateId(16);
      expect(id.length).toBe(16);
    });
  });

  describe('generateJobId', () => {
    test('should generate job IDs with prefix', () => {
      const jobId = generateJobId();
      expect(jobId).toMatch(/^job_/);
    });
  });

  describe('generateSessionId', () => {
    test('should generate session IDs with prefix', () => {
      const sessionId = generateSessionId();
      expect(sessionId).toMatch(/^session_/);
    });
  });
});
