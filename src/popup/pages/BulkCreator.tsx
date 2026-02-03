import { useState, useRef } from 'react';
import { Upload, Link2, FileText, Zap, Settings2, Loader2, AlertCircle } from 'lucide-react';
import { useQueueStore, useSettingsStore } from '@/store';
import type { VideoSettings, Platform, ProductInfo } from '@/types';
import { isValidProductUrl } from '@/utils/validator.util';
import { PROMPT_TEMPLATES, VIDEO_DURATIONS } from '@/config/constants';

type ImportMethod = 'urls' | 'csv' | 'shopee' | 'lazada';

export default function BulkCreator() {
  const [importMethod, setImportMethod] = useState<ImportMethod>('urls');
  const [urlInput, setUrlInput] = useState('');
  const [detectedProducts, setDetectedProducts] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { addJob } = useQueueStore();
  const { automation } = useSettingsStore();

  // Settings state
  const [settings, setSettings] = useState({
    autoGenerateScript: true,
    addBackgroundMusic: true,
    includePriceSticker: true,
    includeCTA: true,
    includeVoiceover: false,
    template: 'product-review',
    duration: 30,
    schedule: 'generate-post',
  });

  // Parse URLs from input
  const parseUrls = (input: string): string[] => {
    const lines = input.split('\n').map(line => line.trim()).filter(Boolean);
    return lines.filter(line => {
      try {
        new URL(line);
        return true;
      } catch {
        return false;
      }
    });
  };

  // Handle URL input change
  const handleUrlInputChange = (value: string) => {
    setUrlInput(value);
    const urls = parseUrls(value);
    setDetectedProducts(urls);
    setError(null);
  };

  // Handle CSV upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const urls = content
        .split('\n')
        .map(line => line.split(',')[0]?.trim())
        .filter(url => {
          try {
            new URL(url);
            return true;
          } catch {
            return false;
          }
        });
      
      setDetectedProducts(urls);
      setUrlInput(urls.join('\n'));
    };
    reader.readAsText(file);
  };

  // Start batch generation
  const handleStartBatch = async () => {
    if (detectedProducts.length === 0) {
      setError('No valid product URLs detected');
      return;
    }

    if (detectedProducts.length > 50) {
      setError('Maximum 50 products per batch');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      for (const url of detectedProducts) {
        const product: ProductInfo = {
          name: url.split('/').pop() || 'Product',
          url,
          price: 0,
          currency: 'THB',
          imageUrl: '',
        };

        const videoSettings: VideoSettings = {
          template: settings.template as any,
          duration: settings.duration as any,
          aspectRatio: '9:16',
          style: 'dynamic',
          includeMusic: settings.addBackgroundMusic,
          includeVoiceover: settings.includeVoiceover,
          includePriceSticker: settings.includePriceSticker,
          includeCTA: settings.includeCTA,
        };

        addJob({
          product,
          prompt: url,
          settings: videoSettings,
          platforms: ['tiktok'],
        });
      }

      // Clear input after adding
      setUrlInput('');
      setDetectedProducts([]);

      // Notify background script to start processing
      chrome.runtime.sendMessage({ type: 'START_BATCH_PROCESSING' });

    } catch (err) {
      setError('Failed to start batch generation');
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Zap className="w-5 h-5 text-primary-500" />
        <h2 className="text-lg font-semibold text-gray-900">Bulk Video Generator</h2>
      </div>

      {/* Import Method Selector */}
      <div className="card p-4">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Import Method
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setImportMethod('urls')}
            className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-colors ${
              importMethod === 'urls'
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <Link2 className="w-4 h-4" />
            <span className="text-sm">Paste URLs</span>
          </button>
          <button
            onClick={() => setImportMethod('csv')}
            className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-colors ${
              importMethod === 'csv'
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span className="text-sm">Upload CSV</span>
          </button>
          <button
            onClick={() => setImportMethod('shopee')}
            className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-colors ${
              importMethod === 'shopee'
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <span>🛒</span>
            <span className="text-sm">Shopee Feed</span>
          </button>
          <button
            onClick={() => setImportMethod('lazada')}
            className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-colors ${
              importMethod === 'lazada'
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <span>🛍️</span>
            <span className="text-sm">Lazada API</span>
          </button>
        </div>
      </div>

      {/* URL Input / CSV Upload */}
      <div className="card p-4">
        {importMethod === 'urls' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Paste product URLs (one per line)
            </label>
            <textarea
              value={urlInput}
              onChange={(e) => handleUrlInputChange(e.target.value)}
              placeholder={`https://shopee.co.th/product/...\nhttps://lazada.co.th/products/...\nhttps://tiktok.com/product/...`}
              className="textarea min-h-[120px] font-mono text-sm"
            />
          </div>
        )}

        {importMethod === 'csv' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload CSV File
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full p-8 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-400 transition-colors"
            >
              <Upload className="w-8 h-8 text-gray-400 mx-auto" />
              <p className="mt-2 text-sm text-gray-600">Click to upload or drag and drop</p>
              <p className="text-xs text-gray-400">CSV with product URLs in first column</p>
            </button>
          </div>
        )}

        {(importMethod === 'shopee' || importMethod === 'lazada') && (
          <div className="text-center py-8">
            <AlertCircle className="w-8 h-8 text-yellow-500 mx-auto" />
            <p className="mt-2 text-sm text-gray-600">
              Connect your {importMethod === 'shopee' ? 'Shopee' : 'Lazada'} account in Settings
            </p>
            <button className="btn btn-secondary mt-3 text-sm">
              Connect Account
            </button>
          </div>
        )}

        {/* Detected count */}
        {detectedProducts.length > 0 && (
          <div className="mt-3 flex items-center gap-2 text-sm">
            <span className="text-green-600">✓</span>
            <span>Detected: <strong>{detectedProducts.length}</strong> products</span>
          </div>
        )}
      </div>

      {/* Template Settings */}
      <div className="card p-4">
        <h3 className="flex items-center gap-2 text-sm font-medium text-gray-900 mb-3">
          <Settings2 className="w-4 h-4" />
          Template Settings
        </h3>
        
        <div className="space-y-3">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={settings.autoGenerateScript}
              onChange={(e) => setSettings({ ...settings, autoGenerateScript: e.target.checked })}
              className="rounded border-gray-300 text-primary-500 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700">Auto-generate script</span>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={settings.addBackgroundMusic}
              onChange={(e) => setSettings({ ...settings, addBackgroundMusic: e.target.checked })}
              className="rounded border-gray-300 text-primary-500 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700">Add background music</span>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={settings.includePriceSticker}
              onChange={(e) => setSettings({ ...settings, includePriceSticker: e.target.checked })}
              className="rounded border-gray-300 text-primary-500 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700">Include price sticker</span>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={settings.includeCTA}
              onChange={(e) => setSettings({ ...settings, includeCTA: e.target.checked })}
              className="rounded border-gray-300 text-primary-500 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700">Add CTA button</span>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={settings.includeVoiceover}
              onChange={(e) => setSettings({ ...settings, includeVoiceover: e.target.checked })}
              className="rounded border-gray-300 text-primary-500 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700">Voiceover (Thai female)</span>
          </label>
        </div>
      </div>

      {/* Schedule Options */}
      <div className="card p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Schedule</h3>
        <div className="space-y-2">
          <label className="flex items-center gap-3">
            <input
              type="radio"
              name="schedule"
              checked={settings.schedule === 'immediate'}
              onChange={() => setSettings({ ...settings, schedule: 'immediate' })}
              className="text-primary-500 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700">Generate immediately</span>
          </label>
          <label className="flex items-center gap-3">
            <input
              type="radio"
              name="schedule"
              checked={settings.schedule === 'generate-post'}
              onChange={() => setSettings({ ...settings, schedule: 'generate-post' })}
              className="text-primary-500 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700">Generate + Auto-post (2 hrs apart)</span>
          </label>
          <label className="flex items-center gap-3">
            <input
              type="radio"
              name="schedule"
              checked={settings.schedule === 'review'}
              onChange={() => setSettings({ ...settings, schedule: 'review' })}
              className="text-primary-500 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700">Generate + Review before post</span>
          </label>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-500" />
          <span className="text-sm text-red-700">{error}</span>
        </div>
      )}

      {/* Start Button */}
      <button
        onClick={handleStartBatch}
        disabled={detectedProducts.length === 0 || isProcessing}
        className="btn btn-primary w-full py-3 text-base"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <Zap className="w-5 h-5 mr-2" />
            Start Batch Generation ({detectedProducts.length})
          </>
        )}
      </button>
    </div>
  );
}
