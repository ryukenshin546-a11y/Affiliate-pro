import { URL_PATTERNS } from '@/config/constants';

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Detect platform from URL
 */
export function detectPlatform(url: string): 'shopee' | 'lazada' | 'tiktok' | 'unknown' {
  if (URL_PATTERNS.shopee.test(url)) return 'shopee';
  if (URL_PATTERNS.lazada.test(url)) return 'lazada';
  if (URL_PATTERNS.tiktok.test(url)) return 'tiktok';
  return 'unknown';
}

/**
 * Validate product URL
 */
export function isValidProductUrl(url: string): boolean {
  if (!isValidUrl(url)) return false;
  const platform = detectPlatform(url);
  return platform !== 'unknown';
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate prompt length
 */
export function isValidPrompt(prompt: string, minLength = 10, maxLength = 500): boolean {
  const trimmed = prompt.trim();
  return trimmed.length >= minLength && trimmed.length <= maxLength;
}

/**
 * Validate video settings
 */
export function isValidVideoSettings(settings: {
  duration?: number;
  aspectRatio?: string;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (settings.duration && ![15, 30, 60].includes(settings.duration)) {
    errors.push('Invalid duration. Must be 15, 30, or 60 seconds.');
  }
  
  if (settings.aspectRatio && !['9:16', '1:1', '16:9'].includes(settings.aspectRatio)) {
    errors.push('Invalid aspect ratio. Must be 9:16, 1:1, or 16:9.');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Sanitize user input
 */
export function sanitizeInput(input: string): string {
  return input
    .trim()
    // Remove potentially dangerous characters
    .replace(/<[^>]*>/g, '')
    // Remove control characters
    .replace(/[\x00-\x1F\x7F]/g, '');
}

/**
 * Validate file type
 */
export function isValidVideoFile(file: File): boolean {
  const validTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
  return validTypes.includes(file.type);
}

/**
 * Validate file size (max 500MB)
 */
export function isValidFileSize(file: File, maxSizeMB = 500): boolean {
  return file.size <= maxSizeMB * 1024 * 1024;
}

/**
 * Extract product ID from URL
 */
export function extractProductId(url: string): string | null {
  const platform = detectPlatform(url);
  
  try {
    const urlObj = new URL(url);
    
    switch (platform) {
      case 'shopee': {
        // Shopee URLs: shopee.co.th/product/123/456 or shopee.co.th/xxx-i.123.456
        const match = url.match(/i\.(\d+)\.(\d+)/) || url.match(/product\/(\d+)\/(\d+)/);
        return match ? `${match[1]}_${match[2]}` : null;
      }
      case 'lazada': {
        // Lazada URLs: lazada.co.th/products/xxx-i123456.html
        const match = url.match(/i(\d+)/);
        return match ? match[1] : null;
      }
      case 'tiktok': {
        // TikTok Shop URLs vary
        const match = urlObj.pathname.match(/product\/(\d+)/);
        return match ? match[1] : null;
      }
      default:
        return null;
    }
  } catch {
    return null;
  }
}

/**
 * Validate CSV data
 */
export function validateCSVData(data: string[][]): {
  valid: boolean;
  errors: string[];
  validRows: number;
} {
  const errors: string[] = [];
  let validRows = 0;
  
  data.forEach((row, index) => {
    if (row.length === 0 || !row[0]) return;
    
    const url = row[0].trim();
    if (!isValidProductUrl(url)) {
      errors.push(`Row ${index + 1}: Invalid product URL`);
    } else {
      validRows++;
    }
  });
  
  return {
    valid: errors.length === 0,
    errors,
    validRows,
  };
}
