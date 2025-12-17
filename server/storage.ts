import { db } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";
import {
  users,
  products,
  checkoutPages,
  orderBumps,
  upsells,
  coupons,
  customers,
  orders,
  orderItems,
  abandonedCarts,
  emailTemplates,
  pixelEvents,
  subscriptionPlans,
  platformSettings,
  platformPaymentGateways,
  mediaAssets,
  funnels,
  funnelPages,
  sellerPayments,
  downloadTokens,
  productFiles,
  type User,
  type InsertUser,
  type Product,
  type InsertProduct,
  type CheckoutPage,
  type InsertCheckoutPage,
  type OrderBump,
  type InsertOrderBump,
  type Upsell,
  type InsertUpsell,
  type Coupon,
  type InsertCoupon,
  type Customer,
  type InsertCustomer,
  type Order,
  type InsertOrder,
  type OrderItem,
  type InsertOrderItem,
  type AbandonedCart,
  type InsertAbandonedCart,
  type EmailTemplate,
  type InsertEmailTemplate,
  type PixelEvent,
  type InsertPixelEvent,
  type SubscriptionPlan,
  type InsertSubscriptionPlan,
  type PlatformSetting,
  type InsertPlatformSetting,
  type Funnel,
  type InsertFunnel,
  type FunnelPage,
  type InsertFunnelPage,
  type SellerPayment,
  type InsertSellerPayment,
  type DownloadToken,
  type InsertDownloadToken,
  type ProductFile,
  type InsertProductFile,
  type PlatformPaymentGateway,
  type InsertPlatformPaymentGateway,
} from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<User>): Promise<User | undefined>;

  // Products
  getProducts(userId: string): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, data: Partial<Product>): Promise<Product | undefined>;
  deleteProduct(id: string): Promise<boolean>;

  // Checkout Pages
  getCheckoutPages(userId: string): Promise<(CheckoutPage & { product?: Product })[]>;
  getCheckoutPage(id: string): Promise<(CheckoutPage & { product?: Product }) | undefined>;
  getCheckoutPageBySlug(slug: string): Promise<(CheckoutPage & { product?: Product }) | undefined>;
  createCheckoutPage(page: InsertCheckoutPage): Promise<CheckoutPage>;
  updateCheckoutPage(id: string, data: Partial<CheckoutPage>): Promise<CheckoutPage | undefined>;
  deleteCheckoutPage(id: string): Promise<boolean>;

  // Coupons
  getCoupons(userId: string): Promise<Coupon[]>;
  getCoupon(id: string): Promise<Coupon | undefined>;
  getCouponByCode(code: string, userId: string): Promise<Coupon | undefined>;
  createCoupon(coupon: InsertCoupon): Promise<Coupon>;
  updateCoupon(id: string, data: Partial<Coupon>): Promise<Coupon | undefined>;
  deleteCoupon(id: string): Promise<boolean>;

  // Customers
  getCustomers(userId: string): Promise<Customer[]>;
  getCustomer(id: string): Promise<Customer | undefined>;
  getCustomerByEmail(email: string, userId: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: string, data: Partial<Customer>): Promise<Customer | undefined>;

  // Orders
  getOrders(userId: string): Promise<(Order & { customer?: Customer; items?: OrderItem[] })[]>;
  getOrder(id: string): Promise<(Order & { customer?: Customer; items?: (OrderItem & { product?: Product })[] }) | undefined>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: string, data: Partial<Order>): Promise<Order | undefined>;

  // Order Items
  createOrderItem(item: InsertOrderItem): Promise<OrderItem>;
  getOrderItems(orderId: string): Promise<(OrderItem & { product?: Product })[]>;

  // Email Templates
  getEmailTemplates(userId: string): Promise<EmailTemplate[]>;
  getEmailTemplate(id: string): Promise<EmailTemplate | undefined>;
  createEmailTemplate(template: InsertEmailTemplate): Promise<EmailTemplate>;
  updateEmailTemplate(id: string, data: Partial<EmailTemplate>): Promise<EmailTemplate | undefined>;
  deleteEmailTemplate(id: string): Promise<boolean>;

  // Pixel Events
  createPixelEvent(event: InsertPixelEvent): Promise<PixelEvent>;
  getPixelEvents(userId: string, limit?: number): Promise<PixelEvent[]>;

  // Abandoned Carts
  createAbandonedCart(cart: InsertAbandonedCart): Promise<AbandonedCart>;
  getAbandonedCarts(userId: string): Promise<AbandonedCart[]>;
  updateAbandonedCart(id: string, data: Partial<AbandonedCart>): Promise<AbandonedCart | undefined>;

  // Media Assets
  getMediaAssets(userId: string): Promise<any[]>;
  createMediaAsset(asset: any): Promise<any>;
  deleteMediaAsset(id: string): Promise<boolean>;

  // Admin - Users
  getAllUsers(): Promise<User[]>;

  // Admin - Subscription Plans
  getSubscriptionPlans(): Promise<SubscriptionPlan[]>;
  getSubscriptionPlan(id: string): Promise<SubscriptionPlan | undefined>;
  createSubscriptionPlan(plan: InsertSubscriptionPlan): Promise<SubscriptionPlan>;
  updateSubscriptionPlan(id: string, data: Partial<SubscriptionPlan>): Promise<SubscriptionPlan | undefined>;
  deleteSubscriptionPlan(id: string): Promise<boolean>;

  // Order Bumps
  getOrderBumps(checkoutPageId: string): Promise<OrderBump[]>;
  createOrderBump(bump: InsertOrderBump): Promise<OrderBump>;

  // Upsells
  getUpsells(checkoutPageId: string): Promise<Upsell[]>;
  createUpsell(upsell: InsertUpsell): Promise<Upsell>;

  // Admin - Platform Settings
  getPlatformSettings(): Promise<Record<string, any>>;
  getPlatformSetting(key: string): Promise<PlatformSetting | undefined>;
  updatePlatformSetting(key: string, value: any): Promise<PlatformSetting>;

  // Funnels
  getFunnels(userId: string): Promise<(Funnel & { pages?: FunnelPage[]; product?: Product })[]>;
  getFunnel(id: string): Promise<(Funnel & { pages?: FunnelPage[]; product?: Product }) | undefined>;
  createFunnel(funnel: InsertFunnel): Promise<Funnel>;
  updateFunnel(id: string, data: Partial<Funnel>): Promise<Funnel | undefined>;
  deleteFunnel(id: string): Promise<boolean>;

  // Funnel Pages
  getFunnelPages(funnelId: string): Promise<FunnelPage[]>;
  getFunnelPage(id: string): Promise<FunnelPage | undefined>;
  createFunnelPage(page: InsertFunnelPage): Promise<FunnelPage>;
  updateFunnelPage(id: string, data: Partial<FunnelPage>): Promise<FunnelPage | undefined>;
  deleteFunnelPage(id: string): Promise<boolean>;

  // Seller Payments
  createSellerPayment(payment: InsertSellerPayment): Promise<SellerPayment>;
  getSellerPayment(id: string): Promise<SellerPayment | undefined>;
  getSellerPaymentByInvoiceId(invoiceId: string): Promise<SellerPayment | undefined>;
  updateSellerPayment(id: string, data: Partial<SellerPayment>): Promise<SellerPayment | undefined>;

  // Platform Payment Gateways (Admin)
  getPlatformPaymentGateways(): Promise<PlatformPaymentGateway[]>;
  getPlatformPaymentGateway(id: string): Promise<PlatformPaymentGateway | undefined>;
  getPlatformPaymentGatewayByProvider(provider: string): Promise<PlatformPaymentGateway | undefined>;
  getPrimaryPlatformPaymentGateway(): Promise<PlatformPaymentGateway | undefined>;
  createPlatformPaymentGateway(gateway: InsertPlatformPaymentGateway): Promise<PlatformPaymentGateway>;
  updatePlatformPaymentGateway(id: string, data: Partial<PlatformPaymentGateway>): Promise<PlatformPaymentGateway | undefined>;
  deletePlatformPaymentGateway(id: string): Promise<boolean>;

  // Download Tokens
  createDownloadToken(token: InsertDownloadToken): Promise<DownloadToken>;
  getDownloadTokenByToken(token: string): Promise<DownloadToken | undefined>;
  getDownloadTokensByCustomer(customerId: string): Promise<DownloadToken[]>;
  getDownloadTokenByOrderItem(orderItemId: string): Promise<DownloadToken | undefined>;
  updateDownloadToken(id: string, data: Partial<DownloadToken>): Promise<DownloadToken | undefined>;

  // Product Files
  getProductFiles(productId: string): Promise<ProductFile[]>;
  createProductFile(file: InsertProductFile): Promise<ProductFile>;
  deleteProductFile(id: string): Promise<boolean>;

  // Order Item
  getOrderItem(id: string): Promise<OrderItem | undefined>;

  // Orders by Customer
  getOrdersByCustomer(customerId: string): Promise<Order[]>;

  // Order by confirmation token
  getOrderByConfirmationToken(token: string): Promise<Order | undefined>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.googleId, googleId));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [created] = await db.insert(users).values(user).returning();
    return created;
  }

  async updateUser(id: string, data: Partial<User>): Promise<User | undefined> {
    const [updated] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return updated;
  }

  // Products
  async getProducts(userId: string): Promise<Product[]> {
    return db.select().from(products).where(eq(products.userId, userId)).orderBy(desc(products.createdAt));
  }

  async getProduct(id: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [created] = await db.insert(products).values(product).returning();
    return created;
  }

  async updateProduct(id: string, data: Partial<Product>): Promise<Product | undefined> {
    const [updated] = await db.update(products).set(data).where(eq(products.id, id)).returning();
    return updated;
  }

  async deleteProduct(id: string): Promise<boolean> {
    const result = await db.delete(products).where(eq(products.id, id)).returning();
    return result.length > 0;
  }

  // Checkout Pages
  async getCheckoutPages(userId: string): Promise<(CheckoutPage & { product?: Product })[]> {
    const pages = await db.select().from(checkoutPages).where(eq(checkoutPages.userId, userId)).orderBy(desc(checkoutPages.createdAt));
    
    const pagesWithProducts = await Promise.all(
      pages.map(async (page) => {
        const [product] = await db.select().from(products).where(eq(products.id, page.productId));
        return { ...page, product };
      })
    );
    
    return pagesWithProducts;
  }

  async getCheckoutPage(id: string): Promise<(CheckoutPage & { product?: Product }) | undefined> {
    const [page] = await db.select().from(checkoutPages).where(eq(checkoutPages.id, id));
    if (!page) return undefined;
    
    const [product] = await db.select().from(products).where(eq(products.id, page.productId));
    return { ...page, product };
  }

  async getCheckoutPageBySlug(slug: string): Promise<(CheckoutPage & { product?: Product }) | undefined> {
    const [page] = await db.select().from(checkoutPages).where(eq(checkoutPages.slug, slug));
    if (!page) return undefined;
    
    const [product] = await db.select().from(products).where(eq(products.id, page.productId));
    return { ...page, product };
  }

  async createCheckoutPage(page: InsertCheckoutPage): Promise<CheckoutPage> {
    const [created] = await db.insert(checkoutPages).values(page).returning();
    return created;
  }

  async updateCheckoutPage(id: string, data: Partial<CheckoutPage>): Promise<CheckoutPage | undefined> {
    const [updated] = await db.update(checkoutPages).set(data).where(eq(checkoutPages.id, id)).returning();
    return updated;
  }

  async deleteCheckoutPage(id: string): Promise<boolean> {
    const result = await db.delete(checkoutPages).where(eq(checkoutPages.id, id)).returning();
    return result.length > 0;
  }

  // Coupons
  async getCoupons(userId: string): Promise<Coupon[]> {
    return db.select().from(coupons).where(eq(coupons.userId, userId)).orderBy(desc(coupons.createdAt));
  }

  async getCoupon(id: string): Promise<Coupon | undefined> {
    const [coupon] = await db.select().from(coupons).where(eq(coupons.id, id));
    return coupon;
  }

  async getCouponByCode(code: string, userId: string): Promise<Coupon | undefined> {
    const [coupon] = await db.select().from(coupons).where(
      and(eq(coupons.code, code), eq(coupons.userId, userId))
    );
    return coupon;
  }

  async createCoupon(coupon: InsertCoupon): Promise<Coupon> {
    const [created] = await db.insert(coupons).values(coupon).returning();
    return created;
  }

  async updateCoupon(id: string, data: Partial<Coupon>): Promise<Coupon | undefined> {
    const [updated] = await db.update(coupons).set(data).where(eq(coupons.id, id)).returning();
    return updated;
  }

  async deleteCoupon(id: string): Promise<boolean> {
    const result = await db.delete(coupons).where(eq(coupons.id, id)).returning();
    return result.length > 0;
  }

  // Customers
  async getCustomers(userId: string): Promise<Customer[]> {
    return db.select().from(customers).where(eq(customers.userId, userId)).orderBy(desc(customers.createdAt));
  }

  async getCustomer(id: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    return customer;
  }

  async getCustomerByEmail(email: string, userId: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(
      and(eq(customers.email, email), eq(customers.userId, userId))
    );
    return customer;
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const [created] = await db.insert(customers).values(customer).returning();
    return created;
  }

  async updateCustomer(id: string, data: Partial<Customer>): Promise<Customer | undefined> {
    const [updated] = await db.update(customers).set(data).where(eq(customers.id, id)).returning();
    return updated;
  }

  // Orders
  async getOrders(userId: string): Promise<(Order & { customer?: Customer; items?: OrderItem[] })[]> {
    const allOrders = await db.select().from(orders).where(eq(orders.userId, userId)).orderBy(desc(orders.createdAt));
    
    const ordersWithDetails = await Promise.all(
      allOrders.map(async (order) => {
        const [customer] = await db.select().from(customers).where(eq(customers.id, order.customerId));
        const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
        return { ...order, customer, items };
      })
    );
    
    return ordersWithDetails;
  }

  async getOrder(id: string): Promise<(Order & { customer?: Customer; items?: (OrderItem & { product?: Product })[] }) | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    if (!order) return undefined;
    
    const [customer] = await db.select().from(customers).where(eq(customers.id, order.customerId));
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
    
    const itemsWithProducts = await Promise.all(
      items.map(async (item) => {
        const [product] = await db.select().from(products).where(eq(products.id, item.productId));
        return { ...item, product };
      })
    );
    
    return { ...order, customer, items: itemsWithProducts };
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const [created] = await db.insert(orders).values(order).returning();
    return created;
  }

  async updateOrder(id: string, data: Partial<Order>): Promise<Order | undefined> {
    const [updated] = await db.update(orders).set(data).where(eq(orders.id, id)).returning();
    return updated;
  }

  // Order Items
  async createOrderItem(item: InsertOrderItem): Promise<OrderItem> {
    const [created] = await db.insert(orderItems).values(item).returning();
    return created;
  }

  async getOrderItems(orderId: string): Promise<(OrderItem & { product?: Product })[]> {
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
    
    const itemsWithProducts = await Promise.all(
      items.map(async (item) => {
        const [product] = await db.select().from(products).where(eq(products.id, item.productId));
        return { ...item, product };
      })
    );
    
    return itemsWithProducts;
  }

  // Email Templates
  async getEmailTemplates(userId: string): Promise<EmailTemplate[]> {
    return db.select().from(emailTemplates).where(eq(emailTemplates.userId, userId));
  }

  async getEmailTemplate(id: string): Promise<EmailTemplate | undefined> {
    const [template] = await db.select().from(emailTemplates).where(eq(emailTemplates.id, id));
    return template;
  }

  async createEmailTemplate(template: InsertEmailTemplate): Promise<EmailTemplate> {
    const [created] = await db.insert(emailTemplates).values(template).returning();
    return created;
  }

  async updateEmailTemplate(id: string, data: Partial<EmailTemplate>): Promise<EmailTemplate | undefined> {
    const [updated] = await db.update(emailTemplates).set(data).where(eq(emailTemplates.id, id)).returning();
    return updated;
  }

  async deleteEmailTemplate(id: string): Promise<boolean> {
    const result = await db.delete(emailTemplates).where(eq(emailTemplates.id, id)).returning();
    return result.length > 0;
  }

  // Pixel Events
  async createPixelEvent(event: InsertPixelEvent): Promise<PixelEvent> {
    const [created] = await db.insert(pixelEvents).values(event).returning();
    return created;
  }

  async getPixelEvents(userId: string, limit = 100): Promise<PixelEvent[]> {
    return db.select().from(pixelEvents).where(eq(pixelEvents.userId, userId)).orderBy(desc(pixelEvents.createdAt)).limit(limit);
  }

  // Abandoned Carts
  async createAbandonedCart(cart: InsertAbandonedCart): Promise<AbandonedCart> {
    const [created] = await db.insert(abandonedCarts).values(cart).returning();
    return created;
  }

  async getAbandonedCarts(userId: string): Promise<AbandonedCart[]> {
    return db.select().from(abandonedCarts).where(eq(abandonedCarts.userId, userId)).orderBy(desc(abandonedCarts.createdAt));
  }

  async updateAbandonedCart(id: string, data: Partial<AbandonedCart>): Promise<AbandonedCart | undefined> {
    const [updated] = await db.update(abandonedCarts).set(data).where(eq(abandonedCarts.id, id)).returning();
    return updated;
  }

  // Admin - Users
  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt));
  }

  // Admin - Subscription Plans
  async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    return db.select().from(subscriptionPlans).orderBy(subscriptionPlans.sortOrder);
  }

  async getSubscriptionPlan(id: string): Promise<SubscriptionPlan | undefined> {
    const [plan] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, id));
    return plan;
  }

  async createSubscriptionPlan(plan: InsertSubscriptionPlan): Promise<SubscriptionPlan> {
    const [created] = await db.insert(subscriptionPlans).values(plan).returning();
    return created;
  }

  async updateSubscriptionPlan(id: string, data: Partial<SubscriptionPlan>): Promise<SubscriptionPlan | undefined> {
    const [updated] = await db.update(subscriptionPlans).set(data).where(eq(subscriptionPlans.id, id)).returning();
    return updated;
  }

  async deleteSubscriptionPlan(id: string): Promise<boolean> {
    const result = await db.delete(subscriptionPlans).where(eq(subscriptionPlans.id, id)).returning();
    return result.length > 0;
  }

  // Order Bumps
  async getOrderBumps(checkoutPageId: string): Promise<OrderBump[]> {
    return db.select().from(orderBumps).where(eq(orderBumps.checkoutPageId, checkoutPageId));
  }

  async createOrderBump(bump: InsertOrderBump): Promise<OrderBump> {
    const [created] = await db.insert(orderBumps).values(bump).returning();
    return created;
  }

  // Upsells
  async getUpsells(checkoutPageId: string): Promise<Upsell[]> {
    return db.select().from(upsells).where(eq(upsells.checkoutPageId, checkoutPageId));
  }

  async createUpsell(upsell: InsertUpsell): Promise<Upsell> {
    const [created] = await db.insert(upsells).values(upsell).returning();
    return created;
  }

  // Admin - Platform Settings
  async getPlatformSettings(): Promise<Record<string, any>> {
    const settings = await db.select().from(platformSettings);
    const result: Record<string, any> = {};
    for (const setting of settings) {
      result[setting.key] = setting.value;
    }
    return result;
  }

  async getPlatformSetting(key: string): Promise<PlatformSetting | undefined> {
    const [setting] = await db.select().from(platformSettings).where(eq(platformSettings.key, key));
    return setting;
  }

  async updatePlatformSetting(key: string, value: any): Promise<PlatformSetting> {
    const existing = await this.getPlatformSetting(key);
    if (existing) {
      const [updated] = await db.update(platformSettings).set({ value, updatedAt: new Date() }).where(eq(platformSettings.key, key)).returning();
      return updated;
    }
    const [created] = await db.insert(platformSettings).values({ key, value }).returning();
    return created;
  }

  // Media Assets
  async getMediaAssets(userId: string): Promise<any[]> {
    return db.select().from(mediaAssets).where(eq(mediaAssets.userId, userId)).orderBy(desc(mediaAssets.createdAt));
  }

  async createMediaAsset(asset: any): Promise<any> {
    const [created] = await db.insert(mediaAssets).values(asset).returning();
    return created;
  }

  async deleteMediaAsset(id: string): Promise<boolean> {
    const result = await db.delete(mediaAssets).where(eq(mediaAssets.id, id)).returning();
    return result.length > 0;
  }

  // Funnels
  async getFunnels(userId: string): Promise<(Funnel & { pages?: FunnelPage[]; product?: Product })[]> {
    const allFunnels = await db.select().from(funnels).where(eq(funnels.userId, userId)).orderBy(desc(funnels.createdAt));
    
    const funnelsWithData = await Promise.all(
      allFunnels.map(async (funnel) => {
        const pages = await db.select().from(funnelPages).where(eq(funnelPages.funnelId, funnel.id)).orderBy(funnelPages.sortOrder);
        let product: Product | undefined;
        if (funnel.productId) {
          const [p] = await db.select().from(products).where(eq(products.id, funnel.productId));
          product = p;
        }
        return { ...funnel, pages, product };
      })
    );
    
    return funnelsWithData;
  }

  async getFunnel(id: string): Promise<(Funnel & { pages?: FunnelPage[]; product?: Product }) | undefined> {
    const [funnel] = await db.select().from(funnels).where(eq(funnels.id, id));
    if (!funnel) return undefined;
    
    const pages = await db.select().from(funnelPages).where(eq(funnelPages.funnelId, id)).orderBy(funnelPages.sortOrder);
    let product: Product | undefined;
    if (funnel.productId) {
      const [p] = await db.select().from(products).where(eq(products.id, funnel.productId));
      product = p;
    }
    
    return { ...funnel, pages, product };
  }

  async createFunnel(funnel: InsertFunnel): Promise<Funnel> {
    const [created] = await db.insert(funnels).values(funnel as any).returning();
    return created;
  }

  async updateFunnel(id: string, data: Partial<Funnel>): Promise<Funnel | undefined> {
    const [updated] = await db.update(funnels).set({ ...data, updatedAt: new Date() }).where(eq(funnels.id, id)).returning();
    return updated;
  }

  async deleteFunnel(id: string): Promise<boolean> {
    await db.delete(funnelPages).where(eq(funnelPages.funnelId, id));
    const result = await db.delete(funnels).where(eq(funnels.id, id)).returning();
    return result.length > 0;
  }

  // Funnel Pages
  async getFunnelPages(funnelId: string): Promise<FunnelPage[]> {
    return db.select().from(funnelPages).where(eq(funnelPages.funnelId, funnelId)).orderBy(funnelPages.sortOrder);
  }

  async getFunnelPage(id: string): Promise<FunnelPage | undefined> {
    const [page] = await db.select().from(funnelPages).where(eq(funnelPages.id, id));
    return page;
  }

  async createFunnelPage(page: InsertFunnelPage): Promise<FunnelPage> {
    const [created] = await db.insert(funnelPages).values(page).returning();
    return created;
  }

  async updateFunnelPage(id: string, data: Partial<FunnelPage>): Promise<FunnelPage | undefined> {
    const [updated] = await db.update(funnelPages).set({ ...data, updatedAt: new Date() }).where(eq(funnelPages.id, id)).returning();
    return updated;
  }

  async deleteFunnelPage(id: string): Promise<boolean> {
    const result = await db.delete(funnelPages).where(eq(funnelPages.id, id)).returning();
    return result.length > 0;
  }

  // Seller Payments
  async createSellerPayment(payment: InsertSellerPayment): Promise<SellerPayment> {
    const [created] = await db.insert(sellerPayments).values(payment).returning();
    return created;
  }

  async getSellerPayment(id: string): Promise<SellerPayment | undefined> {
    const [payment] = await db.select().from(sellerPayments).where(eq(sellerPayments.id, id));
    return payment;
  }

  async updateSellerPayment(id: string, data: Partial<SellerPayment>): Promise<SellerPayment | undefined> {
    const [updated] = await db.update(sellerPayments).set(data).where(eq(sellerPayments.id, id)).returning();
    return updated;
  }

  async getSellerPaymentByInvoiceId(invoiceId: string): Promise<SellerPayment | undefined> {
    const [payment] = await db.select().from(sellerPayments).where(eq(sellerPayments.invoiceId, invoiceId));
    return payment;
  }

  // Platform Payment Gateways (Admin)
  async getPlatformPaymentGateways(): Promise<PlatformPaymentGateway[]> {
    return db.select().from(platformPaymentGateways).orderBy(desc(platformPaymentGateways.createdAt));
  }

  async getPlatformPaymentGateway(id: string): Promise<PlatformPaymentGateway | undefined> {
    const [gateway] = await db.select().from(platformPaymentGateways).where(eq(platformPaymentGateways.id, id));
    return gateway;
  }

  async getPlatformPaymentGatewayByProvider(provider: string): Promise<PlatformPaymentGateway | undefined> {
    const [gateway] = await db.select().from(platformPaymentGateways).where(eq(platformPaymentGateways.provider, provider));
    return gateway;
  }

  async getPrimaryPlatformPaymentGateway(): Promise<PlatformPaymentGateway | undefined> {
    const [gateway] = await db.select().from(platformPaymentGateways).where(
      and(eq(platformPaymentGateways.isPrimary, true), eq(platformPaymentGateways.isActive, true))
    );
    return gateway;
  }

  async createPlatformPaymentGateway(gateway: InsertPlatformPaymentGateway): Promise<PlatformPaymentGateway> {
    const [created] = await db.insert(platformPaymentGateways).values(gateway).returning();
    return created;
  }

  async updatePlatformPaymentGateway(id: string, data: Partial<PlatformPaymentGateway>): Promise<PlatformPaymentGateway | undefined> {
    const [updated] = await db.update(platformPaymentGateways).set({ ...data, updatedAt: new Date() }).where(eq(platformPaymentGateways.id, id)).returning();
    return updated;
  }

  async deletePlatformPaymentGateway(id: string): Promise<boolean> {
    const result = await db.delete(platformPaymentGateways).where(eq(platformPaymentGateways.id, id)).returning();
    return result.length > 0;
  }

  // Download Tokens
  async createDownloadToken(token: InsertDownloadToken): Promise<DownloadToken> {
    const [created] = await db.insert(downloadTokens).values(token).returning();
    return created;
  }

  async getDownloadTokenByToken(token: string): Promise<DownloadToken | undefined> {
    const [downloadToken] = await db.select().from(downloadTokens).where(eq(downloadTokens.token, token));
    return downloadToken;
  }

  async getDownloadTokensByCustomer(customerId: string): Promise<DownloadToken[]> {
    return db.select().from(downloadTokens).where(eq(downloadTokens.customerId, customerId)).orderBy(desc(downloadTokens.createdAt));
  }

  async getDownloadTokenByOrderItem(orderItemId: string): Promise<DownloadToken | undefined> {
    const [token] = await db.select().from(downloadTokens).where(eq(downloadTokens.orderItemId, orderItemId));
    return token;
  }

  async updateDownloadToken(id: string, data: Partial<DownloadToken>): Promise<DownloadToken | undefined> {
    const [updated] = await db.update(downloadTokens).set(data).where(eq(downloadTokens.id, id)).returning();
    return updated;
  }

  // Product Files
  async getProductFiles(productId: string): Promise<ProductFile[]> {
    return db.select().from(productFiles).where(eq(productFiles.productId, productId));
  }

  async createProductFile(file: InsertProductFile): Promise<ProductFile> {
    const [created] = await db.insert(productFiles).values(file).returning();
    return created;
  }

  async deleteProductFile(id: string): Promise<boolean> {
    const result = await db.delete(productFiles).where(eq(productFiles.id, id)).returning();
    return result.length > 0;
  }

  // Order Item
  async getOrderItem(id: string): Promise<OrderItem | undefined> {
    const [item] = await db.select().from(orderItems).where(eq(orderItems.id, id));
    return item;
  }

  // Orders by Customer
  async getOrdersByCustomer(customerId: string): Promise<Order[]> {
    return db.select().from(orders).where(eq(orders.customerId, customerId)).orderBy(desc(orders.createdAt));
  }

  // Order by confirmation token
  async getOrderByConfirmationToken(token: string): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.confirmationToken, token));
    return order;
  }
}

export const storage: IStorage = new DatabaseStorage();
