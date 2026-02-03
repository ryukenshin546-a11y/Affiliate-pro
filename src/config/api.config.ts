// API Configuration
export const API_CONFIG = {
  googleFlow: {
    baseUrl: 'https://labs.google.com/api/flow/v1',
    endpoints: {
      generate: '/generate',
      status: '/status',
      credits: '/credits',
    },
    timeout: 300000, // 5 minutes for video generation
  },
  tiktok: {
    baseUrl: 'https://open.tiktokapis.com/v2',
    endpoints: {
      uploadInit: '/post/publish/video/init/',
      uploadStatus: '/post/publish/status/fetch/',
      userInfo: '/user/info/',
    },
    chunkSize: 10 * 1024 * 1024, // 10MB
    timeout: 60000,
  },
  shopee: {
    sellerCenterUrl: 'https://seller.shopee.co.th',
    timeout: 30000,
  },
  lazada: {
    sellerCenterUrl: 'https://sellercenter.lazada.co.th',
    timeout: 30000,
  },
} as const;

// OAuth Configuration
export const OAUTH_CONFIG = {
  googleFlow: {
    clientId: import.meta.env.VITE_GOOGLE_FLOW_CLIENT_ID || '',
    clientSecret: import.meta.env.VITE_GOOGLE_FLOW_CLIENT_SECRET || '',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: [
      'openid',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ],
    redirectUri: chrome.identity?.getRedirectURL?.() || '',
  },
  tiktok: {
    clientId: import.meta.env.VITE_TIKTOK_CLIENT_KEY || '',
    clientSecret: import.meta.env.VITE_TIKTOK_CLIENT_SECRET || '',
    authUrl: 'https://www.tiktok.com/v2/auth/authorize/',
    tokenUrl: 'https://open.tiktokapis.com/v2/oauth/token/',
    scopes: ['user.info.basic', 'video.publish', 'video.upload'],
    redirectUri: chrome.identity?.getRedirectURL?.() || '',
  },
  shopee: {
    partnerId: import.meta.env.VITE_SHOPEE_PARTNER_ID || '',
    partnerKey: import.meta.env.VITE_SHOPEE_PARTNER_KEY || '',
    authUrl: 'https://partner.shopeemobile.com/api/v2/shop/auth_partner',
    tokenUrl: 'https://partner.shopeemobile.com/api/v2/auth/token/get',
    redirectUri: chrome.identity?.getRedirectURL?.() || '',
  },
  lazada: {
    appKey: import.meta.env.VITE_LAZADA_APP_KEY || '',
    appSecret: import.meta.env.VITE_LAZADA_APP_SECRET || '',
    authUrl: 'https://auth.lazada.com/oauth/authorize',
    tokenUrl: 'https://auth.lazada.com/rest/auth/token/create',
    redirectUri: chrome.identity?.getRedirectURL?.() || '',
  },
} as const;

export type ApiConfigType = typeof API_CONFIG;
export type OAuthConfigType = typeof OAUTH_CONFIG;
