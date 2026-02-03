import { API_CONFIG } from '@/config/api.config';
import type { 
  TikTokUploadInitRequest, 
  TikTokUploadInitResponse,
  TikTokPublishStatusResponse,
  TikTokUserInfoResponse 
} from '@/types/api.types';
import { createLogger } from '@/utils/logger.util';
import { retry } from '@/utils';

const logger = createLogger('TikTokService');

class TikTokService {
  private baseUrl = API_CONFIG.tiktok.baseUrl;
  private accessToken: string | null = null;

  setAccessToken(token: string): void {
    this.accessToken = token;
  }

  private async fetch<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    if (!this.accessToken) {
      throw new Error('TikTok access token not set');
    }

    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      logger.error('TikTok API error', { status: response.status, error });
      throw new Error(error.error?.message || `API error: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Get user info
   */
  async getUserInfo(): Promise<TikTokUserInfoResponse> {
    logger.debug('Fetching user info');

    return this.fetch<TikTokUserInfoResponse>(
      `${API_CONFIG.tiktok.endpoints.userInfo}?fields=open_id,union_id,avatar_url,display_name,bio_description,follower_count,following_count,likes_count,video_count`
    );
  }

  /**
   * Initialize video upload
   */
  async initializeUpload(
    videoFile: File | Blob,
    metadata: {
      title: string;
      privacyLevel?: 'PUBLIC_TO_EVERYONE' | 'MUTUAL_FOLLOW_FRIENDS' | 'FOLLOWER_OF_CREATOR' | 'SELF_ONLY';
      disableDuet?: boolean;
      disableComment?: boolean;
      disableStitch?: boolean;
    }
  ): Promise<TikTokUploadInitResponse> {
    logger.info('Initializing video upload', { title: metadata.title });

    const chunkSize = API_CONFIG.tiktok.chunkSize;
    const totalChunks = Math.ceil(videoFile.size / chunkSize);

    const request: TikTokUploadInitRequest = {
      post_info: {
        title: metadata.title,
        privacy_level: metadata.privacyLevel || 'PUBLIC_TO_EVERYONE',
        disable_duet: metadata.disableDuet ?? false,
        disable_comment: metadata.disableComment ?? false,
        disable_stitch: metadata.disableStitch ?? false,
        video_cover_timestamp_ms: 1000,
      },
      source_info: {
        source: 'FILE_UPLOAD',
        video_size: videoFile.size,
        chunk_size: chunkSize,
        total_chunk_count: totalChunks,
      },
    };

    return this.fetch<TikTokUploadInitResponse>(
      API_CONFIG.tiktok.endpoints.uploadInit,
      {
        method: 'POST',
        body: JSON.stringify(request),
      }
    );
  }

  /**
   * Upload video chunks
   */
  async uploadChunks(
    videoFile: File | Blob,
    uploadUrl: string,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    const chunkSize = API_CONFIG.tiktok.chunkSize;
    const totalChunks = Math.ceil(videoFile.size / chunkSize);

    logger.info('Uploading video chunks', { totalChunks, fileSize: videoFile.size });

    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, videoFile.size);
      const chunk = videoFile.slice(start, end);

      await retry(
        () => fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Range': `bytes ${start}-${end - 1}/${videoFile.size}`,
            'Content-Type': 'video/mp4',
          },
          body: chunk,
        }),
        { maxRetries: 3 }
      );

      const progress = Math.round(((i + 1) / totalChunks) * 100);
      onProgress?.(progress);
      logger.debug(`Chunk ${i + 1}/${totalChunks} uploaded`, { progress });
    }
  }

  /**
   * Check publish status
   */
  async checkPublishStatus(publishId: string): Promise<TikTokPublishStatusResponse> {
    logger.debug('Checking publish status', { publishId });

    return this.fetch<TikTokPublishStatusResponse>(
      API_CONFIG.tiktok.endpoints.uploadStatus,
      {
        method: 'POST',
        body: JSON.stringify({ publish_id: publishId }),
      }
    );
  }

  /**
   * Upload and publish video
   */
  async uploadVideo(
    videoFile: File | Blob,
    metadata: {
      caption: string;
      hashtags?: string[];
    },
    onProgress?: (stage: string, progress: number) => void
  ): Promise<{ success: boolean; publishId?: string; error?: string }> {
    try {
      // Step 1: Initialize upload
      onProgress?.('initializing', 0);
      const initResponse = await this.initializeUpload(videoFile, {
        title: metadata.caption,
      });

      if (initResponse.error) {
        throw new Error(initResponse.error.message);
      }

      const { publish_id, upload_url } = initResponse.data;

      // Step 2: Upload chunks
      onProgress?.('uploading', 0);
      await this.uploadChunks(videoFile, upload_url, (progress) => {
        onProgress?.('uploading', progress);
      });

      // Step 3: Wait for processing
      onProgress?.('processing', 0);
      const maxWaitTime = 5 * 60 * 1000; // 5 minutes
      const startTime = Date.now();

      while (Date.now() - startTime < maxWaitTime) {
        const status = await this.checkPublishStatus(publish_id);

        if (status.data.status === 'PUBLISH_COMPLETE') {
          logger.info('Video published successfully', { publishId: publish_id });
          onProgress?.('complete', 100);
          return { success: true, publishId: publish_id };
        }

        if (status.data.status === 'FAILED') {
          throw new Error(status.data.fail_reason || 'Upload failed');
        }

        await new Promise((resolve) => setTimeout(resolve, 3000));
      }

      throw new Error('Upload timeout');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Video upload failed', { error: message });
      return { success: false, error: message };
    }
  }
}

// Singleton instance
export const tiktokService = new TikTokService();
