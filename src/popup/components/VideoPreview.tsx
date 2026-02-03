import { useState, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX, Download, Share2, Maximize2 } from 'lucide-react';

interface VideoPreviewProps {
  videoUrl: string;
  thumbnailUrl?: string;
  title: string;
  duration?: number;
  onDownload?: () => void;
  onShare?: () => void;
  onPost?: () => void;
}

export function VideoPreview({ 
  videoUrl, 
  thumbnailUrl, 
  title, 
  duration,
  onDownload,
  onShare,
  onPost 
}: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);

  const togglePlay = () => {
    if (!videoRef.current) return;
    
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const progress = (videoRef.current.currentTime / videoRef.current.duration) * 100;
    setProgress(progress);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    videoRef.current.currentTime = percentage * videoRef.current.duration;
  };

  return (
    <div className="card overflow-hidden">
      {/* Video Container */}
      <div className="relative aspect-[9/16] bg-black max-h-[300px]">
        <video
          ref={videoRef}
          src={videoUrl}
          poster={thumbnailUrl}
          className="w-full h-full object-contain"
          muted={isMuted}
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => setIsPlaying(false)}
          playsInline
        />
        
        {/* Play/Pause overlay */}
        <button
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity"
        >
          {isPlaying ? (
            <Pause className="w-12 h-12 text-white" />
          ) : (
            <Play className="w-12 h-12 text-white" />
          )}
        </button>

        {/* Controls */}
        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
          {/* Progress bar */}
          <div 
            className="h-1 bg-white/30 rounded cursor-pointer mb-2"
            onClick={handleSeek}
          >
            <div 
              className="h-full bg-white rounded transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Controls row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button onClick={togglePlay} className="text-white">
                {isPlaying ? (
                  <Pause className="w-5 h-5" />
                ) : (
                  <Play className="w-5 h-5" />
                )}
              </button>
              <button onClick={toggleMute} className="text-white">
                {isMuted ? (
                  <VolumeX className="w-5 h-5" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </button>
            </div>
            <button className="text-white">
              <Maximize2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Info & Actions */}
      <div className="p-4">
        <h4 className="text-sm font-medium text-gray-900 truncate">{title}</h4>
        {duration && (
          <p className="text-xs text-gray-500 mt-1">{duration}s video</p>
        )}

        <div className="flex gap-2 mt-3">
          {onDownload && (
            <button onClick={onDownload} className="btn btn-secondary flex-1 text-xs">
              <Download className="w-4 h-4 mr-1" />
              Download
            </button>
          )}
          {onShare && (
            <button onClick={onShare} className="btn btn-secondary flex-1 text-xs">
              <Share2 className="w-4 h-4 mr-1" />
              Share
            </button>
          )}
          {onPost && (
            <button onClick={onPost} className="btn btn-primary flex-1 text-xs">
              🚀 Post Now
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface VideoThumbnailProps {
  thumbnailUrl?: string;
  title: string;
  duration?: number;
  status?: 'ready' | 'processing' | 'error';
  onClick?: () => void;
}

export function VideoThumbnail({ thumbnailUrl, title, duration, status = 'ready', onClick }: VideoThumbnailProps) {
  return (
    <button 
      onClick={onClick}
      className="relative aspect-[9/16] bg-gray-200 rounded-lg overflow-hidden group"
    >
      {thumbnailUrl ? (
        <img src={thumbnailUrl} alt={title} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <span className="text-3xl">🎬</span>
        </div>
      )}
      
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <Play className="w-8 h-8 text-white" />
      </div>

      {/* Duration badge */}
      {duration && (
        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/70 rounded text-xs text-white">
          {duration}s
        </div>
      )}

      {/* Status indicator */}
      {status === 'processing' && (
        <div className="absolute top-2 left-2 px-2 py-0.5 bg-blue-500 rounded text-xs text-white animate-pulse">
          Processing...
        </div>
      )}
      {status === 'error' && (
        <div className="absolute top-2 left-2 px-2 py-0.5 bg-red-500 rounded text-xs text-white">
          Error
        </div>
      )}
    </button>
  );
}
