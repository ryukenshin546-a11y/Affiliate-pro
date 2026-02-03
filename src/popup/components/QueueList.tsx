import { Play, Pause, X, Eye, Edit2, RotateCcw, Loader2 } from 'lucide-react';
import type { VideoJob } from '@/types';
import { formatRelativeTime, truncate } from '@/utils/slugify.util';

interface QueueListProps {
  jobs: VideoJob[];
  onPause?: (id: string) => void;
  onResume?: (id: string) => void;
  onCancel?: (id: string) => void;
  onRetry?: (id: string) => void;
  onView?: (id: string) => void;
  onEdit?: (id: string) => void;
}

const statusConfig = {
  pending: {
    label: 'In Queue',
    icon: '📝',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
  },
  processing: {
    label: 'Generating',
    icon: '⏳',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  completed: {
    label: 'Ready',
    icon: '✅',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
  failed: {
    label: 'Failed',
    icon: '❌',
    color: 'text-red-600',
    bgColor: 'bg-red-100',
  },
  cancelled: {
    label: 'Cancelled',
    icon: '⏹️',
    color: 'text-gray-500',
    bgColor: 'bg-gray-100',
  },
};

export function QueueList({ jobs, onPause, onResume, onCancel, onRetry, onView, onEdit }: QueueListProps) {
  if (jobs.length === 0) {
    return (
      <div className="card p-8 text-center">
        <p className="text-gray-500">No videos in queue</p>
        <p className="text-xs text-gray-400 mt-1">
          Add products to start generating videos
        </p>
      </div>
    );
  }

  return (
    <div className="card divide-y divide-gray-100">
      <div className="card-header flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">
          📋 Active Queue ({jobs.length})
        </h3>
      </div>
      
      {jobs.map((job, index) => {
        const status = statusConfig[job.status];
        
        return (
          <div key={job.id} className="p-3 hover:bg-gray-50 transition-colors">
            <div className="flex items-start gap-3">
              {/* Index */}
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                <span className="text-xs font-medium text-gray-600">{index + 1}</span>
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {truncate(job.product.name, 35)}
                </p>
                
                {/* Status */}
                <div className="flex items-center gap-2 mt-1">
                  <span className={`inline-flex items-center gap-1 text-xs ${status.color}`}>
                    <span>{status.icon}</span>
                    <span>{status.label}</span>
                    {job.status === 'processing' && (
                      <span className="ml-1">{job.progress}%</span>
                    )}
                  </span>
                  
                  {/* Progress bar for processing */}
                  {job.status === 'processing' && (
                    <div className="flex-1 max-w-[100px]">
                      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 transition-all duration-300"
                          style={{ width: `${job.progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Platforms */}
                <div className="flex items-center gap-1 mt-1">
                  {job.platforms.map((platform) => (
                    <span key={platform} className="text-xs text-gray-500">
                      {platform === 'tiktok' ? '🎵' : platform === 'shopee' ? '🛒' : '🛍️'}
                    </span>
                  ))}
                  <span className="text-xs text-gray-400">
                    {formatRelativeTime(job.createdAt)}
                  </span>
                </div>

                {/* Error message */}
                {job.error && (
                  <p className="text-xs text-red-500 mt-1 truncate">
                    {job.error}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                {job.status === 'processing' && onPause && (
                  <button
                    onClick={() => onPause(job.id)}
                    className="btn-icon"
                    title="Pause"
                  >
                    <Pause className="w-4 h-4 text-gray-500" />
                  </button>
                )}
                
                {job.status === 'pending' && onResume && (
                  <button
                    onClick={() => onResume(job.id)}
                    className="btn-icon"
                    title="Start"
                  >
                    <Play className="w-4 h-4 text-gray-500" />
                  </button>
                )}

                {job.status === 'failed' && onRetry && (
                  <button
                    onClick={() => onRetry(job.id)}
                    className="btn-icon"
                    title="Retry"
                  >
                    <RotateCcw className="w-4 h-4 text-gray-500" />
                  </button>
                )}

                {job.status === 'completed' && onView && (
                  <button
                    onClick={() => onView(job.id)}
                    className="btn-icon"
                    title="View"
                  >
                    <Eye className="w-4 h-4 text-gray-500" />
                  </button>
                )}

                {(job.status === 'pending' || job.status === 'failed') && onEdit && (
                  <button
                    onClick={() => onEdit(job.id)}
                    className="btn-icon"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4 text-gray-500" />
                  </button>
                )}

                {job.status !== 'completed' && onCancel && (
                  <button
                    onClick={() => onCancel(job.id)}
                    className="btn-icon"
                    title="Cancel"
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface QueueItemProps {
  job: VideoJob;
  onAction?: (action: string, id: string) => void;
}

export function QueueItem({ job, onAction }: QueueItemProps) {
  const status = statusConfig[job.status];

  return (
    <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
      {/* Thumbnail placeholder */}
      <div className="w-12 h-12 bg-gray-200 rounded-md flex items-center justify-center">
        {job.status === 'processing' ? (
          <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
        ) : (
          <span className="text-lg">{status.icon}</span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {job.product.name}
        </p>
        <p className={`text-xs ${status.color}`}>
          {status.label}
          {job.status === 'processing' && ` - ${job.progress}%`}
        </p>
      </div>
    </div>
  );
}
