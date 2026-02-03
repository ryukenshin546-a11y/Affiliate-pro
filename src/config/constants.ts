// Application Constants
export const APP_NAME = 'Flow Affiliate Pro';
export const APP_VERSION = '1.0.0';

// Extension Dimensions
export const POPUP_WIDTH = 400;
export const POPUP_HEIGHT = 600;

// Queue Settings
export const MAX_QUEUE_SIZE = 100;
export const MAX_CONCURRENT_JOBS = 3;
export const DEFAULT_RETRY_COUNT = 3;
export const JOB_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

// Rate Limiting
export const RATE_LIMIT = {
  videosPerDay: 50,
  postsPerHour: 10,
  apiCallsPerMinute: 30,
  delayBetweenJobs: 2 * 60 * 1000, // 2 minutes
  MIN_ACTION_DELAY_MS: 700,
} as const;

// Alias for backward compatibility
export const RATE_LIMITS = RATE_LIMIT;

// Video Settings
export const VIDEO_DURATIONS = [15, 30, 60] as const;
export const ASPECT_RATIOS = ['9:16', '1:1', '16:9'] as const;
export const VIDEO_STYLES = ['dynamic', 'calm', 'energetic'] as const;

// Template IDs
export const TEMPLATE_IDS = {
  PRODUCT_REVIEW: 'product-review',
  UNBOXING: 'unboxing',
  DEAL_ALERT: 'deal-alert',
  BEFORE_AFTER: 'before-after',
  CUSTOM: 'custom',
} as const;

// Platform Constants
export const PLATFORMS = {
  TIKTOK: 'tiktok',
  SHOPEE: 'shopee',
  LAZADA: 'lazada',
} as const;

// Storage Keys
export const STORAGE_KEYS = {
  AUTH: 'auth',
  SETTINGS: 'settings',
  QUEUE: 'queue',
  ANALYTICS: 'analytics',
  ONBOARDING: 'onboarding',
  TEMPLATES: 'templates',
} as const;

// Notification Types
export const NOTIFICATION_TYPES = {
  VIDEO_COMPLETE: 'video_complete',
  VIDEO_FAILED: 'video_failed',
  LOW_CREDITS: 'low_credits',
  VIRAL_ALERT: 'viral_alert',
  POST_SUCCESS: 'post_success',
  POST_FAILED: 'post_failed',
} as const;

// Color Palette (matching Tailwind config)
export const COLORS = {
  primary: '#6366F1',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
} as const;

// Default Settings
export const DEFAULT_SETTINGS = {
  videoDefaults: {
    resolution: '1080x1920' as const,
    duration: 30 as const,
    musicVolume: 40,
    addWatermark: false,
  },
  automation: {
    autoDownload: true,
    autoPost: true,
    generateCaptions: false,
    addTrendingHashtags: true,
    maxConcurrentJobs: 3,
    retryFailedCount: 3,
  },
  postSchedules: [
    { platform: 'tiktok' as const, enabled: true, interval: 'every2hours' as const },
    { platform: 'shopee' as const, enabled: true, interval: 'daily' as const, specificTime: '18:00' },
    { platform: 'lazada' as const, enabled: false, interval: 'manual' as const },
  ],
  notifications: {
    onComplete: true,
    onFailed: true,
    onViralAlert: true,
    lowCreditsWarning: true,
  },
  theme: 'light' as const,
  language: 'th' as const,
};

// Prompt Templates
export const PROMPT_TEMPLATES = {
  'product-review': {
    id: 'product-review',
    name: 'Product Review',
    nameLocal: 'รีวิวสินค้า',
    description: 'Professional product review highlighting key features',
    template: `Create a professional {duration}s product review video for "{productName}".
Show the product from multiple angles, highlight key features: {features}.
Price: {price} {currency}. Style: engaging and informative.
End with a clear call-to-action to purchase.`,
    tags: ['review', 'product', 'professional'],
    rating: 4.8,
    usageCount: 15420,
  },
  'unboxing': {
    id: 'unboxing',
    name: 'Unboxing Style',
    nameLocal: 'แกะกล่อง',
    description: 'Exciting unboxing experience',
    template: `Create an exciting {duration}s unboxing video for "{productName}".
Start with the sealed package, build anticipation, then reveal the product.
Show packaging quality, included accessories, and first impressions.
Express genuine excitement about the product.`,
    tags: ['unboxing', 'reveal', 'exciting'],
    rating: 4.5,
    usageCount: 12350,
  },
  'deal-alert': {
    id: 'deal-alert',
    name: 'Deal Alert',
    nameLocal: 'แจ้งเตือนดีล',
    description: 'Limited time offer announcement',
    template: `Create an urgent {duration}s deal alert video for "{productName}".
SALE PRICE: {price} {currency} (was {originalPrice})!
Create urgency with countdown graphics, flash text "Limited Time!"
Emphasize the savings and call viewers to act NOW!`,
    tags: ['sale', 'urgent', 'deal'],
    rating: 4.7,
    usageCount: 9870,
  },
  'before-after': {
    id: 'before-after',
    name: 'Before/After',
    nameLocal: 'ก่อน-หลัง',
    description: 'Transformation comparison',
    template: `Create a dramatic {duration}s before/after transformation video using "{productName}".
Split screen or transition effect showing the difference.
Highlight the transformation clearly with slow-motion reveal.
End with product showcase and purchase CTA.`,
    tags: ['transformation', 'comparison', 'dramatic'],
    rating: 4.9,
    usageCount: 8540,
  },
  custom: {
    id: 'custom',
    name: 'Custom',
    nameLocal: 'กำหนดเอง',
    description: 'Use your own prompt with variable substitution',
    template: `Create a {duration}s {style} video for "{productName}".
Price: {price} {currency}.
Use aspect ratio {aspectRatio}. Highlight key features: {features}.
End with a clear call-to-action to purchase.`,
    tags: ['custom'],
    rating: 4.6,
    usageCount: 0,
  },
} as const;

// URL Patterns for Platform Detection
export const URL_PATTERNS = {
  shopee: /shopee\.co\.th|shopee\.com/i,
  lazada: /lazada\.co\.th|lazada\.com/i,
  tiktok: /tiktok\.com/i,
} as const;

// DOM Selectors (for content scripts)
export const SELECTORS = {
  googleFlow: {
    // Core
    promptBox: 'textarea[aria-label*="prompt" i], textarea[placeholder*="prompt" i], textarea[placeholder*="video" i], textarea[placeholder*="วิดีโอ"], textarea',
    generateBtn: 'button[aria-label*="generate" i], button[aria-label*="create" i], button[aria-label*="สร้าง"], button[type="submit"]',
    videoPlayer: 'video[src*="ai-sandbox-videofx/video"], video source[src*="ai-sandbox-videofx/video"], video[src*="googleusercontent"], video[src*="gstatic"], video',
    downloadBtn: 'a[href*="storage.googleapis.com/ai-sandbox-videofx/video"], a[download], button[aria-label*="download" i], button[aria-label*="ดาวน์โหลด"], a[href*="download" i], [data-url*="storage.googleapis.com/ai-sandbox-videofx/video"]',
    progressBar: '.progress-indicator, [role="progressbar"], .progress',

    // Aliases used by controllers
    createButton: 'button[aria-label*="create" i], a[href*="create" i], button',
    promptInput: 'textarea[aria-label*="prompt" i], textarea[placeholder*="prompt" i], textarea[placeholder*="video" i], textarea[placeholder*="วิดีโอ"], textarea',
    durationSelector: 'select[name*="duration"], [aria-label*="Duration"] select, [data-testid*="duration"] select',
    aspectRatioSelector: 'select[name*="aspect"], [aria-label*="Aspect"] select, [data-testid*="aspect"] select',
    musicToggle: 'input[type="checkbox"][name*="music"], [aria-label*="Music"] input[type="checkbox"], button[aria-label*="Music"]',
    voiceoverToggle: 'input[type="checkbox"][name*="voice"], [aria-label*="Voice"] input[type="checkbox"], button[aria-label*="Voice"]',
    generateButton: 'button[aria-label*="generate" i], button[aria-label*="create" i], button[aria-label*="สร้าง"], button[type="submit"], button',
    progressIndicator: '.progress-indicator, [role="progressbar"], .progress',
    downloadButton: 'a[href*="storage.googleapis.com/ai-sandbox-videofx/video"], a[download], button[aria-label*="download" i], button[aria-label*="ดาวน์โหลด"], a[href*="download" i], [data-url*="storage.googleapis.com/ai-sandbox-videofx/video"]',
    videoPreview: 'video[src*="ai-sandbox-videofx/video"], video source[src*="ai-sandbox-videofx/video"], video[src*="googleusercontent"], video[src*="gstatic"], video',
    errorMessage: '[role="alert"], .error, .toast-error',
    progressText: '[aria-live="polite"], .progress-text, .status-text',
    cancelButton: 'button[aria-label*="cancel" i], button[aria-label*="stop" i], button[aria-label*="ยกเลิก"], button',
    creditsDisplay: '[data-testid*="credits"], .credits, [aria-label*="Credits"], [class*="credit"]',
  },
  tiktok: {
    // Core
    uploadInput: 'input[type="file"][accept*="video"]',
    captionBox: 'textarea[placeholder*="caption"], div[contenteditable="true"]',
    postBtn: 'button[data-e2e="post-button"], button[type="submit"], [role="button"][data-e2e="post-button"]',

    // Aliases used by controller
    uploadArea: '[data-e2e*="upload"], .upload-container, main',
    fileInput: 'input[type="file"][accept*="video"]',
    uploadComplete: '[data-e2e*="success"], .upload-success, .success',
    uploadProgress: '[role="progressbar"], .upload-progress, .progress',
    captionInput: 'textarea[placeholder*="caption"], div[contenteditable="true"]',
    visibilitySelector: 'select[name*="visibility"], [aria-label*="Visibility"] select, [data-e2e*="visibility"]',
    visibilityPublic: '[data-e2e*="public"], input[value="public"], [role="radio"][data-e2e*="public"]',
    visibilityPrivate: '[data-e2e*="private"], input[value="private"], [role="radio"][data-e2e*="private"]',
    visibilityFriends: '[data-e2e*="friends"], input[value="friends"], [role="radio"][data-e2e*="friends"]',
    scheduleToggle: '[data-e2e*="schedule"], input[type="checkbox"][name*="schedule"], [role="switch"][data-e2e*="schedule"]',
    scheduleDateInput: 'input[type="datetime-local"], input[placeholder*="Schedule"], input[aria-label*="Schedule"]',
    postButton: 'button[data-e2e="post-button"], button[type="submit"], [role="button"][data-e2e="post-button"]',
    successMessage: '[data-e2e*="success"], .toast-success, .success',
    errorMessage: '[role="alert"], .toast-error, .error',
    profileAvatar: 'img[data-e2e*="avatar"], img[alt*="avatar"], img[src*="avatar"]',
    username: '[data-e2e*="username"], a[href^="/@"], a[href*="/@@"]',
    followerCount: '[data-e2e*="follower"], [title*="Followers"], .follower-count',
  },
  shopee: {
    productEditBtn: 'button[type="button"], button',
    videoUploadArea: '.product-video-upload, input[type="file"][accept*="video"]',
    saveBtn: 'button[type="submit"], button',

    // Product page scraping
    productName: 'h1, [data-testid*="product-title"], .product-title',
    price: '[data-testid*="price"], .product-price, [class*="price"]',
    originalPrice: '[data-testid*="original"], .original-price, del, s',
    discount: '[data-testid*="discount"], .discount, [class*="discount"]',
    mainImage: 'img[data-testid*="main"], .main-image img, img[class*="main"]',
    thumbnailImages: '.thumbnail img, [data-testid*="thumbnail"] img, img[class*="thumb"]',
    description: '#product-description, .product-description, [data-testid*="description"]',
    breadcrumb: 'nav[aria-label*="breadcrumb"] a, .breadcrumb a, .shopee-breadcrumb a',
    sellerName: '[data-testid*="shop-name"], .shop-name, [class*="shop"] [class*="name"]',
    sellerRating: '[data-testid*="shop-rating"], .shop-rating, [class*="rating"]',
    sellerResponseRate: '[data-testid*="response"], .response-rate, [class*="response"]',
    rating: '[data-testid*="rating"], .rating, [class*="rating"]',
    reviewCount: '[data-testid*="review"], .review-count, [class*="review"]',
    soldCount: '[data-testid*="sold"], .sold-count, [class*="sold"]',
    stock: '[data-testid*="stock"], .stock, [class*="stock"]',
    specifications: 'table tr, .specifications li, [data-testid*="spec"]',

    // Affiliate link flow
    affiliateButton: 'a[href*="affiliate" i], button[aria-label*="affiliate" i], button',
    affiliateLinkInput: 'input[type="text"], textarea, input[placeholder*="link"], input[value^="http"]',

    // Listing cards
    productCard: '.product-card, [data-testid*="product-card"], a[href*="/product/"]',
    cardProductName: '.product-name, [data-testid*="product-name"], h3, h2',
    cardPrice: '.price, [data-testid*="price"], [class*="price"]',
    cardImage: 'img',
    cardSold: '[class*="sold"], [data-testid*="sold"]',
    cardRating: '[class*="rating"], [data-testid*="rating"]',
  },
  lazada: {
    productEditBtn: 'button:has-text("Edit"), a[href*="product/edit"]',
    videoUploadArea: '.video-upload-zone, input[type="file"][accept*="video"]',
    saveBtn: 'button:has-text("Submit"), button:has-text("Save")',

    // Product page scraping
    productName: 'h1, [data-testid*="product-title"], .pdp-mod-product-badge-title, .product-title',
    price: '[data-testid*="price"], .pdp-price, [class*="price"]',
    originalPrice: '[data-testid*="original"], .pdp-price_type_deleted, del, s',
    discount: '[data-testid*="discount"], .pdp-product-price__discount, [class*="discount"]',
    mainImage: 'img[data-testid*="main"], .pdp-mod-common-image img, img[class*="main"]',
    thumbnailImages: '.pdp-mod-common-image__thumb img, .thumbnail img, img[class*="thumb"]',
    description: '#product-description, .pdp-mod-product-desc, [data-testid*="description"]',
    breadcrumb: 'nav[aria-label*="breadcrumb"] a, .breadcrumb a, .pdp-mod-breadcrumb a',
    sellerName: '[data-testid*="seller"], .seller-name, [class*="seller"] [class*="name"]',
    sellerRating: '[data-testid*="seller-rating"], .seller-rating, [class*="rating"]',
    sellerPositiveRating: '[data-testid*="positive"], .positive-rating, [class*="positive"]',
    rating: '[data-testid*="rating"], .rating, [class*="rating"]',
    reviewCount: '[data-testid*="review"], .review-count, [class*="review"]',

    // Affiliate link flow
    affiliateButton: 'button:has-text("Affiliate"), button:has-text("Generate Link"), a:has-text("Affiliate")',
    affiliateLinkInput: 'input[type="text"], textarea, input[placeholder*="link"], input[value^="http"]',

    // Listing cards
    productCard: '.product-card, [data-testid*="product-card"], a[href*="/products/"]',
    cardProductName: '.product-name, [data-testid*="product-name"], h3, h2',
    cardPrice: '.price, [data-testid*="price"], [class*="price"]',
    cardOriginalPrice: '.original-price, del, s, [class*="deleted"]',
    cardImage: 'img',
    cardRating: '[class*="rating"], [data-testid*="rating"]',
    cardReviews: '[class*="review"], [data-testid*="review"]',
  },
} as const;

// Alias for SELECTORS.googleFlow
export const GOOGLE_FLOW_SELECTORS = SELECTORS.googleFlow;
export const TIKTOK_SELECTORS = SELECTORS.tiktok;
export const SHOPEE_SELECTORS = SELECTORS.shopee;
export const LAZADA_SELECTORS = SELECTORS.lazada;
