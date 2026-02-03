// Google Flow API Types
export interface GoogleFlowGenerateRequest {
  prompt: string;
  duration: number;
  aspect_ratio: string;
  style: string;
}

export interface GoogleFlowGenerateResponse {
  job_id: string;
  status: 'processing' | 'completed' | 'failed';
  estimated_time: number;
  credits_used: number;
}

export interface GoogleFlowStatusResponse {
  job_id: string;
  status: 'processing' | 'completed' | 'failed';
  progress?: number;
  video_url?: string;
  thumbnail_url?: string;
  duration?: number;
  error?: string;
  created_at: string;
  completed_at?: string;
}

export interface GoogleFlowCreditsResponse {
  credits_remaining: number;
  credits_total: number;
  reset_date: string;
}

// TikTok API Types
export interface TikTokUploadInitRequest {
  post_info: {
    title: string;
    privacy_level: 'PUBLIC_TO_EVERYONE' | 'MUTUAL_FOLLOW_FRIENDS' | 'FOLLOWER_OF_CREATOR' | 'SELF_ONLY';
    disable_duet: boolean;
    disable_comment: boolean;
    disable_stitch: boolean;
    video_cover_timestamp_ms?: number;
  };
  source_info: {
    source: 'FILE_UPLOAD' | 'PULL_FROM_URL';
    video_size: number;
    chunk_size: number;
    total_chunk_count: number;
  };
}

export interface TikTokUploadInitResponse {
  data: {
    publish_id: string;
    upload_url: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface TikTokPublishStatusResponse {
  data: {
    publish_id: string;
    status: 'PROCESSING_UPLOAD' | 'PROCESSING_DOWNLOAD' | 'SEND_TO_USER_INBOX' | 'PUBLISH_COMPLETE' | 'FAILED';
    fail_reason?: string;
  };
}

export interface TikTokUserInfoResponse {
  data: {
    user: {
      open_id: string;
      union_id: string;
      avatar_url: string;
      avatar_url_100: string;
      avatar_large_url: string;
      display_name: string;
      bio_description: string;
      profile_deep_link: string;
      is_verified: boolean;
      follower_count: number;
      following_count: number;
      likes_count: number;
      video_count: number;
    };
  };
}

// Scraper API Types
export interface ScrapedProduct {
  success: boolean;
  platform: 'shopee' | 'lazada' | 'tiktok' | 'unknown';
  data?: {
    name: string;
    price: number;
    currency: string;
    imageUrl: string;
    images: string[];
    description: string;
    category: string;
    seller: string;
    rating: number;
    reviews: number;
    sold: number;
    url: string;
  };
  error?: string;
}

// Generic API Response
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

// Webhook Types
export interface WebhookPayload {
  event: string;
  data: Record<string, unknown>;
  timestamp: number;
}
