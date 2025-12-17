import { emailService, type CartAbandonmentData } from './emailService';

export interface AbandonedCartEntry {
  id: string;
  email: string;
  customerName?: string;
  productId: string;
  productName: string;
  productImage?: string;
  price: string;
  checkoutPageId: string;
  checkoutUrl: string;
  createdAt: Date;
  lastEmailSent?: Date;
  emailsSent: number;
  recovered: boolean;
}

export interface AbandonmentSequenceEmail {
  delayMinutes: number;
  subject: string;
  includeCoupon: boolean;
  couponCode?: string;
  discountPercent?: number;
}

export interface AbandonmentSequence {
  id: string;
  name: string;
  emails: AbandonmentSequenceEmail[];
  isActive: boolean;
}

const DEFAULT_SEQUENCE: AbandonmentSequenceEmail[] = [
  {
    delayMinutes: 60,
    subject: "Did you forget something?",
    includeCoupon: false,
  },
  {
    delayMinutes: 24 * 60,
    subject: "Your cart is waiting for you",
    includeCoupon: true,
    couponCode: "COMEBACK10",
    discountPercent: 10,
  },
  {
    delayMinutes: 72 * 60,
    subject: "Last chance - Special offer inside",
    includeCoupon: true,
    couponCode: "FINAL15",
    discountPercent: 15,
  },
];

class CartAbandonmentService {
  private carts: Map<string, AbandonedCartEntry> = new Map();
  private sequences: Map<string, AbandonmentSequence> = new Map();
  private processingInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.sequences.set('default', {
      id: 'default',
      name: 'Default Sequence',
      emails: DEFAULT_SEQUENCE,
      isActive: true,
    });
  }

  startProcessing(intervalMs: number = 5 * 60 * 1000): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }
    
    this.processingInterval = setInterval(() => {
      this.processAbandonedCarts();
    }, intervalMs);
    
    console.log('Cart abandonment processing started');
  }

  stopProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }

  trackCart(entry: Omit<AbandonedCartEntry, 'emailsSent' | 'recovered' | 'lastEmailSent'>): void {
    const existingCart = this.carts.get(entry.id);
    
    this.carts.set(entry.id, {
      ...entry,
      emailsSent: existingCart?.emailsSent || 0,
      recovered: false,
      lastEmailSent: existingCart?.lastEmailSent,
    });
    
    console.log(`Cart tracked: ${entry.id} for ${entry.email}`);
  }

  markRecovered(cartId: string): void {
    const cart = this.carts.get(cartId);
    if (cart) {
      cart.recovered = true;
      console.log(`Cart recovered: ${cartId}`);
    }
  }

  removeCart(cartId: string): void {
    this.carts.delete(cartId);
  }

  getSequence(userId: string): AbandonmentSequence {
    return this.sequences.get(userId) || this.sequences.get('default')!;
  }

  updateSequence(userId: string, sequence: AbandonmentSequence): void {
    this.sequences.set(userId, sequence);
  }

  private async processAbandonedCarts(): Promise<void> {
    const now = new Date();
    const entries = Array.from(this.carts.entries());
    
    for (const [cartId, cart] of entries) {
      if (cart.recovered) continue;
      if (!cart.email) continue;

      const sequence = this.getSequence('default');
      if (!sequence.isActive) continue;

      const cartAge = (now.getTime() - cart.createdAt.getTime()) / (1000 * 60);

      for (let i = cart.emailsSent; i < sequence.emails.length; i++) {
        const emailConfig = sequence.emails[i];
        
        if (cartAge >= emailConfig.delayMinutes) {
          const shouldSend = !cart.lastEmailSent || 
            (now.getTime() - cart.lastEmailSent.getTime()) >= 60 * 60 * 1000;

          if (shouldSend) {
            await this.sendAbandonmentEmail(cart, emailConfig);
            cart.emailsSent++;
            cart.lastEmailSent = now;
            break;
          }
        }
      }

      if (cart.emailsSent >= sequence.emails.length) {
        console.log(`Cart ${cartId} completed all abandonment emails`);
      }
    }
  }

  private async sendAbandonmentEmail(
    cart: AbandonedCartEntry,
    emailConfig: AbandonmentSequenceEmail
  ): Promise<boolean> {
    const emailData: CartAbandonmentData = {
      customerName: cart.customerName || 'there',
      customerEmail: cart.email,
      productName: cart.productName,
      productImage: cart.productImage,
      price: cart.price,
      checkoutUrl: cart.checkoutUrl,
      couponCode: emailConfig.includeCoupon ? emailConfig.couponCode : undefined,
      discountPercent: emailConfig.includeCoupon ? emailConfig.discountPercent : undefined,
    };

    const success = await emailService.sendCartAbandonment(emailData);
    
    if (success) {
      console.log(`Abandonment email sent to ${cart.email} for cart ${cart.id}`);
    }
    
    return success;
  }

  getStats(): {
    totalCarts: number;
    recoveredCarts: number;
    pendingCarts: number;
    emailsSent: number;
    recoveryRate: number;
  } {
    let recoveredCarts = 0;
    let pendingCarts = 0;
    let totalEmailsSent = 0;
    const cartValues = Array.from(this.carts.values());

    for (const cart of cartValues) {
      if (cart.recovered) {
        recoveredCarts++;
      } else {
        pendingCarts++;
      }
      totalEmailsSent += cart.emailsSent;
    }

    const totalCarts = this.carts.size;
    const recoveryRate = totalCarts > 0 ? (recoveredCarts / totalCarts) * 100 : 0;

    return {
      totalCarts,
      recoveredCarts,
      pendingCarts,
      emailsSent: totalEmailsSent,
      recoveryRate: Math.round(recoveryRate * 10) / 10,
    };
  }

  getAbandonedCarts(limit: number = 50): AbandonedCartEntry[] {
    return Array.from(this.carts.values())
      .filter(cart => !cart.recovered)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }
}

export const cartAbandonmentService = new CartAbandonmentService();
export default cartAbandonmentService;
