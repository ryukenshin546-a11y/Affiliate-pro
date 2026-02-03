import type { ProductInfo, VideoSettings, VideoTemplate } from '@/types';
import { PROMPT_TEMPLATES } from '@/config/constants';
import { formatCurrency } from '@/utils/slugify.util';
import { createLogger } from '@/utils/logger.util';

const logger = createLogger('PromptGeneratorService');

class PromptGeneratorService {
  /**
   * Generate video prompt from product info and settings
   */
  generatePrompt(
    product: ProductInfo,
    settings: VideoSettings,
    customPrompt?: string
  ): string {
    logger.info('Generating prompt', { product: product.name, template: settings.template });

    // If custom prompt provided, use it with variable substitution
    if (customPrompt) {
      return this.substituteVariables(customPrompt, product, settings);
    }

    // Get template
    const template = PROMPT_TEMPLATES[settings.template];
    if (!template) {
      logger.warn('Template not found, using default', { template: settings.template });
      return this.generateDefaultPrompt(product, settings);
    }

    // Substitute variables in template
    return this.substituteVariables(template.template, product, settings);
  }

  /**
   * Substitute variables in prompt template
   */
  private substituteVariables(
    template: string,
    product: ProductInfo,
    settings: VideoSettings
  ): string {
    const variables: Record<string, string> = {
      productName: product.name,
      price: formatCurrency(product.price, product.currency),
      currency: product.currency,
      description: product.description || '',
      category: product.category || '',
      seller: product.seller || '',
      rating: product.rating?.toString() || 'N/A',
      reviews: product.reviews?.toString() || '0',
      duration: `${settings.duration}`,
      aspectRatio: settings.aspectRatio,
      style: settings.style,
      features: this.extractFeatures(product),
      originalPrice: formatCurrency(product.price * 1.2, product.currency), // Estimate
    };

    let result = template;
    
    // Replace {variable} patterns
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{${key}\\}`, 'gi');
      result = result.replace(regex, value);
    });

    // Add style modifiers based on settings
    result = this.addStyleModifiers(result, settings);

    return result.trim();
  }

  /**
   * Generate default prompt when template not found
   */
  private generateDefaultPrompt(product: ProductInfo, settings: VideoSettings): string {
    return `Create a ${settings.duration}s ${settings.style} video showcasing "${product.name}".
Price: ${formatCurrency(product.price, product.currency)}.
Style: ${settings.aspectRatio} vertical video suitable for TikTok/Reels.
${product.description ? `Key features: ${product.description.slice(0, 200)}` : ''}
End with a clear call-to-action to purchase.`;
  }

  /**
   * Extract key features from product description
   */
  private extractFeatures(product: ProductInfo): string {
    if (!product.description) {
      return 'quality design, excellent value';
    }

    // Simple feature extraction from description
    const keywords = [
      'waterproof', 'wireless', 'bluetooth', 'HD', '4K', 'premium',
      'lightweight', 'portable', 'fast', 'durable', 'rechargeable',
      'กันน้ำ', 'ไร้สาย', 'พรีเมียม', 'น้ำหนักเบา', 'พกพา', 'ทนทาน',
    ];

    const foundFeatures = keywords.filter(k => 
      product.description!.toLowerCase().includes(k.toLowerCase())
    );

    return foundFeatures.length > 0 
      ? foundFeatures.slice(0, 5).join(', ')
      : 'quality design, excellent value';
  }

  /**
   * Add style modifiers to prompt
   */
  private addStyleModifiers(prompt: string, settings: VideoSettings): string {
    const modifiers: string[] = [];

    if (settings.includeMusic) {
      modifiers.push('Include upbeat background music.');
    }

    if (settings.includeVoiceover) {
      modifiers.push('Add professional Thai voiceover narration.');
    }

    if (settings.includePriceSticker) {
      modifiers.push('Show price tag overlay with promotional styling.');
    }

    if (settings.includeCTA) {
      modifiers.push('End with animated "ซื้อเลย!" (Buy Now) call-to-action button.');
    }

    if (modifiers.length > 0) {
      return `${prompt}\n\nAdditional instructions:\n${modifiers.join('\n')}`;
    }

    return prompt;
  }

  /**
   * Get available templates
   */
  getTemplates(): typeof PROMPT_TEMPLATES {
    return PROMPT_TEMPLATES;
  }

  /**
   * Validate prompt length
   */
  validatePrompt(prompt: string): { valid: boolean; error?: string } {
    if (prompt.length < 10) {
      return { valid: false, error: 'Prompt too short (min 10 characters)' };
    }

    if (prompt.length > 2000) {
      return { valid: false, error: 'Prompt too long (max 2000 characters)' };
    }

    return { valid: true };
  }

  /**
   * Generate hashtags for the video
   */
  generateHashtags(product: ProductInfo, platform: 'tiktok' | 'shopee' | 'lazada'): string[] {
    const baseHashtags = ['#รีวิว', '#ของดี', '#แนะนำ', '#shopping'];
    
    const platformHashtags: Record<string, string[]> = {
      tiktok: ['#TikTokShop', '#fyp', '#viral', '#tiktokthailand'],
      shopee: ['#ShopeeTH', '#ShopeeHaul', '#ช้อปปี้'],
      lazada: ['#LazadaTH', '#LazadaSale', '#ลาซาด้า'],
    };

    const categoryHashtags: Record<string, string[]> = {
      electronics: ['#เทคโนโลยี', '#gadget', '#tech'],
      fashion: ['#แฟชั่น', '#OOTD', '#style'],
      beauty: ['#skincare', '#beauty', '#makeup'],
      home: ['#บ้าน', '#homedecor', '#lifestyle'],
    };

    const hashtags = [
      ...baseHashtags,
      ...platformHashtags[platform] || [],
    ];

    // Add category-specific hashtags
    if (product.category) {
      const category = product.category.toLowerCase();
      Object.entries(categoryHashtags).forEach(([key, tags]) => {
        if (category.includes(key)) {
          hashtags.push(...tags);
        }
      });
    }

    // Add product name hashtag
    const productHashtag = `#${product.name.replace(/\s+/g, '').slice(0, 20)}`;
    hashtags.push(productHashtag);

    // Return unique hashtags, limited to 10
    return [...new Set(hashtags)].slice(0, 10);
  }

  /**
   * Generate caption for posting
   */
  generateCaption(
    product: ProductInfo,
    hashtags: string[],
    includePrice = true
  ): string {
    const lines = [
      `🎬 ${product.name}`,
      '',
    ];

    if (includePrice) {
      lines.push(`💰 ราคาพิเศษ ${formatCurrency(product.price, product.currency)}`);
    }

    if (product.rating && product.rating > 4) {
      lines.push(`⭐ ${product.rating.toFixed(1)} (${product.reviews || 0} รีวิว)`);
    }

    lines.push('');
    lines.push('👉 ลิงก์ในคอมเมนต์/โปรไฟล์');
    lines.push('');
    lines.push(hashtags.join(' '));

    return lines.join('\n');
  }
}

// Singleton instance
export const promptGeneratorService = new PromptGeneratorService();
