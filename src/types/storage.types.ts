// Chrome Storage Types
export interface GoogleFlowAuth {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  creditsRemaining: number;
  creditsTotal: number;
  email?: string;
  name?: string;
  picture?: string;
}

export interface TikTokAuth {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  openId: string;
  displayName: string;
  avatarUrl: string;
}

export interface ShopeeAuth {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  shopId: string;
  shopName: string;
}

export interface LazadaAuth {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  sellerId: string;
  sellerName: string;
}

export interface AuthState {
  googleFlow?: GoogleFlowAuth;
  tiktok?: TikTokAuth;
  shopee?: ShopeeAuth;
  lazada?: LazadaAuth;
  isLoading: boolean;
  lastSynced?: number;
}

// Settings Storage Types
export interface VideoDefaults {
  resolution: '1080x1920' | '1080x1080' | '1920x1080';
  duration: 15 | 30 | 60;
  musicVolume: number;
  addWatermark: boolean;
  watermarkUrl?: string;
}

export interface AutomationSettings {
  autoDownload: boolean;
  autoPost: boolean;
  generateCaptions: boolean;
  addTrendingHashtags: boolean;
  maxConcurrentJobs: number;
  retryFailedCount: number;
}

export interface PostSchedule {
  platform: 'tiktok' | 'shopee' | 'lazada';
  enabled: boolean;
  interval: 'manual' | 'hourly' | 'every2hours' | 'every4hours' | 'daily';
  specificTime?: string; // HH:mm format
}

export interface SettingsState {
  videoDefaults: VideoDefaults;
  automation: AutomationSettings;
  postSchedules: PostSchedule[];
  notifications: {
    onComplete: boolean;
    onFailed: boolean;
    onViralAlert: boolean;
    lowCreditsWarning: boolean;
  };
  theme: 'light' | 'dark' | 'system';
  language: 'th' | 'en';
}

// Analytics Storage Types
export interface VideoAnalytics {
  videoId: string;
  platform: string;
  platformPostId: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  clicks: number;
  estimatedRevenue: number;
  postedAt: number;
  lastSyncedAt: number;
}

export interface DailyAnalytics {
  date: string; // YYYY-MM-DD
  videosCreated: number;
  videosPosted: number;
  totalViews: number;
  totalEngagement: number;
  estimatedRevenue: number;
  platformBreakdown: {
    tiktok: { views: number; engagement: number };
    shopee: { views: number; engagement: number };
    lazada: { views: number; engagement: number };
  };
}

export interface AnalyticsState {
  videos: VideoAnalytics[];
  daily: DailyAnalytics[];
  lastSynced?: number;
}

// Storage Schema
export interface StorageSchema {
  auth: AuthState;
  settings: SettingsState;
  queue: {
    jobs: import('./video.types').VideoJob[];
    activeJobId?: string;
  };
  analytics: AnalyticsState;
  onboarding: {
    completed: boolean;
    step: number;
  };
}
