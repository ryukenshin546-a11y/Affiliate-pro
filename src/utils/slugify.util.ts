/**
 * Convert text to URL-friendly slug
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    // Replace Thai characters with romanization (simplified)
    .replace(/[ก-ฮ]/g, (char) => thaiToRoman(char))
    // Replace spaces with dashes
    .replace(/\s+/g, '-')
    // Remove special characters
    .replace(/[^\w\-]+/g, '')
    // Replace multiple dashes with single dash
    .replace(/\-\-+/g, '-')
    // Remove leading/trailing dashes
    .replace(/^-+/, '')
    .replace(/-+$/, '')
    // Limit length
    .slice(0, 100);
}

/**
 * Simple Thai to Roman character mapping (simplified)
 */
function thaiToRoman(char: string): string {
  const mapping: Record<string, string> = {
    'ก': 'k', 'ข': 'kh', 'ค': 'kh', 'ฆ': 'kh', 'ง': 'ng',
    'จ': 'ch', 'ฉ': 'ch', 'ช': 'ch', 'ซ': 's', 'ฌ': 'ch',
    'ญ': 'y', 'ฎ': 'd', 'ฏ': 't', 'ฐ': 'th', 'ฑ': 'th',
    'ฒ': 'th', 'ณ': 'n', 'ด': 'd', 'ต': 't', 'ถ': 'th',
    'ท': 'th', 'ธ': 'th', 'น': 'n', 'บ': 'b', 'ป': 'p',
    'ผ': 'ph', 'ฝ': 'f', 'พ': 'ph', 'ฟ': 'f', 'ภ': 'ph',
    'ม': 'm', 'ย': 'y', 'ร': 'r', 'ล': 'l', 'ว': 'w',
    'ศ': 's', 'ษ': 's', 'ส': 's', 'ห': 'h', 'ฬ': 'l',
    'อ': 'o', 'ฮ': 'h',
  };
  return mapping[char] || '';
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Capitalize first letter
 */
export function capitalize(text: string): string {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Format currency (Thai Baht)
 */
export function formatCurrency(amount: number, currency: string = 'THB'): string {
  const locale = currency === 'THB' ? 'th-TH' : 'en-US';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format number with commas
 */
export function formatNumber(num: number, compact = false): string {
  if (!compact) {
    return new Intl.NumberFormat('th-TH').format(num);
  }

  const abs = Math.abs(num);
  const formatCompact = (value: number, suffix: 'K' | 'M') => {
    const rounded = Math.round(value * 10) / 10;
    const str = String(rounded).replace(/\.0$/, '');
    return `${str}${suffix}`;
  };

  if (abs >= 1_000_000) return formatCompact(num / 1_000_000, 'M');
  if (abs >= 1_000) return formatCompact(num / 1_000, 'K');

  return new Intl.NumberFormat('th-TH').format(num);
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days} วันที่แล้ว`;
  if (hours > 0) return `${hours} ชั่วโมงที่แล้ว`;
  if (minutes > 0) return `${minutes} นาทีที่แล้ว`;
  return 'เมื่อสักครู่';
}

/**
 * Format date
 */
export function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(timestamp));
}

/**
 * Format time
 */
export function formatTime(timestamp: number): string {
  return new Intl.DateTimeFormat('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp));
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Parse duration string to seconds
 */
export function parseDuration(duration: string): number {
  const match = duration.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 30;
}

/**
 * Format duration seconds to string
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Sanitize filename for safe file system usage
 */
export function sanitizeFilename(filename: string): string {
  return filename
    // Remove invalid characters
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
    // Replace spaces with underscores
    .replace(/\s+/g, '_')
    // Remove leading/trailing dots and spaces
    .replace(/^\.+|\.+$|\s+$/g, '')
    // Limit length (max 200 chars)
    .slice(0, 200)
    // Ensure not empty
    || 'untitled';
}
