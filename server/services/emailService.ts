import nodemailer from 'nodemailer';

export type EmailEventType = 
  // Customer Events
  | 'order_confirmation'
  | 'digital_delivery'
  | 'download_ready'
  | 'order_shipped'
  | 'refund_processed'
  | 'cart_abandoned'
  | 'payment_failed'
  // Seller Events
  | 'new_order_notification'
  | 'low_inventory_alert'
  | 'payout_processed'
  | 'checkout_page_published'
  | 'product_review'
  | 'subscription_reminder'
  // Admin Events
  | 'new_user_registered'
  | 'plan_upgraded'
  | 'plan_cancelled'
  | 'platform_error'
  | 'daily_summary'
  | 'weekly_report';

export interface EmailConfig {
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPassword?: string;
  sendgridApiKey?: string;
  fromEmail: string;
  fromName: string;
}

export interface EmailData {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

export interface OrderEmailData {
  customerName: string;
  customerEmail: string;
  orderId: string;
  orderNumber: string;
  productName: string;
  productImage?: string;
  quantity: number;
  price: string;
  total: string;
  currency: string;
  downloadLinks?: Array<{ name: string; url: string }>;
  invoiceUrl?: string;
  sellerName: string;
  sellerEmail: string;
  supportEmail?: string;
}

export interface CartAbandonmentData {
  customerName: string;
  customerEmail: string;
  productName: string;
  productImage?: string;
  price: string;
  checkoutUrl: string;
  couponCode?: string;
  discountPercent?: number;
}

export interface SellerNotificationData {
  sellerName: string;
  sellerEmail: string;
  customerName: string;
  orderNumber: string;
  productName: string;
  amount: string;
  dashboardUrl: string;
}

export interface AdminNotificationData {
  adminEmail: string;
  eventType: string;
  userName?: string;
  userEmail?: string;
  planName?: string;
  amount?: string;
  details?: Record<string, any>;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private config: EmailConfig | null = null;

  async initialize(config: EmailConfig): Promise<void> {
    this.config = config;
    
    if (config.sendgridApiKey) {
      this.transporter = nodemailer.createTransport({
        host: 'smtp.sendgrid.net',
        port: 587,
        secure: false,
        auth: {
          user: 'apikey',
          pass: config.sendgridApiKey,
        },
      });
    } else if (config.smtpHost && config.smtpUser && config.smtpPassword) {
      this.transporter = nodemailer.createTransport({
        host: config.smtpHost,
        port: config.smtpPort || 587,
        secure: config.smtpPort === 465,
        auth: {
          user: config.smtpUser,
          pass: config.smtpPassword,
        },
      });
    }
  }

  async sendEmail(data: EmailData): Promise<boolean> {
    if (!this.transporter || !this.config) {
      console.log('Email not configured, logging instead:', data.to, data.subject);
      return false;
    }

    try {
      await this.transporter.sendMail({
        from: `"${this.config.fromName}" <${this.config.fromEmail}>`,
        to: data.to,
        subject: data.subject,
        html: data.html,
        text: data.text,
        attachments: data.attachments,
      });
      console.log(`Email sent to ${data.to}: ${data.subject}`);
      return true;
    } catch (error) {
      console.error('Failed to send email:', error);
      return false;
    }
  }

  // Customer Emails
  async sendOrderConfirmation(data: OrderEmailData): Promise<boolean> {
    const html = this.generateOrderConfirmationHtml(data);
    return this.sendEmail({
      to: data.customerEmail,
      subject: `Order Confirmed - ${data.orderNumber}`,
      html,
    });
  }

  async sendDigitalDelivery(data: OrderEmailData): Promise<boolean> {
    const html = this.generateDigitalDeliveryHtml(data);
    return this.sendEmail({
      to: data.customerEmail,
      subject: `Your Download is Ready - ${data.productName}`,
      html,
    });
  }

  async sendCartAbandonment(data: CartAbandonmentData): Promise<boolean> {
    const html = this.generateCartAbandonmentHtml(data);
    return this.sendEmail({
      to: data.customerEmail,
      subject: `You left something behind - ${data.productName}`,
      html,
    });
  }

  async sendRefundProcessed(data: OrderEmailData): Promise<boolean> {
    const html = this.generateRefundHtml(data);
    return this.sendEmail({
      to: data.customerEmail,
      subject: `Refund Processed - Order ${data.orderNumber}`,
      html,
    });
  }

  // Seller Emails
  async sendNewOrderNotification(data: SellerNotificationData): Promise<boolean> {
    const html = this.generateNewOrderNotificationHtml(data);
    return this.sendEmail({
      to: data.sellerEmail,
      subject: `New Order - ${data.orderNumber}`,
      html,
    });
  }

  async sendLowInventoryAlert(data: { sellerEmail: string; sellerName: string; productName: string; currentStock: number; dashboardUrl: string }): Promise<boolean> {
    const html = this.generateLowInventoryHtml(data);
    return this.sendEmail({
      to: data.sellerEmail,
      subject: `Low Inventory Alert - ${data.productName}`,
      html,
    });
  }

  // Admin Emails
  async sendAdminNotification(data: AdminNotificationData): Promise<boolean> {
    const html = this.generateAdminNotificationHtml(data);
    return this.sendEmail({
      to: data.adminEmail,
      subject: `Platform Alert: ${data.eventType}`,
      html,
    });
  }

  async sendDailySummary(data: { adminEmail: string; date: string; newUsers: number; totalOrders: number; totalRevenue: string; topProducts: Array<{ name: string; sales: number }> }): Promise<boolean> {
    const html = this.generateDailySummaryHtml(data);
    return this.sendEmail({
      to: data.adminEmail,
      subject: `Daily Summary - ${data.date}`,
      html,
    });
  }

  // HTML Template Generators
  private getBaseTemplate(content: string, footerText?: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DigitalCart</title>
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif; background-color: #f4f4f5; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .card { background: #ffffff; border-radius: 8px; padding: 32px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .header { text-align: center; margin-bottom: 24px; }
    .logo { font-size: 24px; font-weight: bold; color: #ea580c; }
    h1 { color: #18181b; font-size: 24px; margin: 0 0 16px 0; }
    h2 { color: #27272a; font-size: 18px; margin: 0 0 12px 0; }
    p { color: #52525b; line-height: 1.6; margin: 0 0 16px 0; }
    .button { display: inline-block; background: #ea580c; color: #ffffff !important; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500; margin: 16px 0; }
    .button:hover { background: #c2410c; }
    .order-details { background: #fafafa; border-radius: 6px; padding: 20px; margin: 20px 0; }
    .order-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e4e4e7; }
    .order-row:last-child { border-bottom: none; font-weight: 600; }
    .product-image { width: 80px; height: 80px; object-fit: cover; border-radius: 6px; }
    .download-link { display: block; background: #f0fdf4; border: 1px solid #86efac; padding: 12px 16px; border-radius: 6px; margin: 8px 0; color: #166534; text-decoration: none; }
    .alert { background: #fef2f2; border: 1px solid #fecaca; padding: 16px; border-radius: 6px; color: #991b1b; }
    .success { background: #f0fdf4; border: 1px solid #86efac; padding: 16px; border-radius: 6px; color: #166534; }
    .footer { text-align: center; padding: 20px; color: #71717a; font-size: 12px; }
    .stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin: 20px 0; }
    .stat-card { background: #fafafa; padding: 16px; border-radius: 6px; text-align: center; }
    .stat-value { font-size: 24px; font-weight: bold; color: #18181b; }
    .stat-label { font-size: 12px; color: #71717a; text-transform: uppercase; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <div class="logo">DigitalCart</div>
      </div>
      ${content}
    </div>
    <div class="footer">
      <p>${footerText || 'Powered by DigitalCart - Your Digital Product Platform'}</p>
      <p>If you have any questions, please contact support.</p>
    </div>
  </div>
</body>
</html>`;
  }

  private generateOrderConfirmationHtml(data: OrderEmailData): string {
    const content = `
      <h1>Thank you for your order!</h1>
      <p>Hi ${data.customerName},</p>
      <p>We've received your order and it's being processed. Here are the details:</p>
      
      <div class="order-details">
        <h2>Order #${data.orderNumber}</h2>
        ${data.productImage ? `<img src="${data.productImage}" alt="${data.productName}" class="product-image" />` : ''}
        <div class="order-row">
          <span>${data.productName}</span>
          <span>${data.currency} ${data.price}</span>
        </div>
        <div class="order-row">
          <span>Quantity</span>
          <span>${data.quantity}</span>
        </div>
        <div class="order-row">
          <span><strong>Total</strong></span>
          <span><strong>${data.currency} ${data.total}</strong></span>
        </div>
      </div>
      
      ${data.invoiceUrl ? `<p><a href="${data.invoiceUrl}" class="button">Download Invoice</a></p>` : ''}
      
      <p>You'll receive another email with download links once your order is ready.</p>
      <p>Thank you for your purchase!</p>
      <p><strong>${data.sellerName}</strong></p>
    `;
    return this.getBaseTemplate(content);
  }

  private generateDigitalDeliveryHtml(data: OrderEmailData): string {
    const downloadLinksHtml = data.downloadLinks?.map(link => 
      `<a href="${link.url}" class="download-link">Download: ${link.name}</a>`
    ).join('') || '';

    const content = `
      <h1>Your download is ready!</h1>
      <p>Hi ${data.customerName},</p>
      <p>Great news! Your digital product is ready for download.</p>
      
      <div class="success">
        <strong>${data.productName}</strong>
      </div>
      
      <h2>Download Links</h2>
      ${downloadLinksHtml}
      
      <p><small>Note: Download links expire in 30 days and have a limited number of downloads.</small></p>
      
      <p>If you have any issues with your download, please contact us.</p>
      <p>Enjoy your purchase!</p>
      <p><strong>${data.sellerName}</strong></p>
    `;
    return this.getBaseTemplate(content);
  }

  private generateCartAbandonmentHtml(data: CartAbandonmentData): string {
    const discountText = data.couponCode 
      ? `<div class="success">Use code <strong>${data.couponCode}</strong> for ${data.discountPercent}% off!</div>` 
      : '';

    const content = `
      <h1>You left something behind...</h1>
      <p>Hi ${data.customerName},</p>
      <p>We noticed you didn't complete your purchase. Don't worry, we saved your cart!</p>
      
      <div class="order-details">
        ${data.productImage ? `<img src="${data.productImage}" alt="${data.productName}" class="product-image" />` : ''}
        <h2>${data.productName}</h2>
        <p class="price">${data.price}</p>
      </div>
      
      ${discountText}
      
      <p style="text-align: center;">
        <a href="${data.checkoutUrl}" class="button">Complete Your Purchase</a>
      </p>
      
      <p>If you have any questions, we're here to help!</p>
    `;
    return this.getBaseTemplate(content);
  }

  private generateRefundHtml(data: OrderEmailData): string {
    const content = `
      <h1>Refund Processed</h1>
      <p>Hi ${data.customerName},</p>
      <p>Your refund for Order #${data.orderNumber} has been processed.</p>
      
      <div class="order-details">
        <div class="order-row">
          <span>Product</span>
          <span>${data.productName}</span>
        </div>
        <div class="order-row">
          <span>Refund Amount</span>
          <span>${data.currency} ${data.total}</span>
        </div>
      </div>
      
      <p>The refund should appear in your account within 5-10 business days, depending on your payment provider.</p>
      
      <p>If you have any questions, please contact support.</p>
    `;
    return this.getBaseTemplate(content);
  }

  private generateNewOrderNotificationHtml(data: SellerNotificationData): string {
    const content = `
      <h1>New Order Received!</h1>
      <p>Hi ${data.sellerName},</p>
      <p>Great news! You have a new order.</p>
      
      <div class="success">
        <strong>Order #${data.orderNumber}</strong>
      </div>
      
      <div class="order-details">
        <div class="order-row">
          <span>Customer</span>
          <span>${data.customerName}</span>
        </div>
        <div class="order-row">
          <span>Product</span>
          <span>${data.productName}</span>
        </div>
        <div class="order-row">
          <span>Amount</span>
          <span><strong>${data.amount}</strong></span>
        </div>
      </div>
      
      <p style="text-align: center;">
        <a href="${data.dashboardUrl}" class="button">View Order Details</a>
      </p>
    `;
    return this.getBaseTemplate(content);
  }

  private generateLowInventoryHtml(data: { sellerEmail: string; sellerName: string; productName: string; currentStock: number; dashboardUrl: string }): string {
    const content = `
      <h1>Low Inventory Alert</h1>
      <p>Hi ${data.sellerName},</p>
      
      <div class="alert">
        <strong>${data.productName}</strong> is running low on stock.
        <br/>Current inventory: <strong>${data.currentStock} units</strong>
      </div>
      
      <p>Consider restocking soon to avoid missing sales.</p>
      
      <p style="text-align: center;">
        <a href="${data.dashboardUrl}" class="button">Manage Inventory</a>
      </p>
    `;
    return this.getBaseTemplate(content);
  }

  private generateAdminNotificationHtml(data: AdminNotificationData): string {
    const detailsHtml = data.details 
      ? Object.entries(data.details).map(([key, value]) => 
          `<div class="order-row"><span>${key}</span><span>${value}</span></div>`
        ).join('')
      : '';

    const content = `
      <h1>Platform Alert: ${data.eventType}</h1>
      
      ${data.userName ? `<p><strong>User:</strong> ${data.userName} (${data.userEmail})</p>` : ''}
      ${data.planName ? `<p><strong>Plan:</strong> ${data.planName}</p>` : ''}
      ${data.amount ? `<p><strong>Amount:</strong> ${data.amount}</p>` : ''}
      
      ${detailsHtml ? `<div class="order-details">${detailsHtml}</div>` : ''}
      
      <p>This is an automated notification from DigitalCart platform.</p>
    `;
    return this.getBaseTemplate(content);
  }

  private generateDailySummaryHtml(data: { adminEmail: string; date: string; newUsers: number; totalOrders: number; totalRevenue: string; topProducts: Array<{ name: string; sales: number }> }): string {
    const topProductsHtml = data.topProducts.map(p => 
      `<div class="order-row"><span>${p.name}</span><span>${p.sales} sales</span></div>`
    ).join('');

    const content = `
      <h1>Daily Summary - ${data.date}</h1>
      
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${data.newUsers}</div>
          <div class="stat-label">New Users</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${data.totalOrders}</div>
          <div class="stat-label">Orders</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${data.totalRevenue}</div>
          <div class="stat-label">Revenue</div>
        </div>
      </div>
      
      <h2>Top Products</h2>
      <div class="order-details">
        ${topProductsHtml}
      </div>
      
      <p>This is your daily platform summary from DigitalCart.</p>
    `;
    return this.getBaseTemplate(content);
  }

  // Invoice Generation
  generateInvoiceHtml(data: {
    invoiceNumber: string;
    date: string;
    dueDate?: string;
    sellerInfo: { name: string; email: string; address?: string };
    customerInfo: { name: string; email: string; address?: string };
    items: Array<{ name: string; quantity: number; price: string; total: string }>;
    subtotal: string;
    tax?: string;
    discount?: string;
    total: string;
    currency: string;
    notes?: string;
  }): string {
    const itemsHtml = data.items.map(item => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e4e4e7;">${item.name}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e4e4e7; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e4e4e7; text-align: right;">${data.currency} ${item.price}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e4e4e7; text-align: right;">${data.currency} ${item.total}</td>
      </tr>
    `).join('');

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${data.invoiceNumber}</title>
  <style>
    body { margin: 0; padding: 40px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #fff; color: #18181b; }
    .invoice { max-width: 800px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
    .logo { font-size: 28px; font-weight: bold; color: #ea580c; }
    .invoice-meta { text-align: right; }
    .invoice-number { font-size: 24px; font-weight: bold; color: #18181b; }
    .invoice-date { color: #71717a; margin-top: 4px; }
    .parties { display: flex; justify-content: space-between; margin-bottom: 40px; }
    .party { width: 45%; }
    .party-label { font-size: 12px; text-transform: uppercase; color: #71717a; margin-bottom: 8px; }
    .party-name { font-size: 18px; font-weight: 600; margin-bottom: 4px; }
    .party-details { color: #52525b; line-height: 1.6; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    th { background: #f4f4f5; padding: 12px; text-align: left; font-weight: 600; }
    th:nth-child(2), th:nth-child(3), th:nth-child(4) { text-align: right; }
    .totals { margin-left: auto; width: 300px; }
    .totals-row { display: flex; justify-content: space-between; padding: 8px 0; }
    .totals-row.total { font-size: 18px; font-weight: bold; border-top: 2px solid #18181b; padding-top: 12px; margin-top: 8px; }
    .notes { background: #fafafa; padding: 20px; border-radius: 8px; margin-top: 40px; }
    .notes-label { font-weight: 600; margin-bottom: 8px; }
    .footer { margin-top: 60px; text-align: center; color: #71717a; font-size: 12px; }
  </style>
</head>
<body>
  <div class="invoice">
    <div class="header">
      <div class="logo">DigitalCart</div>
      <div class="invoice-meta">
        <div class="invoice-number">Invoice #${data.invoiceNumber}</div>
        <div class="invoice-date">Date: ${data.date}</div>
        ${data.dueDate ? `<div class="invoice-date">Due: ${data.dueDate}</div>` : ''}
      </div>
    </div>
    
    <div class="parties">
      <div class="party">
        <div class="party-label">From</div>
        <div class="party-name">${data.sellerInfo.name}</div>
        <div class="party-details">
          ${data.sellerInfo.email}<br/>
          ${data.sellerInfo.address || ''}
        </div>
      </div>
      <div class="party">
        <div class="party-label">Bill To</div>
        <div class="party-name">${data.customerInfo.name}</div>
        <div class="party-details">
          ${data.customerInfo.email}<br/>
          ${data.customerInfo.address || ''}
        </div>
      </div>
    </div>
    
    <table>
      <thead>
        <tr>
          <th>Item</th>
          <th style="text-align: center;">Qty</th>
          <th style="text-align: right;">Price</th>
          <th style="text-align: right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>
    
    <div class="totals">
      <div class="totals-row">
        <span>Subtotal</span>
        <span>${data.currency} ${data.subtotal}</span>
      </div>
      ${data.discount ? `<div class="totals-row"><span>Discount</span><span>-${data.currency} ${data.discount}</span></div>` : ''}
      ${data.tax ? `<div class="totals-row"><span>Tax</span><span>${data.currency} ${data.tax}</span></div>` : ''}
      <div class="totals-row total">
        <span>Total</span>
        <span>${data.currency} ${data.total}</span>
      </div>
    </div>
    
    ${data.notes ? `<div class="notes"><div class="notes-label">Notes</div><p>${data.notes}</p></div>` : ''}
    
    <div class="footer">
      <p>Thank you for your business!</p>
      <p>Powered by DigitalCart</p>
    </div>
  </div>
</body>
</html>`;
  }
}

export const emailService = new EmailService();
export default emailService;
