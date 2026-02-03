import type { VideoAnalytics, DailyAnalytics } from '@/types';
import { createLogger } from '@/utils/logger.util';

const logger = createLogger('AnalyticsService');

class AnalyticsService {
  /**
   * Fetch analytics for a TikTok video
   */
  async fetchTikTokAnalytics(
    videoId: string,
    accessToken: string
  ): Promise<Partial<VideoAnalytics> | null> {
    try {
      // TikTok Content Posting API doesn't provide analytics directly
      // This would need to use TikTok Research API (requires approval)
      // For now, return mock data or null
      logger.debug('TikTok analytics not available via posting API', { videoId });
      return null;
    } catch (error) {
      logger.error('Failed to fetch TikTok analytics', { videoId, error });
      return null;
    }
  }

  /**
   * Aggregate daily analytics
   */
  calculateDailyStats(videos: VideoAnalytics[]): DailyAnalytics {
    const today = new Date().toISOString().split('T')[0];
    
    const todayVideos = videos.filter(v => {
      const postedDate = new Date(v.postedAt).toISOString().split('T')[0];
      return postedDate === today;
    });

    const platformStats = {
      tiktok: { views: 0, engagement: 0 },
      shopee: { views: 0, engagement: 0 },
      lazada: { views: 0, engagement: 0 },
    };

    let totalViews = 0;
    let totalEngagement = 0;
    let estimatedRevenue = 0;

    todayVideos.forEach(video => {
      const engagement = video.likes + video.comments + video.shares;
      totalViews += video.views;
      totalEngagement += engagement;
      estimatedRevenue += video.estimatedRevenue;

      const platform = video.platform as keyof typeof platformStats;
      if (platformStats[platform]) {
        platformStats[platform].views += video.views;
        platformStats[platform].engagement += engagement;
      }
    });

    return {
      date: today,
      videosCreated: todayVideos.length,
      videosPosted: todayVideos.filter(v => v.platformPostId).length,
      totalViews,
      totalEngagement,
      estimatedRevenue,
      platformBreakdown: platformStats,
    };
  }

  /**
   * Calculate estimated revenue from views
   */
  estimateRevenue(views: number, clicks: number, platform: string): number {
    // Rough estimates based on typical affiliate commission rates
    const rates: Record<string, { ctr: number; conversionRate: number; avgCommission: number }> = {
      tiktok: { ctr: 0.02, conversionRate: 0.03, avgCommission: 50 },
      shopee: { ctr: 0.03, conversionRate: 0.05, avgCommission: 30 },
      lazada: { ctr: 0.025, conversionRate: 0.04, avgCommission: 35 },
    };

    const rate = rates[platform] || rates.tiktok;
    
    // If clicks provided, use actual CTR
    const estimatedClicks = clicks || views * rate.ctr;
    const estimatedConversions = estimatedClicks * rate.conversionRate;
    
    return Math.round(estimatedConversions * rate.avgCommission);
  }

  /**
   * Get best performing time slots
   */
  analyzeBestPostingTimes(videos: VideoAnalytics[]): { hour: number; avgViews: number }[] {
    const hourlyStats: Record<number, { totalViews: number; count: number }> = {};

    videos.forEach(video => {
      const hour = new Date(video.postedAt).getHours();
      if (!hourlyStats[hour]) {
        hourlyStats[hour] = { totalViews: 0, count: 0 };
      }
      hourlyStats[hour].totalViews += video.views;
      hourlyStats[hour].count += 1;
    });

    return Object.entries(hourlyStats)
      .map(([hour, stats]) => ({
        hour: parseInt(hour),
        avgViews: Math.round(stats.totalViews / stats.count),
      }))
      .sort((a, b) => b.avgViews - a.avgViews);
  }

  /**
   * Calculate engagement rate
   */
  calculateEngagementRate(video: VideoAnalytics): number {
    if (video.views === 0) return 0;
    const engagement = video.likes + video.comments + video.shares;
    return (engagement / video.views) * 100;
  }

  /**
   * Format analytics for export
   */
  exportToCSV(videos: VideoAnalytics[]): string {
    const headers = [
      'Video ID',
      'Platform',
      'Views',
      'Likes',
      'Comments',
      'Shares',
      'Clicks',
      'Est. Revenue',
      'Engagement Rate',
      'Posted At',
    ];

    const rows = videos.map(v => [
      v.videoId,
      v.platform,
      v.views.toString(),
      v.likes.toString(),
      v.comments.toString(),
      v.shares.toString(),
      v.clicks.toString(),
      v.estimatedRevenue.toFixed(2),
      this.calculateEngagementRate(v).toFixed(2) + '%',
      new Date(v.postedAt).toISOString(),
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }
}

// Singleton instance
export const analyticsService = new AnalyticsService();
