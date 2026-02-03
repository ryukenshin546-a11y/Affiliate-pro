import { useState } from 'react';
import { BarChart3, TrendingUp, Eye, Heart, MessageCircle, Download, Calendar } from 'lucide-react';
import { useAnalyticsStore } from '@/store';
import { formatNumber, formatCurrency } from '@/utils/slugify.util';

type DateRange = '7d' | '30d' | '90d';

export default function Analytics() {
  const [dateRange, setDateRange] = useState<DateRange>('7d');
  const { getTotalStats, getTopPerformingVideos, getPlatformBreakdown } = useAnalyticsStore();

  const totalStats = getTotalStats();
  const topVideos = getTopPerformingVideos(5);
  const platformBreakdown = getPlatformBreakdown();

  // Mock data for chart (in real app, this would come from store)
  const chartData = [
    { day: 'Mon', views: 523 },
    { day: 'Tue', views: 892 },
    { day: 'Wed', views: 654 },
    { day: 'Thu', views: 1234 },
    { day: 'Fri', views: 987 },
    { day: 'Sat', views: 756 },
    { day: 'Sun', views: 1100 },
  ];

  const maxViews = Math.max(...chartData.map(d => d.views));

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary-500" />
          <h2 className="text-lg font-semibold text-gray-900">Performance Analytics</h2>
        </div>
      </div>

      {/* Date Range Selector */}
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-gray-400" />
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value as DateRange)}
          className="input py-1 px-2 text-sm w-auto"
        >
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
          <option value="90d">Last 90 Days</option>
        </select>
      </div>

      {/* Views Chart */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-900">Views Over Time</h3>
          <div className="flex items-center gap-1 text-green-600 text-xs">
            <TrendingUp className="w-3 h-3" />
            <span>+23% vs last week</span>
          </div>
        </div>

        {/* Simple Bar Chart */}
        <div className="flex items-end gap-2 h-32">
          {chartData.map((data, index) => (
            <div key={data.day} className="flex-1 flex flex-col items-center">
              <div
                className="w-full bg-primary-500 rounded-t transition-all hover:bg-primary-600"
                style={{ height: `${(data.views / maxViews) * 100}%`, minHeight: '4px' }}
              />
              <span className="text-xs text-gray-500 mt-1">{data.day}</span>
            </div>
          ))}
        </div>

        <div className="mt-4 text-center">
          <p className="text-2xl font-bold text-gray-900">
            {formatNumber(totalStats.totalViews || chartData.reduce((sum, d) => sum + d.views, 0))}
          </p>
          <p className="text-xs text-gray-500">Total Views</p>
        </div>
      </div>

      {/* Platform Breakdown */}
      <div className="card p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Platform Breakdown</h3>
        
        <div className="space-y-3">
          {/* TikTok */}
          <div className="flex items-center gap-3">
            <span className="text-lg">🎵</span>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-700">TikTok</span>
                <span className="text-sm font-medium">
                  {platformBreakdown.tiktok.percentage.toFixed(0) || 65}%
                </span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-pink-500"
                  style={{ width: `${platformBreakdown.tiktok.percentage || 65}%` }}
                />
              </div>
            </div>
            <span className="text-xs text-gray-500">
              {formatNumber(platformBreakdown.tiktok.views || 2940)}
            </span>
          </div>

          {/* Shopee */}
          <div className="flex items-center gap-3">
            <span className="text-lg">🛒</span>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-700">Shopee</span>
                <span className="text-sm font-medium">
                  {platformBreakdown.shopee.percentage.toFixed(0) || 25}%
                </span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-orange-500"
                  style={{ width: `${platformBreakdown.shopee.percentage || 25}%` }}
                />
              </div>
            </div>
            <span className="text-xs text-gray-500">
              {formatNumber(platformBreakdown.shopee.views || 1130)}
            </span>
          </div>

          {/* Lazada */}
          <div className="flex items-center gap-3">
            <span className="text-lg">🛍️</span>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-700">Lazada</span>
                <span className="text-sm font-medium">
                  {platformBreakdown.lazada.percentage.toFixed(0) || 10}%
                </span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500"
                  style={{ width: `${platformBreakdown.lazada.percentage || 10}%` }}
                />
              </div>
            </div>
            <span className="text-xs text-gray-500">
              {formatNumber(platformBreakdown.lazada.views || 453)}
            </span>
          </div>
        </div>
      </div>

      {/* Top Performing Videos */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-sm font-medium text-gray-900">Top 5 Performing Videos</h3>
        </div>
        
        <div className="divide-y divide-gray-100">
          {(topVideos.length > 0 ? topVideos : mockTopVideos).map((video, index) => (
            <div key={video.videoId || index} className="p-3 hover:bg-gray-50">
              <div className="flex items-start gap-3">
                <span className="text-sm font-medium text-gray-400">{index + 1}.</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {video.videoId || `Video ${index + 1}`}
                  </p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {formatNumber(video.views)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Heart className="w-3 h-3" />
                      {formatNumber(video.likes)}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="w-3 h-3" />
                      {formatNumber(video.comments)}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-green-600">
                    {formatCurrency(video.estimatedRevenue)}
                  </p>
                  <p className="text-xs text-gray-400">Est. Revenue</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Export Button */}
      <button className="btn btn-secondary w-full flex items-center justify-center gap-2">
        <Download className="w-4 h-4" />
        Export Report CSV
      </button>
    </div>
  );
}

// Mock data for display
const mockTopVideos = [
  { videoId: 'AirPods Pro 2', views: 892, likes: 145, comments: 23, shares: 12, clicks: 45, estimatedRevenue: 145, platform: 'tiktok', platformPostId: '', postedAt: Date.now(), lastSyncedAt: Date.now() },
  { videoId: 'Gaming Mouse RGB', views: 756, likes: 98, comments: 12, shares: 8, clicks: 32, estimatedRevenue: 89, platform: 'tiktok', platformPostId: '', postedAt: Date.now(), lastSyncedAt: Date.now() },
  { videoId: 'Mechanical Keyboard', views: 654, likes: 87, comments: 15, shares: 5, clicks: 28, estimatedRevenue: 76, platform: 'shopee', platformPostId: '', postedAt: Date.now(), lastSyncedAt: Date.now() },
  { videoId: 'USB-C Hub 7in1', views: 543, likes: 65, comments: 8, shares: 3, clicks: 22, estimatedRevenue: 54, platform: 'tiktok', platformPostId: '', postedAt: Date.now(), lastSyncedAt: Date.now() },
  { videoId: 'LED Strip Lights', views: 432, likes: 54, comments: 6, shares: 2, clicks: 18, estimatedRevenue: 43, platform: 'lazada', platformPostId: '', postedAt: Date.now(), lastSyncedAt: Date.now() },
];
