import { storage } from "../storage";
import { createHmac } from "crypto";

interface UddoktaPayConfig {
  apiKey: string;
  apiUrl: string;
  isTestMode: boolean;
  webhookSecret?: string;
}

interface InitPaymentParams {
  fullName: string;
  email: string;
  amount: string;
  metadata: Record<string, any>;
  redirectUrl: string;
  cancelUrl: string;
  webhookUrl?: string;
}

interface InitPaymentResponse {
  payment_url: string;
  invoice_id: string;
  status: string;
}

interface VerifyPaymentResponse {
  full_name: string;
  email: string;
  amount: string;
  fee: string;
  charged_amount: string;
  invoice_id: string;
  metadata: Record<string, any>;
  payment_method: string;
  sender_number: string;
  transaction_id: string;
  date: string;
  status: string;
}

export class UddoktaPayService {
  private config: UddoktaPayConfig;

  constructor(config: UddoktaPayConfig) {
    this.config = config;
  }

  private getBaseUrl(): string {
    return this.config.apiUrl.replace(/\/$/, '');
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!this.config.webhookSecret) {
      console.warn('No webhook secret configured, skipping signature verification');
      return true;
    }
    
    try {
      const expectedSignature = createHmac('sha256', this.config.webhookSecret)
        .update(payload)
        .digest('hex');
      
      return signature === expectedSignature;
    } catch (error) {
      console.error('Webhook signature verification failed:', error);
      return false;
    }
  }

  async initPayment(params: InitPaymentParams): Promise<InitPaymentResponse> {
    const url = `${this.getBaseUrl()}/api/checkout-v2`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'RT-UDDOKTAPAY-API-KEY': this.config.apiKey,
      },
      body: JSON.stringify({
        full_name: params.fullName,
        email: params.email,
        amount: params.amount,
        metadata: params.metadata,
        redirect_url: params.redirectUrl,
        cancel_url: params.cancelUrl,
        webhook_url: params.webhookUrl,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`UddoktaPay API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  async verifyPayment(invoiceId: string): Promise<VerifyPaymentResponse> {
    const url = `${this.getBaseUrl()}/api/verify-payment`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'RT-UDDOKTAPAY-API-KEY': this.config.apiKey,
      },
      body: JSON.stringify({
        invoice_id: invoiceId,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`UddoktaPay verify error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }
}

export async function getPlatformPaymentService(): Promise<UddoktaPayService | null> {
  try {
    const gateway = await storage.getPrimaryPlatformPaymentGateway();
    if (!gateway || gateway.provider !== 'uddoktapay') {
      return null;
    }

    if (!gateway.apiKey || !gateway.apiUrl) {
      console.warn('Platform payment gateway missing API credentials');
      return null;
    }

    return new UddoktaPayService({
      apiKey: gateway.apiKey,
      apiUrl: gateway.apiUrl,
      isTestMode: gateway.isTestMode ?? true,
      webhookSecret: gateway.webhookSecret ?? undefined,
    });
  } catch (error) {
    console.error('Error getting platform payment service:', error);
    return null;
  }
}

export async function initSubscriptionPayment(
  userId: string,
  planId: string,
  amount: string,
  userEmail: string,
  userName: string,
  baseUrl: string
): Promise<{ paymentUrl: string; invoiceId: string; paymentId: string } | null> {
  const paymentService = await getPlatformPaymentService();
  if (!paymentService) {
    throw new Error('Platform payment gateway not configured');
  }

  const payment = await storage.createSellerPayment({
    userId,
    planId,
    amount: amount,
    currency: 'BDT',
    paymentMethod: 'uddoktapay',
    status: 'pending',
    paymentType: 'subscription',
    metadata: { planId },
  });

  try {
    const result = await paymentService.initPayment({
      fullName: userName,
      email: userEmail,
      amount: amount,
      metadata: {
        userId,
        planId,
        paymentId: payment.id,
        type: 'subscription',
      },
      redirectUrl: `${baseUrl}/api/payments/subscription/callback`,
      cancelUrl: `${baseUrl}/pricing?cancelled=true`,
      webhookUrl: `${baseUrl}/api/webhooks/uddoktapay/subscription`,
    });

    await storage.updateSellerPayment(payment.id, {
      invoiceId: result.invoice_id,
    });

    return {
      paymentUrl: result.payment_url,
      invoiceId: result.invoice_id,
      paymentId: payment.id,
    };
  } catch (error) {
    const existingMetadata = (payment.metadata && typeof payment.metadata === 'object') ? payment.metadata : {};
    await storage.updateSellerPayment(payment.id, {
      status: 'failed',
      metadata: { ...existingMetadata, error: String(error) },
    });
    throw error;
  }
}
