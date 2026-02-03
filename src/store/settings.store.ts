import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { SettingsState, VideoDefaults, AutomationSettings, PostSchedule } from '@/types';
import { DEFAULT_SETTINGS } from '@/config/constants';
import { createLogger } from '@/utils/logger.util';

const logger = createLogger('SettingsStore');

interface SettingsActions {
  updateVideoDefaults: (defaults: Partial<VideoDefaults>) => void;
  updateAutomation: (automation: Partial<AutomationSettings>) => void;
  updatePostSchedule: (platform: string, schedule: Partial<PostSchedule>) => void;
  updateNotifications: (notifications: Partial<SettingsState['notifications']>) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setLanguage: (language: 'th' | 'en') => void;
  resetToDefaults: () => void;
}

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

export const useSettingsStore = create<SettingsState & SettingsActions>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,

      updateVideoDefaults: (defaults) => {
        logger.info('Updating video defaults', defaults);
        set((state) => ({
          videoDefaults: { ...state.videoDefaults, ...defaults },
        }));
      },

      updateAutomation: (automation) => {
        logger.info('Updating automation settings', automation);
        set((state) => ({
          automation: { ...state.automation, ...automation },
        }));
      },

      updatePostSchedule: (platform, schedule) => {
        logger.info('Updating post schedule', { platform, schedule });
        set((state) => ({
          postSchedules: state.postSchedules.map((ps) =>
            ps.platform === platform ? { ...ps, ...schedule } : ps
          ),
        }));
      },

      updateNotifications: (notifications) => {
        logger.info('Updating notification settings', notifications);
        set((state) => ({
          notifications: { ...state.notifications, ...notifications },
        }));
      },

      setTheme: (theme) => {
        logger.info('Setting theme', { theme });
        set({ theme });
        
        // Apply theme to document
        if (theme === 'dark') {
          document.documentElement.classList.add('dark');
        } else if (theme === 'light') {
          document.documentElement.classList.remove('dark');
        } else {
          // System preference
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          document.documentElement.classList.toggle('dark', prefersDark);
        }
      },

      setLanguage: (language) => {
        logger.info('Setting language', { language });
        set({ language });
      },

      resetToDefaults: () => {
        logger.info('Resetting settings to defaults');
        set(DEFAULT_SETTINGS);
      },
    }),
    {
      name: 'flow-affiliate-settings',
      storage: createJSONStorage(() => chromeStorage),
    }
  )
);
