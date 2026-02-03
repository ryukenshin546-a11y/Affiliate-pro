/**
 * useVideoCreator Hook
 * Manages video creation workflow
 */

import { useState, useCallback } from 'react';
import { useQueueStore, useAuthStore, useSettingsStore } from '@/store';
import { scraperService, promptGeneratorService } from '@/services';
import type { VideoSettings, Platform, ProductInfo } from '@/types';
import { isValidProductUrl } from '@/utils/validator.util';

interface VideoCreatorState {
  isLoading: boolean;
  isGenerating: boolean;
  error: string | null;
  currentStep: 'idle' | 'scraping' | 'generating' | 'complete';
}

interface UseVideoCreatorReturn {
  state: VideoCreatorState;
  createVideo: (input: string, settings?: Partial<VideoSettings>, platforms?: Platform[]) => Promise<string | null>;
  createFromProduct: (product: ProductInfo, settings?: Partial<VideoSettings>, platforms?: Platform[]) => Promise<string | null>;
  addToQueue: (input: string, settings?: Partial<VideoSettings>, platforms?: Platform[]) => Promise<string>;
  generatePrompt: (product: ProductInfo, template?: VideoSettings['template'], customPrompt?: string) => Promise<string>;
  reset: () => void;
}

export function useVideoCreator(): UseVideoCreatorReturn {
  const [state, setState] = useState<VideoCreatorState>({
    isLoading: false,
    isGenerating: false,
    error: null,
    currentStep: 'idle',
  });

  const { addJob, startJob } = useQueueStore();
  const { googleFlow } = useAuthStore();
  const { videoDefaults } = useSettingsStore();

  const reset = useCallback(() => {
    setState({
      isLoading: false,
      isGenerating: false,
      error: null,
      currentStep: 'idle',
    });
  }, []);

  const extractProductFromInput = useCallback(async (input: string): Promise<ProductInfo> => {
    if (isValidProductUrl(input)) {
      setState(prev => ({ ...prev, currentStep: 'scraping' }));
      
      const result = await scraperService.scrapeProduct(input);
      
      if (result.success && result.data) {
        return {
          name: result.data.name,
          url: result.data.url,
          price: result.data.price,
          currency: result.data.currency,
          imageUrl: result.data.imageUrl,
          description: result.data.description,
          category: result.data.category,
          seller: result.data.seller,
          rating: result.data.rating,
          reviews: result.data.reviews,
        };
      }

      // Fallback to basic extraction
      const basicInfo = scraperService.extractBasicInfo(input);
      return {
        name: basicInfo.name || 'Product',
        url: input,
        price: 0,
        currency: 'THB',
        imageUrl: '',
      };
    }

    // Input is text description
    return {
      name: input.slice(0, 100),
      url: '',
      price: 0,
      currency: 'THB',
      description: input,
      imageUrl: '',
    };
  }, []);

  const generatePrompt = useCallback(async (
    product: ProductInfo,
    template?: VideoSettings['template'],
    customPrompt?: string
  ): Promise<string> => {
    const promptSettings: VideoSettings = {
      template: template ?? 'product-review',
      duration: videoDefaults.duration,
      aspectRatio: '9:16',
      style: 'dynamic',
      includeMusic: true,
      includeVoiceover: false,
      includePriceSticker: true,
      includeCTA: true,
    };

    return promptGeneratorService.generatePrompt(product, promptSettings, customPrompt);
  }, [videoDefaults.duration]);

  const createVideo = useCallback(async (
    input: string,
    settings?: Partial<VideoSettings>,
    platforms: Platform[] = ['tiktok']
  ): Promise<string | null> => {
    if (!googleFlow?.accessToken) {
      setState(prev => ({ ...prev, error: 'Please connect your Google Flow account first' }));
      return null;
    }

    setState({
      isLoading: true,
      isGenerating: false,
      error: null,
      currentStep: 'scraping',
    });

    try {
      // Extract product info
      const product = await extractProductFromInput(input);

      // Generate prompt
      const prompt = await generatePrompt(product);

      // Merge settings with defaults
      const finalSettings: VideoSettings = {
        template: settings?.template || 'product-review',
        duration: settings?.duration || videoDefaults.duration,
        aspectRatio: settings?.aspectRatio || '9:16',
        style: settings?.style || 'dynamic',
        includeMusic: settings?.includeMusic ?? true,
        includeVoiceover: settings?.includeVoiceover ?? false,
        includePriceSticker: settings?.includePriceSticker ?? true,
        includeCTA: settings?.includeCTA ?? true,
      };

      // Add job to queue
      const job = addJob({
        product,
        prompt,
        settings: finalSettings,
        platforms,
      });

      setState(prev => ({ ...prev, currentStep: 'generating', isGenerating: true }));

      // Start job processing
      startJob(job.id);

      // Send to background script
      chrome.runtime.sendMessage({
        type: 'CREATE_VIDEO',
        payload: { jobId: job.id },
      });

      return job.id;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create video';
      setState(prev => ({ ...prev, error: errorMessage }));
      return null;

    } finally {
      setState(prev => ({
        ...prev,
        isLoading: false,
        isGenerating: false,
        currentStep: 'complete',
      }));
    }
  }, [googleFlow, addJob, startJob, extractProductFromInput, generatePrompt, videoDefaults]);

  const createFromProduct = useCallback(async (
    product: ProductInfo,
    settings?: Partial<VideoSettings>,
    platforms: Platform[] = ['tiktok']
  ): Promise<string | null> => {
    if (!googleFlow?.accessToken) {
      setState(prev => ({ ...prev, error: 'Please connect your Google Flow account first' }));
      return null;
    }

    setState({
      isLoading: true,
      isGenerating: false,
      error: null,
      currentStep: 'generating',
    });

    try {
      // Generate prompt
      const prompt = await generatePrompt(product);

      // Merge settings
      const finalSettings: VideoSettings = {
        template: settings?.template || 'product-review',
        duration: settings?.duration || videoDefaults.duration,
        aspectRatio: settings?.aspectRatio || '9:16',
        style: settings?.style || 'dynamic',
        includeMusic: settings?.includeMusic ?? true,
        includeVoiceover: settings?.includeVoiceover ?? false,
        includePriceSticker: settings?.includePriceSticker ?? true,
        includeCTA: settings?.includeCTA ?? true,
      };

      // Add and start job
      const job = addJob({
        product,
        prompt,
        settings: finalSettings,
        platforms,
      });

      startJob(job.id);

      chrome.runtime.sendMessage({
        type: 'CREATE_VIDEO',
        payload: { jobId: job.id },
      });

      setState(prev => ({ ...prev, isGenerating: true }));

      return job.id;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create video';
      setState(prev => ({ ...prev, error: errorMessage }));
      return null;

    } finally {
      setState(prev => ({
        ...prev,
        isLoading: false,
        currentStep: 'complete',
      }));
    }
  }, [googleFlow, addJob, startJob, generatePrompt, videoDefaults]);

  const addToQueue = useCallback(async (
    input: string,
    settings?: Partial<VideoSettings>,
    platforms: Platform[] = ['tiktok']
  ): Promise<string> => {
    const product = await extractProductFromInput(input);
    const prompt = await generatePrompt(product);

    const finalSettings: VideoSettings = {
      template: settings?.template || 'product-review',
      duration: settings?.duration || videoDefaults.duration,
      aspectRatio: settings?.aspectRatio || '9:16',
      style: settings?.style || 'dynamic',
      includeMusic: settings?.includeMusic ?? true,
      includeVoiceover: settings?.includeVoiceover ?? false,
      includePriceSticker: settings?.includePriceSticker ?? true,
      includeCTA: settings?.includeCTA ?? true,
    };

    const job = addJob({
      product,
      prompt,
      settings: finalSettings,
      platforms,
    });

    return job.id;
  }, [addJob, extractProductFromInput, generatePrompt, videoDefaults]);

  return {
    state,
    createVideo,
    createFromProduct,
    addToQueue,
    generatePrompt,
    reset,
  };
}
