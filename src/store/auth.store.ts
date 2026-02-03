import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AuthState, GoogleFlowAuth, TikTokAuth, ShopeeAuth, LazadaAuth } from '@/types';
import { encrypt, decrypt } from '@/utils/crypto.util';
import { createLogger } from '@/utils/logger.util';

const logger = createLogger('AuthStore');

interface AuthActions {
  setGoogleFlowAuth: (auth: GoogleFlowAuth) => Promise<void>;
  setTikTokAuth: (auth: TikTokAuth) => Promise<void>;
  setShopeeAuth: (auth: ShopeeAuth) => Promise<void>;
  setLazadaAuth: (auth: LazadaAuth) => Promise<void>;
  clearGoogleFlowAuth: () => void;
  clearTikTokAuth: () => void;
  clearShopeeAuth: () => void;
  clearLazadaAuth: () => void;
  clearAllAuth: () => void;
  updateCredits: (credits: number) => void;
  setLoading: (isLoading: boolean) => void;
  isAuthenticated: (platform: 'googleFlow' | 'tiktok' | 'shopee' | 'lazada') => boolean;
  isTokenExpired: (platform: 'googleFlow' | 'tiktok' | 'shopee' | 'lazada') => boolean;
}

const initialState: AuthState = {
  googleFlow: undefined,
  tiktok: undefined,
  shopee: undefined,
  lazada: undefined,
  isLoading: false,
  lastSynced: undefined,
};

// Custom storage with encryption
const encryptedStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      const result = await chrome.storage.local.get(name);
      if (result[name]) {
        const decrypted = await decrypt(result[name]);
        return decrypted;
      }
      return null;
    } catch (error) {
      logger.error('Failed to get encrypted storage', error);
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      const encrypted = await encrypt(value);
      await chrome.storage.local.set({ [name]: encrypted });
    } catch (error) {
      logger.error('Failed to set encrypted storage', error);
    }
  },
  removeItem: async (name: string): Promise<void> => {
    try {
      await chrome.storage.local.remove(name);
    } catch (error) {
      logger.error('Failed to remove from storage', error);
    }
  },
};

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      setGoogleFlowAuth: async (auth) => {
        logger.info('Setting Google Flow auth', { email: auth.email });
        set({ googleFlow: auth, lastSynced: Date.now() });
      },

      setTikTokAuth: async (auth) => {
        logger.info('Setting TikTok auth', { displayName: auth.displayName });
        set({ tiktok: auth, lastSynced: Date.now() });
      },

      setShopeeAuth: async (auth) => {
        logger.info('Setting Shopee auth', { shopName: auth.shopName });
        set({ shopee: auth, lastSynced: Date.now() });
      },

      setLazadaAuth: async (auth) => {
        logger.info('Setting Lazada auth', { sellerName: auth.sellerName });
        set({ lazada: auth, lastSynced: Date.now() });
      },

      clearGoogleFlowAuth: () => {
        logger.info('Clearing Google Flow auth');
        set({ googleFlow: undefined });
      },

      clearTikTokAuth: () => {
        logger.info('Clearing TikTok auth');
        set({ tiktok: undefined });
      },

      clearShopeeAuth: () => {
        logger.info('Clearing Shopee auth');
        set({ shopee: undefined });
      },

      clearLazadaAuth: () => {
        logger.info('Clearing Lazada auth');
        set({ lazada: undefined });
      },

      clearAllAuth: () => {
        logger.info('Clearing all auth');
        set(initialState);
      },

      updateCredits: (credits) => {
        const { googleFlow } = get();
        if (googleFlow) {
          set({
            googleFlow: { ...googleFlow, creditsRemaining: credits },
          });
        }
      },

      setLoading: (isLoading) => set({ isLoading }),

      isAuthenticated: (platform) => {
        const state = get();
        switch (platform) {
          case 'googleFlow':
            return !!state.googleFlow?.accessToken;
          case 'tiktok':
            return !!state.tiktok?.accessToken;
          case 'shopee':
            return !!state.shopee?.accessToken;
          case 'lazada':
            return !!state.lazada?.accessToken;
          default:
            return false;
        }
      },

      isTokenExpired: (platform) => {
        const state = get();
        const now = Date.now();
        switch (platform) {
          case 'googleFlow':
            return state.googleFlow ? state.googleFlow.expiresAt < now : true;
          case 'tiktok':
            return state.tiktok ? state.tiktok.expiresAt < now : true;
          case 'shopee':
            return state.shopee ? state.shopee.expiresAt < now : true;
          case 'lazada':
            return state.lazada ? state.lazada.expiresAt < now : true;
          default:
            return true;
        }
      },
    }),
    {
      name: 'flow-affiliate-auth',
      storage: createJSONStorage(() => encryptedStorage),
      partialize: (state) => ({
        googleFlow: state.googleFlow,
        tiktok: state.tiktok,
        shopee: state.shopee,
        lazada: state.lazada,
        lastSynced: state.lastSynced,
      }),
    }
  )
);
