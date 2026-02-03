// Video Job Types
export type VideoStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
export type VideoTemplate = 'product-review' | 'unboxing' | 'deal-alert' | 'before-after' | 'custom';
export type AspectRatio = '9:16' | '1:1' | '16:9';
export type VideoDuration = 15 | 30 | 60;
export type Platform = 'tiktok' | 'shopee' | 'lazada';

export interface ProductInfo {
  name: string;
  url: string;
  price: number;
  currency: string;
  imageUrl: string;
  description?: string;
  category?: string;
  seller?: string;
  rating?: number;
  reviews?: number;
}

export interface VideoSettings {
  template: VideoTemplate;
  duration: VideoDuration;
  aspectRatio: AspectRatio;
  style: 'dynamic' | 'calm' | 'energetic';
  includeMusic: boolean;
  includeVoiceover: boolean;
  includePriceSticker: boolean;
  includeCTA: boolean;
}

export interface VideoJob {
  id: string;
  status: VideoStatus;
  progress: number;
  product: ProductInfo;
  prompt: string;
  customPrompt?: string;
  settings: VideoSettings;
  videoUrl?: string;
  thumbnailUrl?: string;
  localPath?: string;
  flowJobId?: string;
  platforms: Platform[];
  scheduledAt?: number;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
  error?: string;
  retryCount: number;
}

export interface QueueStats {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}

export interface QueueState {
  jobs: VideoJob[];
  activeJobId?: string;
  isProcessing: boolean;
  stats: QueueStats;
  dailyLimit: number;
  dailyCreated: number;
}

// Template Types
export interface PromptTemplate {
  id: VideoTemplate;
  name: string;
  nameLocal: string;
  description: string;
  template: string;
  tags: string[];
  rating: number;
  usageCount: number;
}

export interface CustomTemplate extends PromptTemplate {
  userId: string;
  createdAt: number;
  updatedAt: number;
}
