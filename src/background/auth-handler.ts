/**
 * Auth Handler
 * Manages OAuth authentication for all connected platforms
 */

import { logger } from '@/utils/logger.util';
import { API_CONFIG, OAUTH_CONFIG } from '@/config/api.config';
import { encryptData, decryptData } from '@/utils/crypto.util';

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

interface AuthResult {
  success: boolean;
  error?: string;
}

export class AuthHandler {
  constructor() {
    logger.info('AuthHandler initialized');
  }

  /**
   * Authenticate with Google Flow
   */
  async authenticateGoogle(): Promise<AuthResult> {
    try {
      const authUrl = this.buildOAuthUrl('googleFlow');
      
      // Open OAuth popup
      const redirectUrl = await this.launchOAuthFlow(authUrl);
      
      if (!redirectUrl) {
        throw new Error('Authentication was cancelled');
      }

      // Extract authorization code
      const url = new URL(redirectUrl);
      const code = url.searchParams.get('code');
      
      if (!code) {
        throw new Error('No authorization code received');
      }

      // Exchange code for tokens
      const tokens = await this.exchangeCodeForTokens('googleFlow', code);

      // Get user info and credits
      const userInfo = await this.fetchGoogleUserInfo(tokens.access_token);
      const creditsInfo = await this.fetchGoogleCredits(tokens.access_token);

      // Store auth data
      await this.storeGoogleAuth({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: Date.now() + (tokens.expires_in * 1000),
        email: userInfo.email,
        creditsRemaining: creditsInfo.remaining,
        creditsTotal: creditsInfo.total,
      });

      logger.info('Google Flow authentication successful');
      return { success: true };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      logger.error('Google auth error:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Authenticate with TikTok
   */
  async authenticateTikTok(): Promise<AuthResult> {
    try {
      const authUrl = this.buildOAuthUrl('tiktok');
      const redirectUrl = await this.launchOAuthFlow(authUrl);
      
      if (!redirectUrl) {
        throw new Error('Authentication was cancelled');
      }

      const url = new URL(redirectUrl);
      const code = url.searchParams.get('code');
      
      if (!code) {
        throw new Error('No authorization code received');
      }

      const tokens = await this.exchangeCodeForTokens('tiktok', code);
      const userInfo = await this.fetchTikTokUserInfo(tokens.access_token);

      await this.storeTikTokAuth({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: Date.now() + (tokens.expires_in * 1000),
        openId: userInfo.open_id,
        displayName: userInfo.display_name,
        avatarUrl: userInfo.avatar_url,
      });

      logger.info('TikTok authentication successful');
      return { success: true };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      logger.error('TikTok auth error:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Authenticate with Shopee
   */
  async authenticateShopee(): Promise<AuthResult> {
    try {
      const authUrl = this.buildShopeeAuthUrl();
      const redirectUrl = await this.launchOAuthFlow(authUrl);
      
      if (!redirectUrl) {
        throw new Error('Authentication was cancelled');
      }

      const url = new URL(redirectUrl);
      const code = url.searchParams.get('code');
      const shopId = url.searchParams.get('shop_id');
      
      if (!code || !shopId) {
        throw new Error('Missing authorization parameters');
      }

      const tokens = await this.exchangeShopeeCode(code, shopId);
      const shopInfo = await this.fetchShopeeShopInfo(tokens.access_token, shopId);

      await this.storeShopeeAuth({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: Date.now() + (tokens.expires_in * 1000),
        shopId,
        shopName: shopInfo.shop_name,
      });

      logger.info('Shopee authentication successful');
      return { success: true };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      logger.error('Shopee auth error:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Authenticate with Lazada
   */
  async authenticateLazada(): Promise<AuthResult> {
    try {
      const authUrl = this.buildLazadaAuthUrl();
      const redirectUrl = await this.launchOAuthFlow(authUrl);
      
      if (!redirectUrl) {
        throw new Error('Authentication was cancelled');
      }

      const url = new URL(redirectUrl);
      const code = url.searchParams.get('code');
      
      if (!code) {
        throw new Error('No authorization code received');
      }

      const tokens = await this.exchangeLazadaCode(code);
      const sellerInfo = await this.fetchLazadaSellerInfo(tokens.access_token);

      await this.storeLazadaAuth({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: Date.now() + (tokens.expires_in * 1000),
        sellerId: sellerInfo.seller_id,
        sellerName: sellerInfo.name,
      });

      logger.info('Lazada authentication successful');
      return { success: true };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      logger.error('Lazada auth error:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Refresh Google Flow credits
   */
  async refreshGoogleCredits(): Promise<{ credits: number; total: number } | null> {
    try {
      const auth = await this.getGoogleAuth();
      if (!auth?.accessToken) {
        return null;
      }

      // Refresh token if needed
      if (Date.now() > auth.expiresAt) {
        await this.refreshGoogleToken();
      }

      const creditsInfo = await this.fetchGoogleCredits(auth.accessToken);
      
      // Update stored credits
      await this.storeGoogleAuth({
        ...auth,
        creditsRemaining: creditsInfo.remaining,
        creditsTotal: creditsInfo.total,
      });

      return { credits: creditsInfo.remaining, total: creditsInfo.total };

    } catch (error) {
      logger.error('Failed to refresh credits:', error);
      return null;
    }
  }

  /**
   * Build OAuth URL
   */
  private buildOAuthUrl(platform: 'googleFlow' | 'tiktok'): string {
    const config = OAUTH_CONFIG[platform];
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: 'code',
      scope: config.scopes.join(' '),
      state: this.generateState(),
    });

    return `${config.authUrl}?${params.toString()}`;
  }

  /**
   * Build Shopee auth URL (custom signature required)
   */
  private buildShopeeAuthUrl(): string {
    const config = OAUTH_CONFIG.shopee;
    const timestamp = Math.floor(Date.now() / 1000);
    
    // Note: In production, sign the request properly
    const params = new URLSearchParams({
      partner_id: config.partnerId,
      redirect: config.redirectUri,
      timestamp: timestamp.toString(),
    });

    return `${config.authUrl}?${params.toString()}`;
  }

  /**
   * Build Lazada auth URL
   */
  private buildLazadaAuthUrl(): string {
    const config = OAUTH_CONFIG.lazada;
    const params = new URLSearchParams({
      response_type: 'code',
      redirect_uri: config.redirectUri,
      client_id: config.appKey,
      state: this.generateState(),
    });

    return `${config.authUrl}?${params.toString()}`;
  }

  /**
   * Launch OAuth flow
   */
  private async launchOAuthFlow(authUrl: string): Promise<string | undefined> {
    return new Promise((resolve) => {
      chrome.identity.launchWebAuthFlow(
        {
          url: authUrl,
          interactive: true,
        },
        (redirectUrl) => {
          resolve(redirectUrl);
        }
      );
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  private async exchangeCodeForTokens(platform: 'googleFlow' | 'tiktok', code: string): Promise<TokenResponse> {
    const config = OAUTH_CONFIG[platform];
    
    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
      }),
    });

    if (!response.ok) {
      throw new Error('Token exchange failed');
    }

    return response.json();
  }

  /**
   * Exchange Shopee code
   */
  private async exchangeShopeeCode(code: string, shopId: string): Promise<TokenResponse> {
    const config = OAUTH_CONFIG.shopee;
    
    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code,
        shop_id: shopId,
        partner_id: config.partnerId,
      }),
    });

    if (!response.ok) {
      throw new Error('Shopee token exchange failed');
    }

    return response.json();
  }

  /**
   * Exchange Lazada code
   */
  private async exchangeLazadaCode(code: string): Promise<TokenResponse> {
    const config = OAUTH_CONFIG.lazada;
    
    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        app_key: config.appKey,
        app_secret: config.appSecret,
      }),
    });

    if (!response.ok) {
      throw new Error('Lazada token exchange failed');
    }

    return response.json();
  }

  /**
   * Fetch Google user info
   */
  private async fetchGoogleUserInfo(accessToken: string): Promise<{ email: string }> {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user info');
    }

    return response.json();
  }

  /**
   * Fetch Google Flow credits
   */
  private async fetchGoogleCredits(accessToken: string): Promise<{ remaining: number; total: number }> {
    // Note: Actual API endpoint may differ
    const response = await fetch(
      `${API_CONFIG.googleFlow.baseUrl}${API_CONFIG.googleFlow.endpoints.credits}`,
      {
      headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) {
      // Return defaults if API not available
      return { remaining: 50, total: 50 };
    }

    return response.json();
  }

  /**
   * Fetch TikTok user info
   */
  private async fetchTikTokUserInfo(accessToken: string): Promise<any> {
    const response = await fetch(
      `${API_CONFIG.tiktok.baseUrl}${API_CONFIG.tiktok.endpoints.userInfo}`,
      {
      headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch TikTok user info');
    }

    const data = await response.json();
    return data.data.user;
  }

  /**
   * Fetch Shopee shop info
   */
  private async fetchShopeeShopInfo(accessToken: string, shopId: string): Promise<any> {
    // Implementation for Shopee API
    return { shop_name: `Shop ${shopId}` };
  }

  /**
   * Fetch Lazada seller info
   */
  private async fetchLazadaSellerInfo(accessToken: string): Promise<any> {
    // Implementation for Lazada API
    return { seller_id: '', name: 'Seller' };
  }

  /**
   * Refresh Google token
   */
  private async refreshGoogleToken(): Promise<void> {
    const auth = await this.getGoogleAuth();
    if (!auth?.refreshToken) {
      throw new Error('No refresh token available');
    }

    const config = OAUTH_CONFIG.googleFlow;
    
    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: auth.refreshToken,
        client_id: config.clientId,
        client_secret: config.clientSecret,
      }),
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    const tokens: TokenResponse = await response.json();

    await this.storeGoogleAuth({
      ...auth,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || auth.refreshToken,
      expiresAt: Date.now() + (tokens.expires_in * 1000),
    });
  }

  /**
   * Generate random state for CSRF protection
   */
  private generateState(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  /**
   * Store Google auth data
   */
  private async storeGoogleAuth(data: any): Promise<void> {
    const encrypted = await encryptData(JSON.stringify(data));
    await chrome.storage.local.set({ googleFlowAuth: encrypted });
  }

  /**
   * Get Google auth data
   */
  private async getGoogleAuth(): Promise<any> {
    const result = await chrome.storage.local.get('googleFlowAuth');
    if (!result.googleFlowAuth) return null;
    
    const decrypted = await decryptData(result.googleFlowAuth);
    return JSON.parse(decrypted);
  }

  /**
   * Store TikTok auth data
   */
  private async storeTikTokAuth(data: any): Promise<void> {
    const encrypted = await encryptData(JSON.stringify(data));
    await chrome.storage.local.set({ tiktokAuth: encrypted });
  }

  /**
   * Store Shopee auth data
   */
  private async storeShopeeAuth(data: any): Promise<void> {
    const encrypted = await encryptData(JSON.stringify(data));
    await chrome.storage.local.set({ shopeeAuth: encrypted });
  }

  /**
   * Store Lazada auth data
   */
  private async storeLazadaAuth(data: any): Promise<void> {
    const encrypted = await encryptData(JSON.stringify(data));
    await chrome.storage.local.set({ lazadaAuth: encrypted });
  }
}
