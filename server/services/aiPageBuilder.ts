import type { Block } from "../../shared/schema";

export interface AIGenerationRequest {
  productName: string;
  productDescription: string;
  targetAudience?: string;
  tone?: "professional" | "casual" | "urgent" | "friendly";
  style?: "minimalist" | "bold" | "elegant" | "playful";
  includeTestimonials?: boolean;
  includeGuarantee?: boolean;
  includeCountdown?: boolean;
}

export interface AIGenerationResponse {
  blocks: Block[];
  headline: string;
  subheadline: string;
  callToAction: string;
}

class AIPageBuilder {
  private generateId(): string {
    return Math.random().toString(36).substring(2, 11);
  }

  async generateCheckoutPage(request: AIGenerationRequest): Promise<AIGenerationResponse> {
    const headline = this.generateHeadline(request);
    const subheadline = this.generateSubheadline(request);
    const callToAction = this.generateCTA(request);

    const blocks: Block[] = [];
    let position = 0;

    blocks.push({
      id: this.generateId(),
      type: "hero",
      content: {
        headline,
        subheadline,
        backgroundType: "gradient",
        backgroundColor: "#f8fafc",
        textColor: "#18181b",
      },
      position: position++,
    });

    blocks.push({
      id: this.generateId(),
      type: "heading",
      content: {
        text: `Why ${request.productName}?`,
        level: "h2",
        alignment: "center",
      },
      position: position++,
    });

    blocks.push({
      id: this.generateId(),
      type: "features",
      content: {
        title: "What You'll Get",
        features: this.generateFeatures(request),
        columns: 3,
        iconStyle: "circle",
      },
      position: position++,
    });

    if (request.includeTestimonials) {
      blocks.push({
        id: this.generateId(),
        type: "testimonial",
        content: {
          testimonials: this.generateTestimonials(request),
          style: "card",
        },
        position: position++,
      });
    }

    if (request.includeGuarantee) {
      blocks.push({
        id: this.generateId(),
        type: "guarantee",
        content: {
          title: "100% Money-Back Guarantee",
          description: "Try it risk-free. If you're not completely satisfied within 30 days, we'll refund every penny. No questions asked.",
          iconType: "shield",
        },
        position: position++,
      });
    }

    if (request.includeCountdown) {
      blocks.push({
        id: this.generateId(),
        type: "countdown",
        content: {
          title: "Limited Time Offer",
          endTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          style: "boxes",
        },
        position: position++,
      });
    }

    blocks.push({
      id: this.generateId(),
      type: "pricing",
      content: {
        showComparePrice: true,
        highlightSavings: true,
        ctaText: callToAction,
      },
      position: position++,
    });

    blocks.push({
      id: this.generateId(),
      type: "paymentForm",
      content: {
        collectPhone: false,
        collectAddress: false,
        buttonText: callToAction,
        buttonColor: "#ea580c",
      },
      position: position++,
    });

    return {
      blocks,
      headline,
      subheadline,
      callToAction,
    };
  }

  private generateHeadline(request: AIGenerationRequest): string {
    const templates = {
      professional: [
        `Transform Your Results with ${request.productName}`,
        `The Professional's Choice: ${request.productName}`,
        `Elevate Your Success with ${request.productName}`,
      ],
      casual: [
        `Finally, ${request.productName} That Actually Works`,
        `Your New Favorite ${request.productName}`,
        `Get Ready to Love ${request.productName}`,
      ],
      urgent: [
        `Don't Miss Out on ${request.productName}`,
        `Limited Time: Get ${request.productName} Now`,
        `Act Fast: ${request.productName} Won't Last`,
      ],
      friendly: [
        `Welcome to ${request.productName}`,
        `Discover the Joy of ${request.productName}`,
        `Say Hello to ${request.productName}`,
      ],
    };

    const tone = request.tone || "professional";
    const options = templates[tone];
    return options[Math.floor(Math.random() * options.length)];
  }

  private generateSubheadline(request: AIGenerationRequest): string {
    if (request.productDescription) {
      return request.productDescription.length > 150 
        ? request.productDescription.substring(0, 147) + "..."
        : request.productDescription;
    }
    
    return `Everything you need to succeed with ${request.productName}. Join thousands of satisfied customers today.`;
  }

  private generateCTA(request: AIGenerationRequest): string {
    const templates = {
      professional: ["Get Started Now", "Begin Your Journey", "Access Now"],
      casual: ["Let's Go!", "I Want This!", "Sign Me Up"],
      urgent: ["Claim Your Spot", "Get Instant Access", "Buy Now"],
      friendly: ["Join Us Today", "Start Your Adventure", "Get Started"],
    };

    const tone = request.tone || "professional";
    const options = templates[tone];
    return options[Math.floor(Math.random() * options.length)];
  }

  private generateFeatures(request: AIGenerationRequest): Array<{ icon: string; title: string; description: string }> {
    const baseFeatures = [
      {
        icon: "check",
        title: "Instant Access",
        description: "Get immediate access to all materials as soon as you complete your purchase.",
      },
      {
        icon: "clock",
        title: "Lifetime Updates",
        description: "Receive all future updates and improvements at no additional cost.",
      },
      {
        icon: "users",
        title: "Community Support",
        description: "Join our exclusive community of like-minded individuals.",
      },
      {
        icon: "shield",
        title: "Secure & Private",
        description: "Your information is protected with enterprise-grade security.",
      },
      {
        icon: "star",
        title: "Premium Quality",
        description: "Expertly crafted content designed to deliver real results.",
      },
      {
        icon: "download",
        title: "Downloadable Resources",
        description: "Access worksheets, templates, and bonus materials.",
      },
    ];

    return baseFeatures.slice(0, 3);
  }

  private generateTestimonials(request: AIGenerationRequest): Array<{ name: string; role: string; content: string; avatar?: string }> {
    return [
      {
        name: "Sarah M.",
        role: "Entrepreneur",
        content: `${request.productName} completely transformed my approach. I saw results within the first week!`,
      },
      {
        name: "Michael R.",
        role: "Business Owner",
        content: "I was skeptical at first, but this exceeded all my expectations. Highly recommended!",
      },
      {
        name: "Emily T.",
        role: "Freelancer",
        content: "The best investment I've made this year. Worth every penny and more.",
      },
    ];
  }

  async generateEmailCopy(data: {
    eventType: string;
    productName: string;
    customerName: string;
    tone?: string;
  }): Promise<{ subject: string; body: string }> {
    const templates: Record<string, { subject: string; body: string }> = {
      order_confirmation: {
        subject: `Your order for ${data.productName} is confirmed!`,
        body: `Hi ${data.customerName},\n\nThank you for your purchase of ${data.productName}! We're excited to have you.\n\nYour order has been confirmed and you'll receive your download links shortly.\n\nBest regards,\nThe Team`,
      },
      cart_abandoned: {
        subject: `Did you forget something?`,
        body: `Hi ${data.customerName},\n\nWe noticed you left ${data.productName} in your cart. Don't miss out on this opportunity!\n\nComplete your purchase today and start your journey.\n\nBest regards,\nThe Team`,
      },
      digital_delivery: {
        subject: `Your ${data.productName} is ready to download!`,
        body: `Hi ${data.customerName},\n\nGreat news! Your digital product is ready.\n\nClick the links below to download ${data.productName}.\n\nEnjoy!\nThe Team`,
      },
    };

    return templates[data.eventType] || {
      subject: `Update about ${data.productName}`,
      body: `Hi ${data.customerName},\n\nThank you for your interest in ${data.productName}.\n\nBest regards,\nThe Team`,
    };
  }
}

export const aiPageBuilder = new AIPageBuilder();
export default aiPageBuilder;
