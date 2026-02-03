import { API_CONFIG } from '@/config/api.config';
import type { 
  GoogleFlowGenerateRequest, 
  GoogleFlowGenerateResponse, 
  GoogleFlowStatusResponse,
  GoogleFlowCreditsResponse 
} from '@/types/api.types';
import { createLogger } from '@/utils/logger.util';
import { retry } from '@/utils';

const logger = createLogger('GoogleFlowService');

class GoogleFlowService {
  private baseUrl = API_CONFIG.googleFlow.baseUrl;
  private accessToken: string | null = null;

  setAccessToken(token: string): void {
    this.accessToken = token;
  }

  private async fetch<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    if (!this.accessToken) {
      throw new Error('Google Flow access token not set');
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
      logger.error('API error', { status: response.status, error });
      throw new Error(error.message || `API error: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Generate a video using Google Flow API
   */
  async generateVideo(params: {
    prompt: string;
    duration: number;
    aspectRatio: string;
    style?: string;
  }): Promise<GoogleFlowGenerateResponse> {
    logger.info('Generating video', { prompt: params.prompt.slice(0, 50) + '...' });

    const request: GoogleFlowGenerateRequest = {
      prompt: params.prompt,
      duration: params.duration,
      aspect_ratio: params.aspectRatio,
      style: params.style || 'dynamic',
    };

    return retry(
      () => this.fetch<GoogleFlowGenerateResponse>(
        API_CONFIG.googleFlow.endpoints.generate,
        {
          method: 'POST',
          body: JSON.stringify(request),
        }
      ),
      {
        maxRetries: 2,
        onRetry: (error, attempt) => {
          logger.warn(`Retry attempt ${attempt}`, { error: error.message });
        },
      }
    );
  }

  /**
   * Check video generation status
   */
  async checkStatus(jobId: string): Promise<GoogleFlowStatusResponse> {
    logger.debug('Checking job status', { jobId });

    return this.fetch<GoogleFlowStatusResponse>(
      `${API_CONFIG.googleFlow.endpoints.status}/${jobId}`
    );
  }

  /**
   * Get remaining credits
   */
  async getCredits(): Promise<GoogleFlowCreditsResponse> {
    logger.debug('Fetching credits');

    return this.fetch<GoogleFlowCreditsResponse>(
      API_CONFIG.googleFlow.endpoints.credits
    );
  }

  /**
   * Poll for video completion
   */
  async waitForCompletion(
    jobId: string,
    onProgress?: (progress: number) => void,
    timeout = API_CONFIG.googleFlow.timeout
  ): Promise<GoogleFlowStatusResponse> {
    const startTime = Date.now();
    const pollInterval = 3000; // 3 seconds

    while (Date.now() - startTime < timeout) {
      const status = await this.checkStatus(jobId);

      if (status.progress) {
        onProgress?.(status.progress);
      }

      if (status.status === 'completed') {
        logger.info('Video generation completed', { jobId });
        return status;
      }

      if (status.status === 'failed') {
        logger.error('Video generation failed', { jobId, error: status.error });
        throw new Error(status.error || 'Video generation failed');
      }

      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    throw new Error('Video generation timeout');
  }
}

// Singleton instance
export const googleFlowService = new GoogleFlowService();
