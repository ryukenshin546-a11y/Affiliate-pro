/**
 * useAuth Hook
 * Manages authentication state and operations
 */

import { useCallback, useMemo } from 'react';
import { useAuthStore } from '@/store';
import type { Platform, GoogleFlowAuth, TikTokAuth, ShopeeAuth, LazadaAuth } from '@/types';

interface AuthStatus {
  googleFlow: boolean;
  tiktok: boolean;
  shopee: boolean;
  lazada: boolean;
}

interface UseAuthReturn {
  isAuthenticated: AuthStatus;
  isAnyAuthenticated: boolean;
  isAllAuthenticated: boolean;
  googleFlow: GoogleFlowAuth | undefined;
  tiktok: TikTokAuth | undefined;
  shopee: ShopeeAuth | undefined;
  lazada: LazadaAuth | undefined;
  connectGoogle: () => Promise<void>;
  connectTikTok: () => Promise<void>;
  connectShopee: () => Promise<void>;
  connectLazada: () => Promise<void>;
  disconnectGoogle: () => void;
  disconnectTikTok: () => void;
  disconnectShopee: () => void;
  disconnectLazada: () => void;
  refreshCredits: () => Promise<void>;
  isConnected: (platform: Platform | 'googleFlow') => boolean;
  getCredits: () => { remaining: number; total: number } | null;
}

export function useAuth(): UseAuthReturn {
  const store = useAuthStore();

  const isAuthenticated = useMemo((): AuthStatus => ({
    googleFlow: !!store.googleFlow?.accessToken,
    tiktok: !!store.tiktok?.accessToken,
    shopee: !!store.shopee?.accessToken,
    lazada: !!store.lazada?.accessToken,
  }), [store.googleFlow, store.tiktok, store.shopee, store.lazada]);

  const isAnyAuthenticated = Object.values(isAuthenticated).some(v => v);
  const isAllAuthenticated = Object.values(isAuthenticated).every(v => v);

  const connectGoogle = useCallback(async () => {
    chrome.runtime.sendMessage({ type: 'AUTH_GOOGLE' });
  }, []);

  const connectTikTok = useCallback(async () => {
    chrome.runtime.sendMessage({ type: 'AUTH_TIKTOK' });
  }, []);

  const connectShopee = useCallback(async () => {
    chrome.runtime.sendMessage({ type: 'AUTH_SHOPEE' });
  }, []);

  const connectLazada = useCallback(async () => {
    chrome.runtime.sendMessage({ type: 'AUTH_LAZADA' });
  }, []);

  const refreshCredits = useCallback(async () => {
    chrome.runtime.sendMessage({ type: 'REFRESH_GOOGLE_CREDITS' });
  }, []);

  const isConnected = useCallback((platform: Platform | 'googleFlow'): boolean => {
    switch (platform) {
      case 'googleFlow':
        return isAuthenticated.googleFlow;
      case 'tiktok':
        return isAuthenticated.tiktok;
      case 'shopee':
        return isAuthenticated.shopee;
      case 'lazada':
        return isAuthenticated.lazada;
      default:
        return false;
    }
  }, [isAuthenticated]);

  const getCredits = useCallback(() => {
    if (!store.googleFlow) return null;
    return {
      remaining: store.googleFlow.creditsRemaining,
      total: store.googleFlow.creditsTotal,
    };
  }, [store.googleFlow]);

  return {
    isAuthenticated,
    isAnyAuthenticated,
    isAllAuthenticated,
    googleFlow: store.googleFlow,
    tiktok: store.tiktok,
    shopee: store.shopee,
    lazada: store.lazada,
    connectGoogle,
    connectTikTok,
    connectShopee,
    connectLazada,
    disconnectGoogle: store.clearGoogleFlowAuth,
    disconnectTikTok: store.clearTikTokAuth,
    disconnectShopee: store.clearShopeeAuth,
    disconnectLazada: store.clearLazadaAuth,
    refreshCredits,
    isConnected,
    getCredits,
  };
}
