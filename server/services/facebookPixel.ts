import crypto from 'crypto';

export interface PixelEventData {
  eventName: string;
  eventId: string;
  eventTime: number;
  userData: {
    email?: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
    city?: string;
    state?: string;
    country?: string;
    zipCode?: string;
    externalId?: string;
    clientIpAddress?: string;
    clientUserAgent?: string;
    fbc?: string;
    fbp?: string;
  };
  customData?: {
    currency?: string;
    value?: number;
    contentName?: string;
    contentCategory?: string;
    contentIds?: string[];
    contentType?: string;
    numItems?: number;
    orderId?: string;
  };
  eventSourceUrl?: string;
  actionSource?: 'website' | 'email' | 'app' | 'phone_call' | 'chat' | 'physical_store' | 'system_generated' | 'other';
}

export interface ConversionsAPIResponse {
  success: boolean;
  eventId: string;
  message?: string;
}

class FacebookPixelService {
  private hashValue(value: string | undefined): string | undefined {
    if (!value) return undefined;
    return crypto.createHash('sha256').update(value.toLowerCase().trim()).digest('hex');
  }

  private normalizePhone(phone: string | undefined): string | undefined {
    if (!phone) return undefined;
    return phone.replace(/\D/g, '');
  }

  generateEventId(): string {
    return `evt_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  async sendServerEvent(
    pixelId: string,
    accessToken: string,
    event: PixelEventData,
    testEventCode?: string
  ): Promise<ConversionsAPIResponse> {
    const apiVersion = 'v18.0';
    const url = `https://graph.facebook.com/${apiVersion}/${pixelId}/events`;

    const hashedUserData: Record<string, any> = {};
    
    if (event.userData.email) {
      hashedUserData.em = [this.hashValue(event.userData.email)];
    }
    if (event.userData.phone) {
      hashedUserData.ph = [this.hashValue(this.normalizePhone(event.userData.phone))];
    }
    if (event.userData.firstName) {
      hashedUserData.fn = [this.hashValue(event.userData.firstName)];
    }
    if (event.userData.lastName) {
      hashedUserData.ln = [this.hashValue(event.userData.lastName)];
    }
    if (event.userData.city) {
      hashedUserData.ct = [this.hashValue(event.userData.city)];
    }
    if (event.userData.state) {
      hashedUserData.st = [this.hashValue(event.userData.state)];
    }
    if (event.userData.country) {
      hashedUserData.country = [this.hashValue(event.userData.country)];
    }
    if (event.userData.zipCode) {
      hashedUserData.zp = [this.hashValue(event.userData.zipCode)];
    }
    if (event.userData.externalId) {
      hashedUserData.external_id = [this.hashValue(event.userData.externalId)];
    }
    if (event.userData.clientIpAddress) {
      hashedUserData.client_ip_address = event.userData.clientIpAddress;
    }
    if (event.userData.clientUserAgent) {
      hashedUserData.client_user_agent = event.userData.clientUserAgent;
    }
    if (event.userData.fbc) {
      hashedUserData.fbc = event.userData.fbc;
    }
    if (event.userData.fbp) {
      hashedUserData.fbp = event.userData.fbp;
    }

    const payload: Record<string, any> = {
      data: [
        {
          event_name: event.eventName,
          event_time: event.eventTime,
          event_id: event.eventId,
          event_source_url: event.eventSourceUrl,
          action_source: event.actionSource || 'website',
          user_data: hashedUserData,
        },
      ],
      access_token: accessToken,
    };

    if (event.customData) {
      payload.data[0].custom_data = {
        currency: event.customData.currency,
        value: event.customData.value,
        content_name: event.customData.contentName,
        content_category: event.customData.contentCategory,
        content_ids: event.customData.contentIds,
        content_type: event.customData.contentType,
        num_items: event.customData.numItems,
        order_id: event.customData.orderId,
      };
    }

    if (testEventCode) {
      payload.test_event_code = testEventCode;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (response.ok) {
        console.log(`Facebook Pixel event sent: ${event.eventName} (${event.eventId})`);
        return {
          success: true,
          eventId: event.eventId,
        };
      } else {
        console.error('Facebook Pixel API error:', result);
        return {
          success: false,
          eventId: event.eventId,
          message: result.error?.message || 'Unknown error',
        };
      }
    } catch (error) {
      console.error('Failed to send Facebook Pixel event:', error);
      return {
        success: false,
        eventId: event.eventId,
        message: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  createPageViewEvent(userData: PixelEventData['userData'], pageUrl: string): PixelEventData {
    return {
      eventName: 'PageView',
      eventId: this.generateEventId(),
      eventTime: Math.floor(Date.now() / 1000),
      userData,
      eventSourceUrl: pageUrl,
      actionSource: 'website',
    };
  }

  createViewContentEvent(
    userData: PixelEventData['userData'],
    pageUrl: string,
    productData: { name: string; id: string; price: number; currency: string; category?: string }
  ): PixelEventData {
    return {
      eventName: 'ViewContent',
      eventId: this.generateEventId(),
      eventTime: Math.floor(Date.now() / 1000),
      userData,
      eventSourceUrl: pageUrl,
      actionSource: 'website',
      customData: {
        contentName: productData.name,
        contentIds: [productData.id],
        contentType: 'product',
        value: productData.price,
        currency: productData.currency,
        contentCategory: productData.category,
      },
    };
  }

  createAddToCartEvent(
    userData: PixelEventData['userData'],
    pageUrl: string,
    productData: { name: string; id: string; price: number; currency: string; quantity?: number }
  ): PixelEventData {
    return {
      eventName: 'AddToCart',
      eventId: this.generateEventId(),
      eventTime: Math.floor(Date.now() / 1000),
      userData,
      eventSourceUrl: pageUrl,
      actionSource: 'website',
      customData: {
        contentName: productData.name,
        contentIds: [productData.id],
        contentType: 'product',
        value: productData.price,
        currency: productData.currency,
        numItems: productData.quantity || 1,
      },
    };
  }

  createInitiateCheckoutEvent(
    userData: PixelEventData['userData'],
    pageUrl: string,
    orderData: { value: number; currency: string; contentIds: string[]; numItems: number }
  ): PixelEventData {
    return {
      eventName: 'InitiateCheckout',
      eventId: this.generateEventId(),
      eventTime: Math.floor(Date.now() / 1000),
      userData,
      eventSourceUrl: pageUrl,
      actionSource: 'website',
      customData: {
        value: orderData.value,
        currency: orderData.currency,
        contentIds: orderData.contentIds,
        contentType: 'product',
        numItems: orderData.numItems,
      },
    };
  }

  createPurchaseEvent(
    userData: PixelEventData['userData'],
    pageUrl: string,
    orderData: { 
      orderId: string; 
      value: number; 
      currency: string; 
      contentIds: string[]; 
      contentName?: string;
      numItems: number 
    }
  ): PixelEventData {
    return {
      eventName: 'Purchase',
      eventId: this.generateEventId(),
      eventTime: Math.floor(Date.now() / 1000),
      userData,
      eventSourceUrl: pageUrl,
      actionSource: 'website',
      customData: {
        value: orderData.value,
        currency: orderData.currency,
        contentIds: orderData.contentIds,
        contentName: orderData.contentName,
        contentType: 'product',
        numItems: orderData.numItems,
        orderId: orderData.orderId,
      },
    };
  }

  createLeadEvent(
    userData: PixelEventData['userData'],
    pageUrl: string,
    leadData?: { value?: number; currency?: string; contentName?: string }
  ): PixelEventData {
    return {
      eventName: 'Lead',
      eventId: this.generateEventId(),
      eventTime: Math.floor(Date.now() / 1000),
      userData,
      eventSourceUrl: pageUrl,
      actionSource: 'website',
      customData: leadData ? {
        value: leadData.value,
        currency: leadData.currency,
        contentName: leadData.contentName,
      } : undefined,
    };
  }

  getClientSideScript(pixelId: string): string {
    return `
<!-- Facebook Pixel Code -->
<script>
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${pixelId}');
fbq('track', 'PageView');
</script>
<noscript><img height="1" width="1" style="display:none"
src="https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1"
/></noscript>
<!-- End Facebook Pixel Code -->
    `.trim();
  }
}

export const facebookPixelService = new FacebookPixelService();
export default facebookPixelService;
