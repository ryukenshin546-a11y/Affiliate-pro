import { defineManifest } from '@crxjs/vite-plugin';

export default defineManifest({
  manifest_version: 3,
  name: 'Flow Affiliate Pro',
  version: '1.0.0',
  description: 'Chrome Extension สำหรับสร้างและโพสต์วิดีโอ Affiliate แบบอัตโนมัติผ่าน Google Flow',
  
  icons: {
    '16': 'icons/icon16.svg',
    '48': 'icons/icon48.svg',
    '128': 'icons/icon128.svg',
  },
  
  action: {
    default_icon: {
      '16': 'icons/icon16.svg',
      '48': 'icons/icon48.svg',
      '128': 'icons/icon128.svg',
    },
    default_title: 'Flow Affiliate Pro',
  },

  side_panel: {
    default_path: 'src/sidepanel/index.html',
  },
  
  background: {
    service_worker: 'src/background/service-worker.ts',
    type: 'module',
  },
  
  content_scripts: [
    {
      matches: ['https://labs.google/*', 'https://*.labs.google/*'],
      js: ['src/content-scripts/flow-controller.ts'],
      run_at: 'document_idle',
    },
    {
      matches: ['https://www.tiktok.com/*', 'https://*.tiktok.com/*'],
      js: ['src/content-scripts/tiktok-controller.ts'],
      run_at: 'document_idle',
    },
    {
      matches: ['https://seller.shopee.co.th/*', 'https://shopee.co.th/*'],
      js: ['src/content-scripts/shopee-controller.ts'],
      run_at: 'document_idle',
    },
    {
      matches: ['https://sellercenter.lazada.co.th/*', 'https://www.lazada.co.th/*'],
      js: ['src/content-scripts/lazada-controller.ts'],
      run_at: 'document_idle',
    },
  ],
  
  permissions: [
    'storage',
    'downloads',
    'notifications',
    'scripting',
    'tabs',
    'alarms',
    'identity',
    'sidePanel',
  ],
  
  host_permissions: [
    'https://labs.google/*',
    'https://*.labs.google/*',
    'https://storage.googleapis.com/*',
    'https://open.tiktokapis.com/*',
    'https://www.tiktok.com/*',
    'https://*.tiktok.com/*',
    'https://seller.shopee.co.th/*',
    'https://shopee.co.th/*',
    'https://sellercenter.lazada.co.th/*',
    'https://www.lazada.co.th/*',
    'https://*.lazada.co.th/*',
  ],
  
  content_security_policy: {
    extension_pages: "script-src 'self'; object-src 'self'",
  },
  
  web_accessible_resources: [
    {
      resources: ['icons/*', 'templates/*'],
      matches: ['<all_urls>'],
    },
  ],
  
  oauth2: {
    client_id: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',
    scopes: [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ],
  },
});
