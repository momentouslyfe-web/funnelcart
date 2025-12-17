import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";

// Block types for comprehensive page building - Elementor-like widgets
export type BlockType = 
  // Layout
  | 'section' | 'container' | 'columns' | 'spacer' | 'divider'
  // Basic
  | 'heading' | 'text' | 'image' | 'button' | 'icon' | 'star-rating'
  // General
  | 'icon-box' | 'image-box' | 'icon-list' | 'counter' | 'progress-bar'
  | 'testimonial' | 'tabs' | 'accordion' | 'toggle' | 'social-icons'
  | 'alert' | 'html' | 'menu-anchor' | 'read-more' | 'text-path'
  // Pro
  | 'posts' | 'portfolio' | 'slides' | 'form' | 'login' | 'nav-menu'
  | 'animated-headline' | 'price-list' | 'price-table' | 'flip-box'
  | 'call-to-action' | 'media-carousel' | 'testimonial-carousel'
  | 'countdown' | 'share-buttons' | 'blockquote' | 'facebook-embed'
  | 'lottie' | 'video' | 'image-gallery' | 'table-of-contents'
  // Marketing
  | 'hero' | 'features' | 'benefits' | 'faq' | 'pricing' | 'cta'
  | 'footer' | 'header' | 'banner' | 'reviews' | 'team' | 'stats'
  | 'logo-carousel' | 'before-after' | 'comparison-table';

export interface BlockStyle {
  backgroundColor?: string;
  textColor?: string;
  fontSize?: string;
  fontFamily?: string;
  fontWeight?: string;
  padding?: string;
  margin?: string;
  borderRadius?: string;
  borderColor?: string;
  borderWidth?: string;
  boxShadow?: string;
  textAlign?: 'left' | 'center' | 'right';
  display?: string;
  flexDirection?: string;
  alignItems?: string;
  justifyContent?: string;
  gap?: string;
  width?: string;
  maxWidth?: string;
  minHeight?: string;
  backgroundImage?: string;
  backgroundSize?: string;
  backgroundPosition?: string;
  opacity?: string;
  transform?: string;
  transition?: string;
}

export interface ResponsiveStyles {
  desktop?: BlockStyle;
  tablet?: BlockStyle;
  mobile?: BlockStyle;
}

export interface BlockContent {
  [key: string]: any;
}

export interface PageBlock {
  id: string;
  type: BlockType;
  content: BlockContent;
  styles: ResponsiveStyles;
  settings: {
    visibility?: { desktop: boolean; tablet: boolean; mobile: boolean };
    animation?: string;
    animationDelay?: number;
    cssClasses?: string;
    customCSS?: string;
    link?: { url: string; newTab: boolean };
  };
  children?: PageBlock[];
}

export interface AIGenerationRequest {
  provider: 'gemini' | 'openrouter';
  model: string;
  productInfo: {
    name: string;
    description: string;
    price: string;
    features?: string[];
    benefits?: string[];
    images?: string[];
  };
  customInstructions?: string;
  providedContent?: string;
  templateType: 'sales-page' | 'landing-page' | 'product-page' | 'checkout-page' | 'thank-you-page';
  targetAudience?: string;
  tone?: 'professional' | 'casual' | 'urgent' | 'friendly' | 'luxury';
  colorScheme?: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
}

export interface AIConfig {
  provider: 'gemini' | 'openrouter';
  geminiApiKey?: string;
  openrouterModel?: string;
  defaultModel: string;
}

// Available widget/block definitions for the page builder
export const AVAILABLE_BLOCKS = {
  layout: [
    { type: 'section', name: 'Section', icon: 'layout', description: 'Full-width section container' },
    { type: 'container', name: 'Container', icon: 'box', description: 'Centered content container' },
    { type: 'columns', name: 'Columns', icon: 'columns', description: 'Multi-column layout' },
    { type: 'spacer', name: 'Spacer', icon: 'minus', description: 'Vertical spacing' },
    { type: 'divider', name: 'Divider', icon: 'separator-horizontal', description: 'Horizontal line divider' },
  ],
  basic: [
    { type: 'heading', name: 'Heading', icon: 'heading', description: 'H1-H6 headings' },
    { type: 'text', name: 'Text Editor', icon: 'type', description: 'Rich text content' },
    { type: 'image', name: 'Image', icon: 'image', description: 'Single image with options' },
    { type: 'button', name: 'Button', icon: 'mouse-pointer-click', description: 'Call-to-action button' },
    { type: 'icon', name: 'Icon', icon: 'smile', description: 'Font icon' },
    { type: 'star-rating', name: 'Star Rating', icon: 'star', description: 'Star rating display' },
  ],
  general: [
    { type: 'icon-box', name: 'Icon Box', icon: 'box', description: 'Icon with title and text' },
    { type: 'image-box', name: 'Image Box', icon: 'image', description: 'Image with caption' },
    { type: 'icon-list', name: 'Icon List', icon: 'list', description: 'List with icons' },
    { type: 'counter', name: 'Counter', icon: 'hash', description: 'Animated number counter' },
    { type: 'progress-bar', name: 'Progress Bar', icon: 'bar-chart', description: 'Progress indicator' },
    { type: 'testimonial', name: 'Testimonial', icon: 'message-circle', description: 'Customer testimonial' },
    { type: 'tabs', name: 'Tabs', icon: 'folder', description: 'Tabbed content' },
    { type: 'accordion', name: 'Accordion', icon: 'chevrons-down', description: 'Collapsible sections' },
    { type: 'social-icons', name: 'Social Icons', icon: 'share-2', description: 'Social media links' },
    { type: 'alert', name: 'Alert', icon: 'alert-circle', description: 'Notice/alert box' },
  ],
  marketing: [
    { type: 'hero', name: 'Hero Section', icon: 'monitor', description: 'Full-width hero with CTA' },
    { type: 'features', name: 'Features', icon: 'grid', description: 'Feature grid' },
    { type: 'benefits', name: 'Benefits', icon: 'check-circle', description: 'Benefits list' },
    { type: 'faq', name: 'FAQ', icon: 'help-circle', description: 'FAQ accordion' },
    { type: 'pricing', name: 'Pricing Table', icon: 'dollar-sign', description: 'Pricing cards' },
    { type: 'cta', name: 'Call to Action', icon: 'megaphone', description: 'CTA section' },
    { type: 'testimonial-carousel', name: 'Testimonial Carousel', icon: 'message-square', description: 'Scrolling testimonials' },
    { type: 'countdown', name: 'Countdown', icon: 'clock', description: 'Timer countdown' },
    { type: 'stats', name: 'Statistics', icon: 'trending-up', description: 'Stats/numbers display' },
    { type: 'comparison-table', name: 'Comparison Table', icon: 'table', description: 'Feature comparison' },
  ],
  media: [
    { type: 'video', name: 'Video', icon: 'play-circle', description: 'Video embed' },
    { type: 'image-gallery', name: 'Image Gallery', icon: 'images', description: 'Image grid gallery' },
    { type: 'media-carousel', name: 'Media Carousel', icon: 'layers', description: 'Image/video slider' },
    { type: 'before-after', name: 'Before/After', icon: 'flip-horizontal', description: 'Comparison slider' },
    { type: 'logo-carousel', name: 'Logo Carousel', icon: 'award', description: 'Client logos slider' },
  ],
  forms: [
    { type: 'form', name: 'Form', icon: 'file-text', description: 'Contact/lead form' },
    { type: 'login', name: 'Login Form', icon: 'log-in', description: 'User login form' },
  ],
};

// Default block content templates
export function getDefaultBlockContent(type: BlockType): BlockContent {
  const defaults: Record<string, BlockContent> = {
    heading: {
      text: 'Your Heading Here',
      tag: 'h2',
      link: null,
    },
    text: {
      html: '<p>Add your text content here. You can format it with bold, italic, and more.</p>',
    },
    image: {
      src: '',
      alt: '',
      caption: '',
      size: 'full',
      linkTo: 'none',
    },
    button: {
      text: 'Click Here',
      link: '#',
      size: 'medium',
      variant: 'primary',
      icon: null,
      iconPosition: 'left',
    },
    hero: {
      headline: 'Transform Your Life Today',
      subheadline: 'Discover the proven system that has helped thousands achieve their goals',
      buttonText: 'Get Started Now',
      buttonLink: '#buy',
      backgroundImage: '',
      overlay: true,
      overlayColor: 'rgba(0,0,0,0.5)',
    },
    features: {
      title: 'Why Choose Us',
      subtitle: 'Everything you need to succeed',
      items: [
        { icon: 'check', title: 'Feature 1', description: 'Description of feature 1' },
        { icon: 'check', title: 'Feature 2', description: 'Description of feature 2' },
        { icon: 'check', title: 'Feature 3', description: 'Description of feature 3' },
      ],
      columns: 3,
    },
    benefits: {
      title: 'What You Get',
      items: [
        { icon: 'check-circle', text: 'Benefit number one' },
        { icon: 'check-circle', text: 'Benefit number two' },
        { icon: 'check-circle', text: 'Benefit number three' },
      ],
    },
    testimonial: {
      quote: 'This product changed my life! Highly recommended.',
      author: 'John Doe',
      role: 'Happy Customer',
      avatar: '',
      rating: 5,
    },
    faq: {
      title: 'Frequently Asked Questions',
      items: [
        { question: 'How does it work?', answer: 'Simply follow our step-by-step process...' },
        { question: 'Is there a guarantee?', answer: 'Yes, we offer a 30-day money-back guarantee.' },
        { question: 'How long does it take?', answer: 'Results vary, but most see changes within weeks.' },
      ],
    },
    pricing: {
      title: 'Choose Your Plan',
      plans: [
        { 
          name: 'Basic', 
          price: '29', 
          currency: '$',
          period: 'month',
          features: ['Feature 1', 'Feature 2', 'Feature 3'],
          buttonText: 'Get Started',
          highlighted: false,
        },
        { 
          name: 'Pro', 
          price: '79', 
          currency: '$',
          period: 'month',
          features: ['All Basic features', 'Feature 4', 'Feature 5', 'Priority support'],
          buttonText: 'Get Pro',
          highlighted: true,
        },
      ],
    },
    cta: {
      headline: 'Ready to Get Started?',
      subheadline: 'Join thousands of satisfied customers today',
      buttonText: 'Buy Now',
      buttonLink: '#checkout',
      urgencyText: 'Limited time offer - 50% OFF',
    },
    countdown: {
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      title: 'Offer Ends In',
      showDays: true,
      showHours: true,
      showMinutes: true,
      showSeconds: true,
    },
    stats: {
      items: [
        { value: '10K+', label: 'Happy Customers' },
        { value: '99%', label: 'Satisfaction Rate' },
        { value: '24/7', label: 'Support Available' },
      ],
    },
    'icon-box': {
      icon: 'star',
      title: 'Icon Box Title',
      description: 'Add a description for your icon box here.',
      iconPosition: 'top',
    },
    accordion: {
      items: [
        { title: 'Accordion Item 1', content: 'Content for item 1' },
        { title: 'Accordion Item 2', content: 'Content for item 2' },
      ],
      defaultOpen: 0,
    },
    video: {
      source: 'youtube',
      videoId: '',
      autoplay: false,
      muted: false,
      loop: false,
      controls: true,
    },
    form: {
      fields: [
        { type: 'text', name: 'name', label: 'Name', required: true },
        { type: 'email', name: 'email', label: 'Email', required: true },
        { type: 'textarea', name: 'message', label: 'Message', required: false },
      ],
      submitText: 'Submit',
      successMessage: 'Thank you for your submission!',
    },
    divider: {
      style: 'solid',
      weight: 1,
      color: '#e5e5e5',
      width: '100%',
    },
    spacer: {
      height: { desktop: '50px', tablet: '40px', mobile: '30px' },
    },
  };
  
  return defaults[type] || {};
}

// Default block styles
export function getDefaultBlockStyles(type: BlockType): ResponsiveStyles {
  const baseStyle: BlockStyle = {
    padding: '20px',
    margin: '0',
  };
  
  const typeStyles: Record<string, ResponsiveStyles> = {
    hero: {
      desktop: {
        ...baseStyle,
        padding: '100px 20px',
        textAlign: 'center',
        minHeight: '500px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      },
      tablet: { padding: '80px 20px', minHeight: '400px' },
      mobile: { padding: '60px 16px', minHeight: '350px' },
    },
    heading: {
      desktop: { fontSize: '32px', fontWeight: '700', margin: '0 0 16px 0' },
      tablet: { fontSize: '28px' },
      mobile: { fontSize: '24px' },
    },
    button: {
      desktop: { padding: '16px 32px', fontSize: '18px', borderRadius: '8px' },
      tablet: { padding: '14px 28px', fontSize: '16px' },
      mobile: { padding: '12px 24px', fontSize: '14px' },
    },
    features: {
      desktop: { padding: '60px 20px' },
      tablet: { padding: '50px 20px' },
      mobile: { padding: '40px 16px' },
    },
    testimonial: {
      desktop: { padding: '40px', borderRadius: '12px' },
      tablet: { padding: '32px' },
      mobile: { padding: '24px' },
    },
    pricing: {
      desktop: { padding: '60px 20px' },
      tablet: { padding: '50px 20px' },
      mobile: { padding: '40px 16px' },
    },
  };
  
  return typeStyles[type] || { desktop: baseStyle };
}

class AIPageBuilderV2 {
  private geminiClient: GoogleGenAI | null = null;
  private openrouterClient: OpenAI | null = null;

  constructor() {
    this.initializeClients();
  }

  initializeClients() {
    // Initialize Gemini if API key is available
    if (process.env.GEMINI_API_KEY) {
      this.geminiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    }
    
    // Initialize OpenRouter with API key (user-provided)
    if (process.env.OPENROUTER_API_KEY) {
      this.openrouterClient = new OpenAI({
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey: process.env.OPENROUTER_API_KEY,
      });
    }
  }

  // Allow runtime configuration of API keys
  configureGemini(apiKey: string) {
    this.geminiClient = new GoogleGenAI({ apiKey });
  }

  configureOpenRouter(apiKey: string) {
    this.openrouterClient = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey,
    });
  }

  async generatePage(request: AIGenerationRequest): Promise<PageBlock[]> {
    const prompt = this.buildPrompt(request);
    
    let response: string;
    
    if (request.provider === 'gemini' && this.geminiClient) {
      response = await this.callGemini(prompt, request.model);
    } else if (request.provider === 'openrouter' && this.openrouterClient) {
      response = await this.callOpenRouter(prompt, request.model);
    } else {
      throw new Error(`AI provider ${request.provider} is not configured`);
    }
    
    return this.parseAIResponse(response, request);
  }

  private buildPrompt(request: AIGenerationRequest): string {
    const { productInfo, customInstructions, providedContent, templateType, targetAudience, tone, colorScheme } = request;
    
    let prompt = `You are an expert landing page designer. Create a high-converting ${templateType} for a digital product.

PRODUCT INFORMATION:
- Name: ${productInfo.name}
- Description: ${productInfo.description}
- Price: ${productInfo.price}
${productInfo.features ? `- Features: ${productInfo.features.join(', ')}` : ''}
${productInfo.benefits ? `- Benefits: ${productInfo.benefits.join(', ')}` : ''}

${targetAudience ? `TARGET AUDIENCE: ${targetAudience}` : ''}
${tone ? `TONE: ${tone}` : ''}

${colorScheme ? `COLOR SCHEME:
- Primary: ${colorScheme.primary}
- Secondary: ${colorScheme.secondary}
- Accent: ${colorScheme.accent}
- Background: ${colorScheme.background}
- Text: ${colorScheme.text}` : ''}

${customInstructions ? `CUSTOM INSTRUCTIONS FROM SELLER:
${customInstructions}` : ''}

${providedContent ? `CONTENT PROVIDED BY SELLER (use this content in the page):
${providedContent}` : ''}

Generate a complete page structure with the following blocks. For each block, provide:
1. The block type
2. The content for that block
3. Recommended styling

Use these block types: hero, features, benefits, testimonial, faq, pricing, cta, stats, countdown

IMPORTANT: Respond ONLY with valid JSON in this exact format:
{
  "blocks": [
    {
      "type": "hero",
      "content": {
        "headline": "...",
        "subheadline": "...",
        "buttonText": "...",
        "buttonLink": "#buy"
      }
    },
    // ... more blocks
  ]
}

Create a compelling, conversion-focused page with:
- An attention-grabbing hero section
- Clear feature/benefit highlights
- Social proof (testimonials)
- FAQ section addressing common objections
- Strong call-to-action
- Urgency elements if appropriate

Make all copy persuasive and benefit-focused. Use the provided product information to create authentic, specific content.`;

    return prompt;
  }

  private async callGemini(prompt: string, model: string): Promise<string> {
    if (!this.geminiClient) {
      throw new Error('Gemini client not initialized');
    }
    
    // Use gemini-2.5-flash as the default model
    const geminiModel = model || 'gemini-2.5-flash';
    
    const response = await this.geminiClient.models.generateContent({
      model: geminiModel,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });
    
    return response.text || '';
  }

  private async callOpenRouter(prompt: string, model: string): Promise<string> {
    if (!this.openrouterClient) {
      throw new Error('OpenRouter client not initialized');
    }
    
    // Default to a capable model if not specified
    const openrouterModel = model || 'meta-llama/llama-3.3-70b-instruct';
    
    const response = await this.openrouterClient.chat.completions.create({
      model: openrouterModel,
      messages: [
        { role: 'system', content: 'You are an expert landing page designer. Always respond with valid JSON only.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 8192,
    });
    
    return response.choices[0]?.message?.content || '';
  }

  private parseAIResponse(response: string, request: AIGenerationRequest): PageBlock[] {
    try {
      // Try to extract JSON from the response
      let jsonStr = response;
      
      // Handle markdown code blocks
      const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      }
      
      const parsed = JSON.parse(jsonStr.trim());
      const blocks: PageBlock[] = [];
      
      if (parsed.blocks && Array.isArray(parsed.blocks)) {
        for (const block of parsed.blocks) {
          const pageBlock: PageBlock = {
            id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: block.type as BlockType,
            content: { ...getDefaultBlockContent(block.type), ...block.content },
            styles: { ...getDefaultBlockStyles(block.type), ...block.styles },
            settings: {
              visibility: { desktop: true, tablet: true, mobile: true },
              animation: block.animation || 'none',
            },
          };
          blocks.push(pageBlock);
        }
      }
      
      return blocks;
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      // Return a basic template if parsing fails
      return this.getDefaultTemplate(request.templateType);
    }
  }

  getDefaultTemplate(templateType: string): PageBlock[] {
    const createBlock = (type: BlockType, contentOverrides: Partial<BlockContent> = {}): PageBlock => ({
      id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      content: { ...getDefaultBlockContent(type), ...contentOverrides },
      styles: getDefaultBlockStyles(type),
      settings: {
        visibility: { desktop: true, tablet: true, mobile: true },
      },
    });

    const templates: Record<string, PageBlock[]> = {
      'sales-page': [
        createBlock('hero'),
        createBlock('features'),
        createBlock('benefits'),
        createBlock('testimonial'),
        createBlock('pricing'),
        createBlock('faq'),
        createBlock('cta'),
      ],
      'landing-page': [
        createBlock('hero'),
        createBlock('features'),
        createBlock('stats'),
        createBlock('testimonial'),
        createBlock('cta'),
      ],
      'product-page': [
        createBlock('hero'),
        createBlock('features'),
        createBlock('benefits'),
        createBlock('pricing'),
        createBlock('faq'),
      ],
      'checkout-page': [
        createBlock('heading', { text: 'Complete Your Purchase', tag: 'h1' }),
        createBlock('pricing'),
        createBlock('testimonial'),
      ],
      'thank-you-page': [
        createBlock('heading', { text: 'Thank You for Your Purchase!', tag: 'h1' }),
        createBlock('text', { html: '<p>Your order has been confirmed. Check your email for details.</p>' }),
      ],
    };

    return templates[templateType] || templates['sales-page'];
  }

  getAvailableBlocks() {
    return AVAILABLE_BLOCKS;
  }

  getAvailableModels(): { gemini: string[]; openrouter: string[] } {
    return {
      gemini: [
        'gemini-3-pro',
        'gemini-2.5-pro',
        'gemini-2.5-flash',
        'gemini-2.5-flash-lite',
        'gemini-2.0-flash',
        'gemini-1.5-pro',
        'gemini-1.5-flash',
      ],
      openrouter: [
        'openai/gpt-5',
        'openai/gpt-5-mini',
        'openai/gpt-4.1',
        'openai/gpt-4.1-mini',
        'openai/gpt-4o',
        'openai/o3',
        'openai/o3-mini',
        'anthropic/claude-opus-4.1',
        'anthropic/claude-sonnet-4-0',
        'anthropic/claude-sonnet-3.7',
        'anthropic/claude-sonnet-3.5',
        'anthropic/claude-haiku-3.5',
        'google/gemini-3-pro',
        'google/gemini-2.5-pro',
        'google/gemini-2.5-flash',
        'google/gemini-2.5-flash-lite',
        'x-ai/grok-4',
        'x-ai/grok-4.1-fast',
        'x-ai/grok-3',
        'x-ai/grok-3-mini',
        'deepseek/deepseek-r1',
        'deepseek/deepseek-v3.2',
        'deepseek/deepseek-coder',
        'meta-llama/llama-4-maverick',
        'meta-llama/llama-3.3-70b-instruct',
        'mistralai/mistral-large-3',
        'mistralai/mistral-small-3.1',
        'qwen/qwen-3-235b-a22b-instruct',
      ],
    };
  }

  isConfigured(): { gemini: boolean; openrouter: boolean } {
    return {
      gemini: !!this.geminiClient,
      openrouter: !!this.openrouterClient,
    };
  }

  generateDefaultBlocks(pageType: string): any[] {
    const generateId = () => Math.random().toString(36).substring(2, 15);
    
    const baseBlocks: any[] = [
      {
        id: generateId(),
        type: 'hero',
        content: {
          headline: 'Transform Your Business Today',
          subheadline: 'Discover the proven system to achieve your goals faster',
          buttonText: 'Get Started Now',
          buttonUrl: '#checkout',
          backgroundImage: '',
        },
        styles: { desktop: { padding: '80px 20px', textAlign: 'center' } },
        position: 0,
      },
    ];

    if (pageType === 'landing' || pageType === 'sales-page') {
      baseBlocks.push(
        {
          id: generateId(),
          type: 'features',
          content: {
            title: 'What You Get',
            items: [
              { icon: 'check', title: 'Feature 1', description: 'Description of the first amazing feature' },
              { icon: 'check', title: 'Feature 2', description: 'Description of the second amazing feature' },
              { icon: 'check', title: 'Feature 3', description: 'Description of the third amazing feature' },
            ],
          },
          styles: { desktop: { padding: '60px 20px' } },
          position: 1,
        },
        {
          id: generateId(),
          type: 'testimonial',
          content: {
            title: 'What Our Customers Say',
            testimonials: [
              { name: 'John D.', text: 'This product changed my life! Highly recommended.', avatar: '', rating: 5 },
              { name: 'Sarah M.', text: 'Amazing results in just a few weeks.', avatar: '', rating: 5 },
            ],
          },
          styles: { desktop: { padding: '60px 20px', backgroundColor: '#f8f9fa' } },
          position: 2,
        },
        {
          id: generateId(),
          type: 'faq',
          content: {
            title: 'Frequently Asked Questions',
            items: [
              { question: 'How does it work?', answer: 'Our simple 3-step process makes it easy to get started.' },
              { question: 'Is there a guarantee?', answer: 'Yes! We offer a 30-day money-back guarantee.' },
              { question: 'How long until I see results?', answer: 'Most customers see results within the first week.' },
            ],
          },
          styles: { desktop: { padding: '60px 20px' } },
          position: 3,
        }
      );
    }

    if (pageType === 'checkout') {
      baseBlocks.push(
        {
          id: generateId(),
          type: 'pricing',
          content: {
            title: 'Complete Your Order',
            price: '$97',
            originalPrice: '$197',
            features: ['Instant Access', 'Lifetime Updates', '30-Day Guarantee'],
          },
          styles: { desktop: { padding: '40px 20px' } },
          position: 1,
        }
      );
    }

    if (pageType === 'thank_you' || pageType === 'thank-you-page') {
      baseBlocks[0].content = {
        headline: 'Thank You for Your Purchase!',
        subheadline: 'Your order has been confirmed. Check your email for access details.',
        buttonText: 'Access Your Product',
        buttonUrl: '/downloads',
      };
    }

    if (pageType === 'upsell') {
      baseBlocks[0].content = {
        headline: 'Wait! Special One-Time Offer',
        subheadline: 'Get 50% off this exclusive upgrade - only available now',
        buttonText: 'Yes, Add This To My Order',
        buttonUrl: '#accept',
      };
      baseBlocks.push({
        id: generateId(),
        type: 'cta',
        content: {
          headline: 'Upgrade Your Order',
          description: 'This exclusive offer is only available right now.',
          primaryButton: { text: 'Yes! Add This For Just $47', url: '#accept' },
          secondaryButton: { text: 'No Thanks, I\'ll Pass', url: '#decline' },
        },
        styles: { desktop: { padding: '60px 20px', textAlign: 'center' } },
        position: 1,
      });
    }

    return baseBlocks;
  }
}

export { AIPageBuilderV2 };
export const aiPageBuilderV2 = new AIPageBuilderV2();
