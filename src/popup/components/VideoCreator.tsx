import { useState } from 'react';
import { Link, Loader2, Sparkles, Plus, Rocket } from 'lucide-react';
import type { VideoSettings, VideoTemplate, VideoDuration, AspectRatio, Platform } from '@/types';
import { PROMPT_TEMPLATES, VIDEO_DURATIONS, ASPECT_RATIOS } from '@/config/constants';

interface VideoCreatorProps {
  onGenerate: (params: {
    input: string;
    settings: VideoSettings;
    platforms: Platform[];
  }) => void;
  onAddToQueue: (params: {
    input: string;
    settings: VideoSettings;
    platforms: Platform[];
  }) => void;
  isGenerating?: boolean;
  disabled?: boolean;
}

const defaultSettings: VideoSettings = {
  template: 'product-review',
  duration: 30,
  aspectRatio: '9:16',
  style: 'dynamic',
  includeMusic: true,
  includeVoiceover: false,
  includePriceSticker: true,
  includeCTA: true,
};

export function VideoCreator({ onGenerate, onAddToQueue, isGenerating, disabled }: VideoCreatorProps) {
  const [input, setInput] = useState('');
  const [settings, setSettings] = useState<VideoSettings>(defaultSettings);
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(['tiktok']);

  const handleGenerate = () => {
    if (!input.trim()) return;
    onGenerate({ input: input.trim(), settings, platforms: selectedPlatforms });
  };

  const handleAddToQueue = () => {
    if (!input.trim()) return;
    onAddToQueue({ input: input.trim(), settings, platforms: selectedPlatforms });
    setInput('');
  };

  const togglePlatform = (platform: Platform) => {
    setSelectedPlatforms(prev => 
      prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <Sparkles className="w-4 h-4 text-primary-500" />
          Quick Create
        </h3>
      </div>
      <div className="card-content space-y-4">
        {/* Input */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Product URL or Details
          </label>
          <div className="relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Paste product URL from Shopee/Lazada/TikTok or describe your product..."
              className="textarea pr-10 min-h-[80px]"
              maxLength={500}
              disabled={disabled}
            />
            <Link className="absolute right-3 top-3 w-4 h-4 text-gray-400" />
          </div>
          <p className="mt-1 text-xs text-gray-500">{input.length}/500</p>
        </div>

        {/* Template */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Template
          </label>
          <select
            value={settings.template}
            onChange={(e) => setSettings({ ...settings, template: e.target.value as VideoTemplate })}
            className="input"
            disabled={disabled}
          >
            {Object.entries(PROMPT_TEMPLATES).map(([id, template]) => (
              <option key={id} value={id}>
                {template.nameLocal} ({template.name})
              </option>
            ))}
          </select>
        </div>

        {/* Duration */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Duration
          </label>
          <div className="flex gap-2">
            {VIDEO_DURATIONS.map((duration) => (
              <button
                key={duration}
                onClick={() => setSettings({ ...settings, duration: duration as VideoDuration })}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                  settings.duration === duration
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                disabled={disabled}
              >
                {duration}s
              </button>
            ))}
          </div>
        </div>

        {/* Aspect Ratio */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Style
          </label>
          <div className="flex gap-2">
            {ASPECT_RATIOS.map((ratio) => (
              <button
                key={ratio}
                onClick={() => setSettings({ ...settings, aspectRatio: ratio as AspectRatio })}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                  settings.aspectRatio === ratio
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                disabled={disabled}
              >
                {ratio === '9:16' ? '📱 Vertical' : ratio === '1:1' ? '⬛ Square' : '🖥️ Wide'}
              </button>
            ))}
          </div>
        </div>

        {/* Platforms */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Post to
          </label>
          <div className="flex gap-2">
            {(['tiktok', 'shopee', 'lazada'] as Platform[]).map((platform) => (
              <button
                key={platform}
                onClick={() => togglePlatform(platform)}
                className={`flex-1 py-2 text-xs font-medium rounded-md transition-colors ${
                  selectedPlatforms.includes(platform)
                    ? 'bg-primary-100 text-primary-700 border-2 border-primary-500'
                    : 'bg-gray-100 text-gray-600 border-2 border-transparent'
                }`}
                disabled={disabled}
              >
                {platform === 'tiktok' ? '🎵 TikTok' : platform === 'shopee' ? '🛒 Shopee' : '🛍️ Lazada'}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={handleAddToQueue}
            disabled={!input.trim() || disabled}
            className="btn btn-secondary flex-1 flex items-center justify-center gap-1"
          >
            <Plus className="w-4 h-4" />
            Add to Queue
          </button>
          <button
            onClick={handleGenerate}
            disabled={!input.trim() || isGenerating || disabled}
            className="btn btn-primary flex-1 flex items-center justify-center gap-1"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Rocket className="w-4 h-4" />
                Generate
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
