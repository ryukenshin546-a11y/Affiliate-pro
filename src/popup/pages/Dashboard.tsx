import { useState } from 'react';
import { Video, CheckCircle, Clock, XCircle, TrendingUp, BarChart3, FileUp, RefreshCw, Download } from 'lucide-react';
import { useQueueStore, useAuthStore, useAnalyticsStore } from '@/store';
import { StatsCard, ProgressCard, CreditCard, VideoCreator, QueueList } from '../components';
import type { VideoSettings, Platform, ProductInfo } from '@/types';
import { scraperService } from '@/services';
import { isValidProductUrl, detectPlatform } from '@/utils/validator.util';

export default function Dashboard() {
  const [isGenerating, setIsGenerating] = useState(false);
  
  const { jobs, addJob, startJob, cancelJob, retryJob, getStats, dailyCreated, dailyLimit } = useQueueStore();
  const { googleFlow } = useAuthStore();
  const { getTotalStats } = useAnalyticsStore();

  const stats = getStats();
  const totalStats = getTotalStats();

  const handleGenerate = async (params: {
    input: string;
    settings: VideoSettings;
    platforms: Platform[];
  }) => {
    setIsGenerating(true);

    try {
      let product: ProductInfo;

      // Check if input is a URL
      if (isValidProductUrl(params.input)) {
        // Scrape product info
        const scraped = await scraperService.scrapeProduct(params.input);
        if (scraped.success && scraped.data) {
          product = {
            name: scraped.data.name,
            url: scraped.data.url,
            price: scraped.data.price,
            currency: scraped.data.currency,
            imageUrl: scraped.data.imageUrl,
            description: scraped.data.description,
            category: scraped.data.category,
            seller: scraped.data.seller,
            rating: scraped.data.rating,
            reviews: scraped.data.reviews,
          };
        } else {
          // Fallback to basic extraction
          const basicInfo = scraperService.extractBasicInfo(params.input);
          product = {
            name: basicInfo.name || 'Unknown Product',
            url: params.input,
            price: 0,
            currency: 'THB',
            imageUrl: '',
          };
        }
      } else {
        // Input is a text description
        product = {
          name: params.input.slice(0, 100),
          url: '',
          price: 0,
          currency: 'THB',
          imageUrl: '',
          description: params.input,
        };
      }

      // Add job and start immediately
      const job = addJob({
        product,
        prompt: params.input,
        settings: params.settings,
        platforms: params.platforms,
      });

      // Start the job
      startJob(job.id);

      // TODO: Send message to background script to process
      chrome.runtime.sendMessage({
        type: 'CREATE_VIDEO',
        payload: { jobId: job.id },
      });

    } catch (error) {
      console.error('Failed to generate video:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddToQueue = (params: {
    input: string;
    settings: VideoSettings;
    platforms: Platform[];
  }) => {
    const basicInfo = scraperService.extractBasicInfo(params.input);
    
    addJob({
      product: {
        name: basicInfo.name || params.input.slice(0, 50),
        url: isValidProductUrl(params.input) ? params.input : '',
        price: 0,
        currency: 'THB',
        imageUrl: '',
      },
      prompt: params.input,
      settings: params.settings,
      platforms: params.platforms,
    });
  };

  return (
    <div className="p-4 space-y-4">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 gap-3">
        <StatsCard
          title="Today's Videos"
          value={`${dailyCreated}/${dailyLimit}`}
          icon={<Video className="w-5 h-5" />}
          color="primary"
        />
        <StatsCard
          title="Success Rate"
          value={stats.total > 0 ? `${Math.round((stats.completed / stats.total) * 100)}%` : '0%'}
          icon={<TrendingUp className="w-5 h-5" />}
          color="success"
        />
      </div>

      {/* Progress */}
      <ProgressCard
        title="Today's Progress"
        current={dailyCreated}
        total={dailyLimit}
      />

      {/* Mini Stats */}
      <div className="grid grid-cols-4 gap-2">
        <div className="card p-2 text-center">
          <CheckCircle className="w-4 h-4 text-green-500 mx-auto" />
          <p className="text-lg font-bold text-gray-900">{stats.completed}</p>
          <p className="text-xs text-gray-500">Done</p>
        </div>
        <div className="card p-2 text-center">
          <Clock className="w-4 h-4 text-yellow-500 mx-auto" />
          <p className="text-lg font-bold text-gray-900">{stats.pending}</p>
          <p className="text-xs text-gray-500">Queue</p>
        </div>
        <div className="card p-2 text-center">
          <XCircle className="w-4 h-4 text-red-500 mx-auto" />
          <p className="text-lg font-bold text-gray-900">{stats.failed}</p>
          <p className="text-xs text-gray-500">Failed</p>
        </div>
        <div className="card p-2 text-center">
          <span className="text-lg">💰</span>
          <p className="text-lg font-bold text-gray-900">{googleFlow?.creditsRemaining || 0}</p>
          <p className="text-xs text-gray-500">Credits</p>
        </div>
      </div>

      {/* Quick Create */}
      <VideoCreator
        onGenerate={handleGenerate}
        onAddToQueue={handleAddToQueue}
        isGenerating={isGenerating}
        disabled={!googleFlow?.accessToken}
      />

      {/* Quick Actions */}
      <div className="grid grid-cols-4 gap-2">
        <button className="card p-2 text-center hover:bg-gray-50 transition-colors">
          <Video className="w-5 h-5 text-primary-500 mx-auto" />
          <p className="text-xs text-gray-600 mt-1">New</p>
        </button>
        <button className="card p-2 text-center hover:bg-gray-50 transition-colors">
          <FileUp className="w-5 h-5 text-primary-500 mx-auto" />
          <p className="text-xs text-gray-600 mt-1">Import</p>
        </button>
        <button className="card p-2 text-center hover:bg-gray-50 transition-colors">
          <RefreshCw className="w-5 h-5 text-primary-500 mx-auto" />
          <p className="text-xs text-gray-600 mt-1">Sync</p>
        </button>
        <button className="card p-2 text-center hover:bg-gray-50 transition-colors">
          <Download className="w-5 h-5 text-primary-500 mx-auto" />
          <p className="text-xs text-gray-600 mt-1">Export</p>
        </button>
      </div>

      {/* Queue List */}
      <QueueList
        jobs={jobs.slice(0, 5)}
        onCancel={cancelJob}
        onRetry={retryJob}
      />

      {/* View All Link */}
      {jobs.length > 5 && (
        <p className="text-center text-sm text-primary-600 cursor-pointer hover:underline">
          View all {jobs.length} items →
        </p>
      )}
    </div>
  );
}
