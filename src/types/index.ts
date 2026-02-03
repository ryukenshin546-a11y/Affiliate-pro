export * from './video.types';
export * from './api.types';
export * from './storage.types';

// Common utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Nullable<T> = T | null;

export type AsyncResult<T, E = Error> = Promise<{ success: true; data: T } | { success: false; error: E }>;

// Message types for communication between contexts
export type MessageType = 
  | 'CREATE_VIDEO'
  | 'CANCEL_VIDEO'
  | 'GET_QUEUE_STATUS'
  | 'UPDATE_SETTINGS'
  | 'SYNC_ANALYTICS'
  | 'AUTH_GOOGLE'
  | 'AUTH_TIKTOK'
  | 'AUTH_SHOPEE'
  | 'AUTH_LAZADA'
  | 'LOGOUT'
  | 'DOWNLOAD_VIDEO'
  | 'POST_TO_PLATFORM'
  | 'SCRAPE_PRODUCT'
  | 'FLOW_AUTOMATION_START'
  | 'FLOW_AUTOMATION_STATUS'
  | 'FLOW_AUTOMATION_COMPLETE';

export interface ExtensionMessage<T = unknown> {
  type: MessageType;
  payload?: T;
  tabId?: number;
  timestamp?: number;
}

export interface ExtensionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
