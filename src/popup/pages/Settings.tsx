import { useState } from 'react';
import { Settings as SettingsIcon, Link2, Unlink, RefreshCw, Save, Check, AlertTriangle } from 'lucide-react';
import { useAuthStore, useSettingsStore } from '@/store';

export default function Settings() {
  const { googleFlow, tiktok, shopee, lazada, clearGoogleFlowAuth, clearTikTokAuth, clearShopeeAuth, clearLazadaAuth } = useAuthStore();
  const { videoDefaults, automation, postSchedules, notifications, updateVideoDefaults, updateAutomation, updatePostSchedule, updateNotifications, resetToDefaults } = useSettingsStore();

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    // Settings are auto-saved by Zustand persist, but we can add explicit save feedback
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleConnectGoogle = () => {
    // Trigger OAuth flow via background script
    chrome.runtime.sendMessage({ type: 'AUTH_GOOGLE' });
  };

  const handleConnectTikTok = () => {
    chrome.runtime.sendMessage({ type: 'AUTH_TIKTOK' });
  };

  const handleConnectShopee = () => {
    chrome.runtime.sendMessage({ type: 'AUTH_SHOPEE' });
  };

  const handleConnectLazada = () => {
    chrome.runtime.sendMessage({ type: 'AUTH_LAZADA' });
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <SettingsIcon className="w-5 h-5 text-primary-500" />
        <h2 className="text-lg font-semibold text-gray-900">Settings</h2>
      </div>

      {/* Connected Accounts */}
      <div className="card p-4">
        <h3 className="flex items-center gap-2 text-sm font-medium text-gray-900 mb-3">
          <Link2 className="w-4 h-4" />
          Accounts Connected
        </h3>

        <div className="space-y-3">
          {/* Google Flow */}
          <AccountCard
            name="Google Flow"
            icon="🎬"
            isConnected={!!googleFlow?.accessToken}
            details={googleFlow ? `Credits: ${googleFlow.creditsRemaining}/${googleFlow.creditsTotal}` : undefined}
            email={googleFlow?.email}
            onConnect={handleConnectGoogle}
            onDisconnect={clearGoogleFlowAuth}
            onRefresh={() => chrome.runtime.sendMessage({ type: 'REFRESH_GOOGLE_CREDITS' })}
          />

          {/* TikTok */}
          <AccountCard
            name="TikTok Business"
            icon="🎵"
            isConnected={!!tiktok?.accessToken}
            details={tiktok?.displayName ? `@${tiktok.displayName}` : undefined}
            onConnect={handleConnectTikTok}
            onDisconnect={clearTikTokAuth}
          />

          {/* Shopee */}
          <AccountCard
            name="Shopee Seller"
            icon="🛒"
            isConnected={!!shopee?.accessToken}
            details={shopee?.shopName}
            onConnect={handleConnectShopee}
            onDisconnect={clearShopeeAuth}
          />

          {/* Lazada */}
          <AccountCard
            name="Lazada Seller"
            icon="🛍️"
            isConnected={!!lazada?.accessToken}
            details={lazada?.sellerName}
            onConnect={handleConnectLazada}
            onDisconnect={clearLazadaAuth}
          />
        </div>
      </div>

      {/* Video Defaults */}
      <div className="card p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-3">🎬 Video Defaults</h3>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Resolution</label>
            <select
              value={videoDefaults.resolution}
              onChange={(e) => updateVideoDefaults({ resolution: e.target.value as any })}
              className="input"
            >
              <option value="1080x1920">1080x1920 (9:16 Vertical)</option>
              <option value="1080x1080">1080x1080 (1:1 Square)</option>
              <option value="1920x1080">1920x1080 (16:9 Wide)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Default Duration</label>
            <select
              value={videoDefaults.duration}
              onChange={(e) => updateVideoDefaults({ duration: Number(e.target.value) as any })}
              className="input"
            >
              <option value={15}>15 seconds</option>
              <option value={30}>30 seconds</option>
              <option value={60}>60 seconds</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Music Volume: {videoDefaults.musicVolume}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={videoDefaults.musicVolume}
              onChange={(e) => updateVideoDefaults({ musicVolume: Number(e.target.value) })}
              className="w-full"
            />
          </div>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={videoDefaults.addWatermark}
              onChange={(e) => updateVideoDefaults({ addWatermark: e.target.checked })}
              className="rounded border-gray-300 text-primary-500 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700">Add my logo watermark</span>
          </label>
        </div>
      </div>

      {/* Automation */}
      <div className="card p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-3">🤖 Automation</h3>

        <div className="space-y-3">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={automation.autoDownload}
              onChange={(e) => updateAutomation({ autoDownload: e.target.checked })}
              className="rounded border-gray-300 text-primary-500 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700">Auto-download when complete</span>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={automation.autoPost}
              onChange={(e) => updateAutomation({ autoPost: e.target.checked })}
              className="rounded border-gray-300 text-primary-500 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700">Auto-post to connected platforms</span>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={automation.generateCaptions}
              onChange={(e) => updateAutomation({ generateCaptions: e.target.checked })}
              className="rounded border-gray-300 text-primary-500 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700">Generate captions in Thai</span>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={automation.addTrendingHashtags}
              onChange={(e) => updateAutomation({ addTrendingHashtags: e.target.checked })}
              className="rounded border-gray-300 text-primary-500 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700">Add trending hashtags</span>
          </label>
        </div>
      </div>

      {/* Post Schedule */}
      <div className="card p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-3">📅 Post Schedule</h3>

        <div className="space-y-3">
          {postSchedules.map((schedule) => (
            <div key={schedule.platform} className="flex items-center gap-3">
              <span className="text-lg w-6">
                {schedule.platform === 'tiktok' ? '🎵' : schedule.platform === 'shopee' ? '🛒' : '🛍️'}
              </span>
              <span className="text-sm text-gray-700 w-16 capitalize">{schedule.platform}</span>
              <select
                value={schedule.interval}
                onChange={(e) => updatePostSchedule(schedule.platform, { interval: e.target.value as any })}
                className="input flex-1"
              >
                <option value="manual">Manual only</option>
                <option value="hourly">Every hour</option>
                <option value="every2hours">Every 2 hours</option>
                <option value="every4hours">Every 4 hours</option>
                <option value="daily">Daily at specific time</option>
              </select>
            </div>
          ))}
        </div>
      </div>

      {/* Performance */}
      <div className="card p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-3">⚡ Performance</h3>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Max concurrent jobs</label>
            <select
              value={automation.maxConcurrentJobs}
              onChange={(e) => updateAutomation({ maxConcurrentJobs: Number(e.target.value) })}
              className="input"
            >
              <option value={1}>1 job</option>
              <option value={2}>2 jobs</option>
              <option value={3}>3 jobs</option>
              <option value={5}>5 jobs</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Retry failed</label>
            <select
              value={automation.retryFailedCount}
              onChange={(e) => updateAutomation({ retryFailedCount: Number(e.target.value) })}
              className="input"
            >
              <option value={0}>Don't retry</option>
              <option value={1}>1 time</option>
              <option value={2}>2 times</option>
              <option value={3}>3 times</option>
            </select>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="card p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-3">🔔 Notifications</h3>

        <div className="space-y-3">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={notifications.onComplete}
              onChange={(e) => updateNotifications({ onComplete: e.target.checked })}
              className="rounded border-gray-300 text-primary-500 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700">When video completes</span>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={notifications.onFailed}
              onChange={(e) => updateNotifications({ onFailed: e.target.checked })}
              className="rounded border-gray-300 text-primary-500 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700">When video fails</span>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={notifications.onViralAlert}
              onChange={(e) => updateNotifications({ onViralAlert: e.target.checked })}
              className="rounded border-gray-300 text-primary-500 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700">Viral alerts (1K+ views)</span>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={notifications.lowCreditsWarning}
              onChange={(e) => updateNotifications({ lowCreditsWarning: e.target.checked })}
              className="rounded border-gray-300 text-primary-500 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700">Low credits warning</span>
          </label>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={resetToDefaults}
          className="btn btn-secondary flex-1"
        >
          Reset to Defaults
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="btn btn-primary flex-1 flex items-center justify-center gap-2"
        >
          {isSaving ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : saveSuccess ? (
            <Check className="w-4 h-4" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saveSuccess ? 'Saved!' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}

interface AccountCardProps {
  name: string;
  icon: string;
  isConnected: boolean;
  details?: string;
  email?: string;
  onConnect: () => void;
  onDisconnect: () => void;
  onRefresh?: () => void;
}

function AccountCard({ name, icon, isConnected, details, email, onConnect, onDisconnect, onRefresh }: AccountCardProps) {
  return (
    <div className={`p-3 rounded-lg border ${isConnected ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900">{name}</span>
              {isConnected ? (
                <span className="text-xs text-green-600">✓ Active</span>
              ) : (
                <span className="text-xs text-yellow-600 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Not Connected
                </span>
              )}
            </div>
            {details && <p className="text-xs text-gray-500">{details}</p>}
            {email && <p className="text-xs text-gray-400">{email}</p>}
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          {isConnected && onRefresh && (
            <button onClick={onRefresh} className="btn-icon" title="Refresh">
              <RefreshCw className="w-4 h-4 text-gray-500" />
            </button>
          )}
          {isConnected ? (
            <button onClick={onDisconnect} className="text-xs text-red-600 hover:text-red-700">
              Disconnect
            </button>
          ) : (
            <button onClick={onConnect} className="btn btn-primary text-xs py-1 px-2">
              Connect
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
