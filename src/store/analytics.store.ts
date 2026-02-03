import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AnalyticsState, VideoAnalytics, DailyAnalytics } from '@/types';
import { createLogger } from '@/utils/logger.util';

const logger = createLogger('AnalyticsStore');

interface AnalyticsActions {
  addVideoAnalytics: (analytics: VideoAnalytics) => void;
  updateVideoAnalytics: (videoId: string, updates: Partial<VideoAnalytics>) => void;
  addDailyAnalytics: (daily: DailyAnalytics) => void;
  updateDailyAnalytics: (date: string, updates: Partial<DailyAnalytics>) => void;
  getVideoAnalytics: (videoId: string) => VideoAnalytics | undefined;
  getDailyAnalytics: (date: string) => DailyAnalytics | undefined;
  getTotalStats: () => {
    totalViews: number;
    totalEngagement: number;
    totalRevenue: number;
    videosCreated: number;
  };
  getTopPerformingVideos: (limit?: number) => VideoAnalytics[];
  getPlatformBreakdown: () => {
    tiktok: { views: number; engagement: number; percentage: number };
    shopee: { views: number; engagement: number; percentage: number };
    lazada: { views: number; engagement: number; percentage: number };
  };
  setLastSynced: (timestamp: number) => void;
  clearAnalytics: () => void;
}

const initialState: AnalyticsState = {
  videos: [],
  daily: [],
  lastSynced: undefined,
};

// Chrome storage adapter
const chromeStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      const result = await chrome.storage.local.get(name);
      return result[name] || null;
    } catch {
      return localStorage.getItem(name);
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      await chrome.storage.local.set({ [name]: value });
    } catch {
      localStorage.setItem(name, value);
    }
  },
  removeItem: async (name: string): Promise<void> => {
    try {
      await chrome.storage.local.remove(name);
    } catch {
      localStorage.removeItem(name);
    }
  },
};

export const useAnalyticsStore = create<AnalyticsState & AnalyticsActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      addVideoAnalytics: (analytics) => {
        logger.info('Adding video analytics', { videoId: analytics.videoId });
        set((state) => ({
          videos: [...state.videos, analytics],
        }));
      },

      updateVideoAnalytics: (videoId, updates) => {
        set((state) => ({
          videos: state.videos.map((v) =>
            v.videoId === videoId ? { ...v, ...updates, lastSyncedAt: Date.now() } : v
          ),
        }));
      },

      addDailyAnalytics: (daily) => {
        logger.info('Adding daily analytics', { date: daily.date });
        set((state) => ({
          daily: [...state.daily, daily],
        }));
      },

      updateDailyAnalytics: (date, updates) => {
        set((state) => ({
          daily: state.daily.map((d) =>
            d.date === date ? { ...d, ...updates } : d
          ),
        }));
      },

      getVideoAnalytics: (videoId) => {
        return get().videos.find((v) => v.videoId === videoId);
      },

      getDailyAnalytics: (date) => {
        return get().daily.find((d) => d.date === date);
      },

      getTotalStats: () => {
        const { videos, daily } = get();
        
        const totalViews = videos.reduce((sum, v) => sum + v.views, 0);
        const totalEngagement = videos.reduce(
          (sum, v) => sum + v.likes + v.comments + v.shares,
          0
        );
        const totalRevenue = videos.reduce((sum, v) => sum + v.estimatedRevenue, 0);
        const videosCreated = daily.reduce((sum, d) => sum + d.videosCreated, 0);

        return { totalViews, totalEngagement, totalRevenue, videosCreated };
      },

      getTopPerformingVideos: (limit = 5) => {
        const { videos } = get();
        return [...videos]
          .sort((a, b) => b.views - a.views)
          .slice(0, limit);
      },

      getPlatformBreakdown: () => {
        const { videos } = get();
        
        const platforms = {
          tiktok: { views: 0, engagement: 0 },
          shopee: { views: 0, engagement: 0 },
          lazada: { views: 0, engagement: 0 },
        };

        videos.forEach((v) => {
          const platform = v.platform as keyof typeof platforms;
          if (platforms[platform]) {
            platforms[platform].views += v.views;
            platforms[platform].engagement += v.likes + v.comments + v.shares;
          }
        });

        const totalViews = Object.values(platforms).reduce((sum, p) => sum + p.views, 0);

        return {
          tiktok: {
            ...platforms.tiktok,
            percentage: totalViews > 0 ? (platforms.tiktok.views / totalViews) * 100 : 0,
          },
          shopee: {
            ...platforms.shopee,
            percentage: totalViews > 0 ? (platforms.shopee.views / totalViews) * 100 : 0,
          },
          lazada: {
            ...platforms.lazada,
            percentage: totalViews > 0 ? (platforms.lazada.views / totalViews) * 100 : 0,
          },
        };
      },

      setLastSynced: (timestamp) => {
        set({ lastSynced: timestamp });
      },

      clearAnalytics: () => {
        logger.info('Clearing all analytics');
        set(initialState);
      },
    }),
    {
      name: 'flow-affiliate-analytics',
      storage: createJSONStorage(() => chromeStorage),
    }
  )
);
