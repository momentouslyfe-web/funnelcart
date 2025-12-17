import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, decimal, jsonb, uuid, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

// Subscription Plans - platform pricing tiers
export const subscriptionPlans = pgTable("subscription_plans", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  billingPeriod: text("billing_period").default("monthly"), // monthly, yearly
  features: jsonb("features").default([]), // array of feature keys
  productLimit: integer("product_limit"),
  checkoutPageLimit: integer("checkout_page_limit"),
  monthlyOrderLimit: integer("monthly_order_limit"),
  aiCreditsPerMonth: integer("ai_credits_per_month").default(0),
  customDomainAllowed: boolean("custom_domain_allowed").default(false),
  prioritySupport: boolean("priority_support").default(false),
  whitelabelAllowed: boolean("whitelabel_allowed").default(false),
  trialEnabled: boolean("trial_enabled").default(false),
  trialDays: integer("trial_days").default(0),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// User roles: super_admin (platform owner), admin (platform staff), seller (merchants)
export const USER_ROLES = ["super_admin", "admin", "seller"] as const;
export type UserRole = typeof USER_ROLES[number];

// Users table - platform admins and store owners/sellers
export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password"),
  googleId: text("google_id").unique(),
  supabaseId: text("supabase_id").unique(),
  role: text("role").default("seller"), // super_admin, admin, seller
  businessName: text("business_name"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  avatarUrl: text("avatar_url"),
  logoUrl: text("logo_url"),
  primaryColor: text("primary_color").default("#2563eb"),
  planId: uuid("plan_id").references(() => subscriptionPlans.id),
  planStatus: text("plan_status").default("free"), // free, trial, active, cancelled, past_due
  planExpiresAt: timestamp("plan_expires_at"),
  trialEndsAt: timestamp("trial_ends_at"),
  subscriptionId: text("subscription_id"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  facebookPixelId: text("facebook_pixel_id"),
  facebookAccessToken: text("facebook_access_token"),
  uddoktapayApiKey: text("uddoktapay_api_key"),
  uddoktapayApiUrl: text("uddoktapay_api_url"),
  sendgridApiKey: text("sendgrid_api_key"),
  fromEmail: text("from_email"),
  customDomain: text("custom_domain"),
  domainVerified: boolean("domain_verified").default(false),
  emailVerified: boolean("email_verified").default(false),
  isActive: boolean("is_active").default(true),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Media Library - uploaded files for sellers
export const mediaAssets = pgTable("media_assets", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  fileName: text("file_name").notNull(),
  fileType: text("file_type").notNull(), // image, video, document, audio
  mimeType: text("mime_type"),
  fileSize: integer("file_size"),
  fileUrl: text("file_url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  tags: text("tags").array(),
  isPublic: boolean("is_public").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Products - digital and physical products
export const products = pgTable("products", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  shortDescription: text("short_description"),
  productType: text("product_type").default("digital"), // digital, physical, service
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  compareAtPrice: decimal("compare_at_price", { precision: 10, scale: 2 }),
  costPrice: decimal("cost_price", { precision: 10, scale: 2 }),
  imageUrl: text("image_url"),
  galleryImages: text("gallery_images").array(),
  fileUrl: text("file_url"), // Primary digital file URL
  fileName: text("file_name"), // Primary digital file name
  sku: text("sku"),
  trackInventory: boolean("track_inventory").default(false),
  inventoryCount: integer("inventory_count").default(0),
  weight: decimal("weight", { precision: 10, scale: 2 }),
  weightUnit: text("weight_unit").default("kg"),
  requiresShipping: boolean("requires_shipping").default(false),
  downloadLimit: integer("download_limit").default(5),
  downloadExpiry: integer("download_expiry").default(30), // days
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Product Files - multiple files per digital product
export const productFiles = pgTable("product_files", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: uuid("product_id").notNull().references(() => products.id),
  mediaAssetId: uuid("media_asset_id").references(() => mediaAssets.id),
  name: text("name").notNull(),
  fileName: text("file_name").notNull(),
  fileUrl: text("file_url").notNull(),
  fileSize: integer("file_size"),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Checkout Pages - customizable checkout page designs
export const checkoutPages = pgTable("checkout_pages", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id),
  productId: uuid("product_id").notNull().references(() => products.id),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  checkoutMode: text("checkout_mode").default("full"), // full, embedded, slide, express
  template: text("template").default("publisher"), // publisher, author, clean, minimalist
  blocks: jsonb("blocks").default([]),
  customStyles: jsonb("custom_styles").default({}),
  headerText: text("header_text"),
  footerText: text("footer_text"),
  successUrl: text("success_url"),
  cancelUrl: text("cancel_url"),
  collectPhone: boolean("collect_phone").default(false),
  collectAddress: boolean("collect_address").default(false),
  enableTestMode: boolean("enable_test_mode").default(false),
  isPublished: boolean("is_published").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Payment Gateways - seller's configured payment providers
export const paymentGateways = pgTable("payment_gateways", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id),
  provider: text("provider").notNull(), // stripe, paypal, uddoktapay, razorpay, bkash
  displayName: text("display_name"),
  credentials: jsonb("credentials").default({}), // encrypted API keys
  isTestMode: boolean("is_test_mode").default(true),
  isActive: boolean("is_active").default(true),
  isPrimary: boolean("is_primary").default(false),
  supportedCurrencies: text("supported_currencies").array(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Platform Settings - super admin configuration
export const platformSettings = pgTable("platform_settings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(),
  value: jsonb("value"),
  description: text("description"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Platform Payment Gateways - admin-level payment provider configuration for collecting from sellers
export const platformPaymentGateways = pgTable("platform_payment_gateways", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  provider: text("provider").notNull(), // uddoktapay, stripe, paypal, razorpay
  displayName: text("display_name"),
  apiKey: text("api_key"),
  apiUrl: text("api_url"),
  webhookSecret: text("webhook_secret"),
  isTestMode: boolean("is_test_mode").default(true),
  isActive: boolean("is_active").default(true),
  isPrimary: boolean("is_primary").default(false),
  supportedCurrencies: text("supported_currencies").array().default(["BDT"]),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Funnel Templates - pre-built templates for sellers
export const funnelTemplates = pgTable("funnel_templates", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category"), // ebook, course, service, physical
  thumbnailUrl: text("thumbnail_url"),
  blocks: jsonb("blocks").default([]),
  customStyles: jsonb("custom_styles").default({}),
  tier: text("tier").default("free"), // free, premium, exclusive
  requiredPlan: uuid("required_plan").references(() => subscriptionPlans.id),
  usageCount: integer("usage_count").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Upsell/Downsell/OrderBump offer type for JSON storage
export type FunnelOffer = {
  id: string;
  productId: string;
  productName?: string;
  headline?: string;
  description?: string;
  discountType?: 'fixed' | 'percentage';
  discountValue?: number;
  sortOrder?: number;
};

// Funnels - seller sales funnels with conversion features
export const funnels = pgTable("funnels", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  name: varchar("name").notNull(),
  description: text("description"),
  // Required main product
  productId: varchar("product_id"),
  // Slug for public URL
  slug: text("slug"),
  // Enable/disable options for conversion features
  upsellsEnabled: boolean("upsells_enabled").default(false),
  downsellsEnabled: boolean("downsells_enabled").default(false),
  orderBumpsEnabled: boolean("order_bumps_enabled").default(false),
  // Multiple offers stored as JSONB arrays
  upsells: jsonb("upsells").default([]).$type<FunnelOffer[]>(),
  downsells: jsonb("downsells").default([]).$type<FunnelOffer[]>(),
  orderBumps: jsonb("order_bumps").default([]).$type<FunnelOffer[]>(),
  // AI generation context from seller
  customInstructions: text("custom_instructions"),
  targetAudience: text("target_audience"),
  tone: text("tone").default("professional"),
  additionalContent: text("additional_content"),
  // Funnel settings
  currency: text("currency").default("USD"),
  isPublished: boolean("is_published").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Funnel Pages - individual pages within a funnel
export const funnelPages = pgTable("funnel_pages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  funnelId: varchar("funnel_id").notNull(),
  // Page type: landing, sales, checkout, thankyou, upsell, downsell
  pageType: varchar("page_type").notNull(),
  name: varchar("name").notNull(),
  slug: varchar("slug"),
  // Visual editor blocks as JSON
  blocks: jsonb("blocks").default([]),
  // Custom styles
  customStyles: jsonb("custom_styles").default({}),
  // AI generation metadata
  aiGenerated: boolean("ai_generated").default(false),
  aiPrompt: text("ai_prompt"),
  aiInstructions: text("ai_instructions"),
  aiModel: text("ai_model"),
  // For upsell/downsell pages, link to specific offer
  linkedOfferId: text("linked_offer_id"),
  linkedOfferType: text("linked_offer_type"),
  // Page settings
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  sortOrder: integer("sort_order").default(0),
  isPublished: boolean("is_published").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// AI Requests - track AI usage for billing
export const aiRequests = pgTable("ai_requests", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id),
  requestType: text("request_type").notNull(), // page_generate, content_write, image_generate
  model: text("model"), // gemini-pro, gpt-4, etc
  prompt: text("prompt"),
  response: text("response"),
  tokensUsed: integer("tokens_used"),
  creditsUsed: integer("credits_used").default(1),
  status: text("status").default("pending"), // pending, completed, failed
  createdAt: timestamp("created_at").defaultNow(),
});

// Order Bumps - complementary offers shown during checkout
export const orderBumps = pgTable("order_bumps", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  checkoutPageId: uuid("checkout_page_id").notNull().references(() => checkoutPages.id),
  productId: uuid("product_id").notNull().references(() => products.id),
  headline: text("headline").notNull(),
  description: text("description"),
  discountType: text("discount_type").default("fixed"), // fixed, percentage
  discountValue: decimal("discount_value", { precision: 10, scale: 2 }).default("0"),
  position: integer("position").default(0),
  isActive: boolean("is_active").default(true),
});

// Upsells - post-purchase offers
export const upsells = pgTable("upsells", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  checkoutPageId: uuid("checkout_page_id").notNull().references(() => checkoutPages.id),
  productId: uuid("product_id").notNull().references(() => products.id),
  headline: text("headline").notNull(),
  description: text("description"),
  discountType: text("discount_type").default("fixed"),
  discountValue: decimal("discount_value", { precision: 10, scale: 2 }).default("0"),
  position: integer("position").default(0),
  isActive: boolean("is_active").default(true),
});

// Coupons - discount codes
export const coupons = pgTable("coupons", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id),
  code: text("code").notNull(),
  discountType: text("discount_type").notNull(), // fixed, percentage
  discountValue: decimal("discount_value", { precision: 10, scale: 2 }).notNull(),
  usageLimit: integer("usage_limit"),
  usedCount: integer("used_count").default(0),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Customers - buyers (can log in to view purchases and download products)
export const customers = pgTable("customers", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id),
  email: text("email").notNull(),
  password: text("password"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  phone: text("phone"),
  country: text("country"),
  avatarUrl: text("avatar_url"),
  emailVerified: boolean("email_verified").default(false),
  isActive: boolean("is_active").default(true),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Orders - completed purchases
export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id),
  customerId: uuid("customer_id").notNull().references(() => customers.id),
  checkoutPageId: uuid("checkout_page_id").references(() => checkoutPages.id),
  orderNumber: text("order_number"),
  confirmationToken: text("confirmation_token"),
  status: text("status").default("pending"), // pending, completed, failed, refunded
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  discount: decimal("discount", { precision: 10, scale: 2 }).default("0"),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }),
  couponId: uuid("coupon_id").references(() => coupons.id),
  paymentMethod: text("payment_method"),
  transactionId: text("transaction_id"),
  invoiceId: text("invoice_id"),
  eventId: text("event_id"), // For Facebook deduplication
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Order Items - individual products in an order
export const orderItems = pgTable("order_items", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: uuid("order_id").notNull().references(() => orders.id),
  productId: uuid("product_id").notNull().references(() => products.id),
  productName: text("product_name"),
  quantity: integer("quantity").default(1),
  itemType: text("item_type").default("main"), // main, bump, upsell
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  downloadCount: integer("download_count").default(0),
  downloadToken: text("download_token"),
  tokenExpiresAt: timestamp("token_expires_at"),
});

// Cart Abandonment tracking
export const abandonedCarts = pgTable("abandoned_carts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id),
  checkoutPageId: uuid("checkout_page_id").notNull().references(() => checkoutPages.id),
  email: text("email"),
  cartData: jsonb("cart_data"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  recoveryEmailSent: boolean("recovery_email_sent").default(false),
  recoveredAt: timestamp("recovered_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Email Templates
export const emailTemplates = pgTable("email_templates", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id),
  type: text("type").notNull(), // purchase_confirmation, digital_delivery, cart_abandonment, upsell
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  isActive: boolean("is_active").default(true),
});

// Facebook Pixel Events log
export const pixelEvents = pgTable("pixel_events", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id),
  eventName: text("event_name").notNull(),
  eventId: text("event_id").notNull(),
  eventTime: timestamp("event_time").notNull(),
  userData: jsonb("user_data"),
  customData: jsonb("custom_data"),
  actionSource: text("action_source").default("website"),
  sentToServer: boolean("sent_to_server").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// System Email Templates - admin managed default templates
export const systemEmailTemplates = pgTable("system_email_templates", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  eventType: text("event_type").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  subject: text("subject").notNull(),
  htmlBody: text("html_body").notNull(),
  textBody: text("text_body"),
  variables: text("variables").array(),
  isActive: boolean("is_active").default(true),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Email Logs - track all sent emails
export const emailLogs = pgTable("email_logs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id),
  recipientEmail: text("recipient_email").notNull(),
  recipientType: text("recipient_type").notNull(),
  eventType: text("event_type").notNull(),
  subject: text("subject").notNull(),
  status: text("status").default("pending"),
  errorMessage: text("error_message"),
  metadata: jsonb("metadata"),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Cart Abandonment Sequences - automated email sequences
export const abandonmentSequences = pgTable("abandonment_sequences", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  emails: jsonb("emails").default([]),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Seller Payments - track subscription payments from sellers
export const sellerPayments = pgTable("seller_payments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id),
  planId: uuid("plan_id").references(() => subscriptionPlans.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").default("BDT"),
  paymentMethod: text("payment_method").default("uddoktapay"), // uddoktapay, stripe, manual
  transactionId: text("transaction_id"),
  invoiceId: text("invoice_id"),
  status: text("status").default("pending"), // pending, completed, failed, refunded
  paymentType: text("payment_type").default("subscription"), // subscription, upgrade, renewal
  metadata: jsonb("metadata"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Download Tokens - secure time-limited download access for customers
export const downloadTokens = pgTable("download_tokens", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  orderItemId: uuid("order_item_id").notNull().references(() => orderItems.id),
  customerId: uuid("customer_id").notNull().references(() => customers.id),
  productId: uuid("product_id").notNull().references(() => products.id),
  token: text("token").notNull().unique(),
  downloadsRemaining: integer("downloads_remaining").default(5),
  expiresAt: timestamp("expires_at").notNull(),
  lastDownloadAt: timestamp("last_download_at"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const subscriptionPlansRelations = relations(subscriptionPlans, ({ many }) => ({
  users: many(users),
  templates: many(funnelTemplates),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  plan: one(subscriptionPlans, { fields: [users.planId], references: [subscriptionPlans.id] }),
  products: many(products),
  mediaAssets: many(mediaAssets),
  checkoutPages: many(checkoutPages),
  paymentGateways: many(paymentGateways),
  coupons: many(coupons),
  customers: many(customers),
  orders: many(orders),
  emailTemplates: many(emailTemplates),
  pixelEvents: many(pixelEvents),
  abandonedCarts: many(abandonedCarts),
  aiRequests: many(aiRequests),
}));

export const mediaAssetsRelations = relations(mediaAssets, ({ one, many }) => ({
  user: one(users, { fields: [mediaAssets.userId], references: [users.id] }),
  productFiles: many(productFiles),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  user: one(users, { fields: [products.userId], references: [users.id] }),
  files: many(productFiles),
  checkoutPages: many(checkoutPages),
  orderBumps: many(orderBumps),
  upsells: many(upsells),
  orderItems: many(orderItems),
}));

export const productFilesRelations = relations(productFiles, ({ one }) => ({
  product: one(products, { fields: [productFiles.productId], references: [products.id] }),
  mediaAsset: one(mediaAssets, { fields: [productFiles.mediaAssetId], references: [mediaAssets.id] }),
}));

export const paymentGatewaysRelations = relations(paymentGateways, ({ one }) => ({
  user: one(users, { fields: [paymentGateways.userId], references: [users.id] }),
}));

export const funnelTemplatesRelations = relations(funnelTemplates, ({ one }) => ({
  requiredPlan: one(subscriptionPlans, { fields: [funnelTemplates.requiredPlan], references: [subscriptionPlans.id] }),
}));

export const aiRequestsRelations = relations(aiRequests, ({ one }) => ({
  user: one(users, { fields: [aiRequests.userId], references: [users.id] }),
}));

export const checkoutPagesRelations = relations(checkoutPages, ({ one, many }) => ({
  user: one(users, { fields: [checkoutPages.userId], references: [users.id] }),
  product: one(products, { fields: [checkoutPages.productId], references: [products.id] }),
  orderBumps: many(orderBumps),
  upsells: many(upsells),
  orders: many(orders),
  abandonedCarts: many(abandonedCarts),
}));

export const orderBumpsRelations = relations(orderBumps, ({ one }) => ({
  checkoutPage: one(checkoutPages, { fields: [orderBumps.checkoutPageId], references: [checkoutPages.id] }),
  product: one(products, { fields: [orderBumps.productId], references: [products.id] }),
}));

export const upsellsRelations = relations(upsells, ({ one }) => ({
  checkoutPage: one(checkoutPages, { fields: [upsells.checkoutPageId], references: [checkoutPages.id] }),
  product: one(products, { fields: [upsells.productId], references: [products.id] }),
}));

export const couponsRelations = relations(coupons, ({ one, many }) => ({
  user: one(users, { fields: [coupons.userId], references: [users.id] }),
  orders: many(orders),
}));

export const customersRelations = relations(customers, ({ one, many }) => ({
  user: one(users, { fields: [customers.userId], references: [users.id] }),
  orders: many(orders),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, { fields: [orders.userId], references: [users.id] }),
  customer: one(customers, { fields: [orders.customerId], references: [customers.id] }),
  checkoutPage: one(checkoutPages, { fields: [orders.checkoutPageId], references: [checkoutPages.id] }),
  coupon: one(coupons, { fields: [orders.couponId], references: [coupons.id] }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  product: one(products, { fields: [orderItems.productId], references: [products.id] }),
}));

export const abandonedCartsRelations = relations(abandonedCarts, ({ one }) => ({
  user: one(users, { fields: [abandonedCarts.userId], references: [users.id] }),
  checkoutPage: one(checkoutPages, { fields: [abandonedCarts.checkoutPageId], references: [checkoutPages.id] }),
}));

export const emailTemplatesRelations = relations(emailTemplates, ({ one }) => ({
  user: one(users, { fields: [emailTemplates.userId], references: [users.id] }),
}));

export const pixelEventsRelations = relations(pixelEvents, ({ one }) => ({
  user: one(users, { fields: [pixelEvents.userId], references: [users.id] }),
}));

export const funnelsRelations = relations(funnels, ({ one, many }) => ({
  user: one(users, { fields: [funnels.userId], references: [users.id] }),
  product: one(products, { fields: [funnels.productId], references: [products.id] }),
  pages: many(funnelPages),
}));

export const funnelPagesRelations = relations(funnelPages, ({ one }) => ({
  funnel: one(funnels, { fields: [funnelPages.funnelId], references: [funnels.id] }),
}));

// Insert Schemas
export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlans).omit({ id: true, createdAt: true });
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertMediaAssetSchema = createInsertSchema(mediaAssets).omit({ id: true, createdAt: true });
export const insertProductSchema = createInsertSchema(products).omit({ id: true, createdAt: true });
export const insertProductFileSchema = createInsertSchema(productFiles).omit({ id: true, createdAt: true });
export const insertCheckoutPageSchema = createInsertSchema(checkoutPages).omit({ id: true, createdAt: true });
export const insertPaymentGatewaySchema = createInsertSchema(paymentGateways).omit({ id: true, createdAt: true });
export const insertPlatformSettingSchema = createInsertSchema(platformSettings).omit({ id: true });
export const insertFunnelTemplateSchema = createInsertSchema(funnelTemplates).omit({ id: true, usageCount: true, createdAt: true });
export const insertFunnelSchema = createInsertSchema(funnels).omit({ id: true, createdAt: true, updatedAt: true });
export const insertFunnelPageSchema = createInsertSchema(funnelPages).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAiRequestSchema = createInsertSchema(aiRequests).omit({ id: true, createdAt: true });
export const insertOrderBumpSchema = createInsertSchema(orderBumps).omit({ id: true });
export const insertUpsellSchema = createInsertSchema(upsells).omit({ id: true });
export const insertCouponSchema = createInsertSchema(coupons).omit({ id: true, usedCount: true, createdAt: true });
export const insertCustomerSchema = createInsertSchema(customers).omit({ id: true, createdAt: true });
export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true });
export const insertOrderItemSchema = createInsertSchema(orderItems).omit({ id: true });
export const insertAbandonedCartSchema = createInsertSchema(abandonedCarts).omit({ id: true, createdAt: true });
export const insertEmailTemplateSchema = createInsertSchema(emailTemplates).omit({ id: true });
export const insertPixelEventSchema = createInsertSchema(pixelEvents).omit({ id: true, createdAt: true });
export const insertSystemEmailTemplateSchema = createInsertSchema(systemEmailTemplates).omit({ id: true, updatedAt: true });
export const insertEmailLogSchema = createInsertSchema(emailLogs).omit({ id: true, createdAt: true });
export const insertAbandonmentSequenceSchema = createInsertSchema(abandonmentSequences).omit({ id: true, createdAt: true });
export const insertSellerPaymentSchema = createInsertSchema(sellerPayments).omit({ id: true, createdAt: true });
export const insertDownloadTokenSchema = createInsertSchema(downloadTokens).omit({ id: true, createdAt: true });
export const insertPlatformPaymentGatewaySchema = createInsertSchema(platformPaymentGateways).omit({ id: true, createdAt: true, updatedAt: true });

// Types
export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type InsertSubscriptionPlan = z.infer<typeof insertSubscriptionPlanSchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type MediaAsset = typeof mediaAssets.$inferSelect;
export type InsertMediaAsset = z.infer<typeof insertMediaAssetSchema>;
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type ProductFile = typeof productFiles.$inferSelect;
export type InsertProductFile = z.infer<typeof insertProductFileSchema>;
export type CheckoutPage = typeof checkoutPages.$inferSelect;
export type InsertCheckoutPage = z.infer<typeof insertCheckoutPageSchema>;
export type PaymentGateway = typeof paymentGateways.$inferSelect;
export type InsertPaymentGateway = z.infer<typeof insertPaymentGatewaySchema>;
export type PlatformSetting = typeof platformSettings.$inferSelect;
export type InsertPlatformSetting = z.infer<typeof insertPlatformSettingSchema>;
export type FunnelTemplate = typeof funnelTemplates.$inferSelect;
export type InsertFunnelTemplate = z.infer<typeof insertFunnelTemplateSchema>;
export type Funnel = typeof funnels.$inferSelect;
export type InsertFunnel = z.infer<typeof insertFunnelSchema>;
export type FunnelPage = typeof funnelPages.$inferSelect;
export type InsertFunnelPage = z.infer<typeof insertFunnelPageSchema>;
export type AiRequest = typeof aiRequests.$inferSelect;
export type InsertAiRequest = z.infer<typeof insertAiRequestSchema>;
export type OrderBump = typeof orderBumps.$inferSelect;
export type InsertOrderBump = z.infer<typeof insertOrderBumpSchema>;
export type Upsell = typeof upsells.$inferSelect;
export type InsertUpsell = z.infer<typeof insertUpsellSchema>;
export type Coupon = typeof coupons.$inferSelect;
export type InsertCoupon = z.infer<typeof insertCouponSchema>;
export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
export type AbandonedCart = typeof abandonedCarts.$inferSelect;
export type InsertAbandonedCart = z.infer<typeof insertAbandonedCartSchema>;
export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type InsertEmailTemplate = z.infer<typeof insertEmailTemplateSchema>;
export type PixelEvent = typeof pixelEvents.$inferSelect;
export type InsertPixelEvent = z.infer<typeof insertPixelEventSchema>;
export type SystemEmailTemplate = typeof systemEmailTemplates.$inferSelect;
export type InsertSystemEmailTemplate = z.infer<typeof insertSystemEmailTemplateSchema>;
export type EmailLog = typeof emailLogs.$inferSelect;
export type InsertEmailLog = z.infer<typeof insertEmailLogSchema>;
export type AbandonmentSequence = typeof abandonmentSequences.$inferSelect;
export type InsertAbandonmentSequence = z.infer<typeof insertAbandonmentSequenceSchema>;
export type SellerPayment = typeof sellerPayments.$inferSelect;
export type InsertSellerPayment = z.infer<typeof insertSellerPaymentSchema>;
export type DownloadToken = typeof downloadTokens.$inferSelect;
export type InsertDownloadToken = z.infer<typeof insertDownloadTokenSchema>;
export type PlatformPaymentGateway = typeof platformPaymentGateways.$inferSelect;
export type InsertPlatformPaymentGateway = z.infer<typeof insertPlatformPaymentGatewaySchema>;

// Block types for visual page editor
export const blockSchema = z.object({
  id: z.string(),
  type: z.enum([
    "hero",
    "text",
    "heading",
    "image",
    "button",
    "pricing",
    "testimonial",
    "countdown",
    "divider",
    "spacer",
    "features",
    "guarantee",
    "orderBump",
    "paymentForm"
  ]),
  content: z.record(z.any()),
  styles: z.record(z.any()).optional(),
  position: z.number(),
});

export type Block = z.infer<typeof blockSchema>;
