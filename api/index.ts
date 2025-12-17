import express from "express";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

// Lazy load storage to prevent initialization errors
let storage: any = null;
let storageError: Error | null = null;

async function getStorage() {
  if (storageError) throw storageError;
  if (storage) return storage;
  
  try {
    const module = await import("../server/storage");
    storage = module.storage;
    return storage;
  } catch (err) {
    storageError = err as Error;
    console.error("Failed to load storage module:", err);
    throw err;
  }
}

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

async function getCurrentUserIdFromToken(req: express.Request): Promise<string | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }
  
  const token = authHeader.substring(7);
  if (!supabase) return null;
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return null;
    
    const store = await getStorage();
    let dbUser = await store.getUserByEmail(user.email || "");
    if (!dbUser && user.email) {
      dbUser = await store.createUser({
        email: user.email,
        supabaseId: user.id,
        businessName: user.user_metadata?.full_name || "My Store",
      });
    }
    return dbUser?.id || null;
  } catch {
    return null;
  }
}

async function getCurrentUserId(req: express.Request): Promise<string> {
  const userId = await getCurrentUserIdFromToken(req);
  if (userId) return userId;
  
  const store = await getStorage();
  let user = await store.getUserByEmail("demo@example.com");
  if (!user) {
    user = await store.createUser({
      email: "demo@example.com",
      password: "demo123",
      businessName: "Demo Store",
    });
  }
  return user.id;
}

async function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const userId = await getCurrentUserIdFromToken(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  (req as any).userId = userId;
  next();
}

// Health check endpoint (no database required)
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Debug endpoint to check environment (remove in production)
app.get("/api/debug/env", async (req, res) => {
  let storageOk = false;
  let storageErrorMsg = null;
  try {
    await getStorage();
    storageOk = true;
  } catch (err: any) {
    storageErrorMsg = err?.message || String(err);
  }
  
  res.json({
    hasAdminEmail: !!process.env.ADMIN_EMAIL,
    hasAdminPassword: !!process.env.ADMIN_PASSWORD,
    hasSupabaseUrl: !!process.env.SUPABASE_URL || !!process.env.VITE_SUPABASE_URL,
    hasSupabaseAnonKey: !!process.env.SUPABASE_ANON_KEY || !!process.env.VITE_SUPABASE_ANON_KEY,
    hasDatabaseUrl: !!process.env.SUPABASE_DATABASE_URL,
    supabaseConfigured: !!supabase,
    storageOk,
    storageError: storageErrorMsg,
    nodeEnv: process.env.NODE_ENV,
  });
});

app.get("/api/auth/session", async (req, res) => {
  const userId = await getCurrentUserIdFromToken(req);
  if (userId) {
    const user = await (await getStorage()).getUser(userId);
    res.json({
      isAuthenticated: true,
      user: user ? {
        id: user.id,
        email: user.email,
        businessName: user.businessName,
        planStatus: user.planStatus,
        planId: user.planId,
      } : null,
    });
  } else {
    res.json({ isAuthenticated: false });
  }
});

app.get("/api/public/plans", async (req, res) => {
  try {
    const plans = await (await getStorage()).getSubscriptionPlans();
    const activePlans = plans.filter(p => p.isActive).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    res.json(activePlans);
  } catch (error) {
    console.error("Error fetching plans:", error);
    res.status(500).json({ error: "Failed to fetch plans" });
  }
});

app.get("/api/products", async (req, res) => {
  try {
    const userId = await getCurrentUserId(req);
    const products = await (await getStorage()).getProducts(userId);
    res.json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

app.get("/api/products/:id", async (req, res) => {
  try {
    const product = await (await getStorage()).getProduct(req.params.id);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    res.json(product);
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).json({ error: "Failed to fetch product" });
  }
});

app.post("/api/products", async (req, res) => {
  try {
    const userId = await getCurrentUserId(req);
    const product = await (await getStorage()).createProduct({ ...req.body, userId });
    res.status(201).json(product);
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(500).json({ error: "Failed to create product" });
  }
});

app.patch("/api/products/:id", async (req, res) => {
  try {
    const product = await (await getStorage()).updateProduct(req.params.id, req.body);
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json(product);
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({ error: "Failed to update product" });
  }
});

app.delete("/api/products/:id", async (req, res) => {
  try {
    const deleted = await (await getStorage()).deleteProduct(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Product not found" });
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ error: "Failed to delete product" });
  }
});

app.get("/api/checkout-pages", async (req, res) => {
  try {
    const userId = await getCurrentUserId(req);
    const pages = await (await getStorage()).getCheckoutPages(userId);
    res.json(pages);
  } catch (error) {
    console.error("Error fetching checkout pages:", error);
    res.status(500).json({ error: "Failed to fetch checkout pages" });
  }
});

app.get("/api/checkout-pages/:id", async (req, res) => {
  try {
    const page = await (await getStorage()).getCheckoutPage(req.params.id);
    if (!page) return res.status(404).json({ error: "Checkout page not found" });
    res.json(page);
  } catch (error) {
    console.error("Error fetching checkout page:", error);
    res.status(500).json({ error: "Failed to fetch checkout page" });
  }
});

app.get("/api/checkout-pages/slug/:slug", async (req, res) => {
  try {
    const page = await (await getStorage()).getCheckoutPageBySlug(req.params.slug);
    if (!page) return res.status(404).json({ error: "Checkout page not found" });
    res.json(page);
  } catch (error) {
    console.error("Error fetching checkout page:", error);
    res.status(500).json({ error: "Failed to fetch checkout page" });
  }
});

app.post("/api/checkout-pages", async (req, res) => {
  try {
    const userId = await getCurrentUserId(req);
    const page = await (await getStorage()).createCheckoutPage({ ...req.body, userId });
    res.status(201).json(page);
  } catch (error) {
    console.error("Error creating checkout page:", error);
    res.status(500).json({ error: "Failed to create checkout page" });
  }
});

app.patch("/api/checkout-pages/:id", async (req, res) => {
  try {
    const page = await (await getStorage()).updateCheckoutPage(req.params.id, req.body);
    if (!page) return res.status(404).json({ error: "Checkout page not found" });
    res.json(page);
  } catch (error) {
    console.error("Error updating checkout page:", error);
    res.status(500).json({ error: "Failed to update checkout page" });
  }
});

app.delete("/api/checkout-pages/:id", async (req, res) => {
  try {
    const deleted = await (await getStorage()).deleteCheckoutPage(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Checkout page not found" });
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting checkout page:", error);
    res.status(500).json({ error: "Failed to delete checkout page" });
  }
});

app.get("/api/coupons", async (req, res) => {
  try {
    const userId = await getCurrentUserId(req);
    const coupons = await (await getStorage()).getCoupons(userId);
    res.json(coupons);
  } catch (error) {
    console.error("Error fetching coupons:", error);
    res.status(500).json({ error: "Failed to fetch coupons" });
  }
});

app.post("/api/coupons", async (req, res) => {
  try {
    const userId = await getCurrentUserId(req);
    const coupon = await (await getStorage()).createCoupon({ ...req.body, userId });
    res.status(201).json(coupon);
  } catch (error) {
    console.error("Error creating coupon:", error);
    res.status(500).json({ error: "Failed to create coupon" });
  }
});

app.patch("/api/coupons/:id", async (req, res) => {
  try {
    const coupon = await (await getStorage()).updateCoupon(req.params.id, req.body);
    if (!coupon) return res.status(404).json({ error: "Coupon not found" });
    res.json(coupon);
  } catch (error) {
    console.error("Error updating coupon:", error);
    res.status(500).json({ error: "Failed to update coupon" });
  }
});

app.delete("/api/coupons/:id", async (req, res) => {
  try {
    const deleted = await (await getStorage()).deleteCoupon(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Coupon not found" });
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting coupon:", error);
    res.status(500).json({ error: "Failed to delete coupon" });
  }
});

app.post("/api/coupons/validate", async (req, res) => {
  try {
    const userId = await getCurrentUserId(req);
    const { code } = req.body;
    const coupon = await (await getStorage()).getCouponByCode(code, userId);
    
    if (!coupon) return res.status(404).json({ error: "Coupon not found" });
    if (!coupon.isActive) return res.status(400).json({ error: "Coupon is inactive" });
    if (coupon.usageLimit && coupon.usedCount && coupon.usedCount >= coupon.usageLimit) {
      return res.status(400).json({ error: "Coupon usage limit reached" });
    }
    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      return res.status(400).json({ error: "Coupon has expired" });
    }
    
    res.json(coupon);
  } catch (error) {
    console.error("Error validating coupon:", error);
    res.status(500).json({ error: "Failed to validate coupon" });
  }
});

app.get("/api/customers", async (req, res) => {
  try {
    const userId = await getCurrentUserId(req);
    const customers = await (await getStorage()).getCustomers(userId);
    res.json(customers);
  } catch (error) {
    console.error("Error fetching customers:", error);
    res.status(500).json({ error: "Failed to fetch customers" });
  }
});

app.get("/api/customers/:id", async (req, res) => {
  try {
    const customer = await (await getStorage()).getCustomer(req.params.id);
    if (!customer) return res.status(404).json({ error: "Customer not found" });
    res.json(customer);
  } catch (error) {
    console.error("Error fetching customer:", error);
    res.status(500).json({ error: "Failed to fetch customer" });
  }
});

app.get("/api/orders", async (req, res) => {
  try {
    const userId = await getCurrentUserId(req);
    const orders = await (await getStorage()).getOrders(userId);
    res.json(orders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

app.get("/api/orders/:id", async (req, res) => {
  try {
    const order = await (await getStorage()).getOrder(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json(order);
  } catch (error) {
    console.error("Error fetching order:", error);
    res.status(500).json({ error: "Failed to fetch order" });
  }
});

app.get("/api/email-templates", async (req, res) => {
  try {
    const userId = await getCurrentUserId(req);
    const templates = await (await getStorage()).getEmailTemplates(userId);
    res.json(templates);
  } catch (error) {
    console.error("Error fetching email templates:", error);
    res.status(500).json({ error: "Failed to fetch email templates" });
  }
});

app.post("/api/email-templates", async (req, res) => {
  try {
    const userId = await getCurrentUserId(req);
    const template = await (await getStorage()).createEmailTemplate({ ...req.body, userId });
    res.status(201).json(template);
  } catch (error) {
    console.error("Error creating email template:", error);
    res.status(500).json({ error: "Failed to create email template" });
  }
});

app.patch("/api/email-templates/:id", async (req, res) => {
  try {
    const template = await (await getStorage()).updateEmailTemplate(req.params.id, req.body);
    if (!template) return res.status(404).json({ error: "Email template not found" });
    res.json(template);
  } catch (error) {
    console.error("Error updating email template:", error);
    res.status(500).json({ error: "Failed to update email template" });
  }
});

app.delete("/api/email-templates/:id", async (req, res) => {
  try {
    const deleted = await (await getStorage()).deleteEmailTemplate(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Email template not found" });
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting email template:", error);
    res.status(500).json({ error: "Failed to delete email template" });
  }
});

app.get("/api/analytics", async (req, res) => {
  try {
    const userId = await getCurrentUserId(req);
    const orders = await (await getStorage()).getOrders(userId);
    const customers = await (await getStorage()).getCustomers(userId);
    const products = await (await getStorage()).getProducts(userId);
    
    const totalRevenue = orders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
    const totalOrders = orders.length;
    const totalCustomers = customers.length;
    const completedOrders = orders.filter(o => o.status === 'completed').length;
    const conversionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;
    
    const revenueByDay: { date: string; revenue: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayRevenue = orders
        .filter(o => o.createdAt && new Date(o.createdAt).toISOString().split('T')[0] === dateStr)
        .reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
      revenueByDay.push({ date: dateStr.slice(5), revenue: dayRevenue });
    }
    
    const productSales: Record<string, { name: string; sales: number; revenue: number }> = {};
    for (const order of orders) {
      const items = order.items || [];
      for (const item of items) {
        const product = products.find(p => p.id === item.productId);
        if (product) {
          if (!productSales[product.id]) {
            productSales[product.id] = { name: product.name, sales: 0, revenue: 0 };
          }
          const qty = item.quantity || 0;
          productSales[product.id].sales += qty;
          productSales[product.id].revenue += Number(item.price) * qty;
        }
      }
    }
    const topProducts = Object.values(productSales).sort((a, b) => b.sales - a.sales).slice(0, 5);
    
    const recentOrders = orders
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, 5)
      .map(o => ({
        id: o.id,
        customer: o.customer?.email || 'Unknown',
        amount: Number(o.totalAmount || 0),
        status: o.status || 'pending',
        date: o.createdAt?.toISOString() || '',
      }));
    
    res.json({
      totalRevenue,
      totalOrders,
      totalCustomers,
      conversionRate: Math.round(conversionRate * 10) / 10,
      revenueChange: 0,
      ordersChange: 0,
      customersChange: 0,
      conversionChange: 0,
      revenueByDay,
      topProducts,
      recentOrders,
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

app.post("/api/settings/general", async (req, res) => {
  try {
    const userId = await getCurrentUserId(req);
    await (await getStorage()).updateUser(userId, { businessName: req.body.storeName });
    res.json({ success: true });
  } catch (error) {
    console.error("Error saving settings:", error);
    res.status(500).json({ error: "Failed to save settings" });
  }
});

app.post("/api/settings/payment", async (req, res) => {
  try {
    const userId = await getCurrentUserId(req);
    await (await getStorage()).updateUser(userId, {
      uddoktapayApiKey: req.body.uddoktapayApiKey,
      uddoktapayApiUrl: req.body.uddoktapayApiUrl,
    });
    res.json({ success: true });
  } catch (error) {
    console.error("Error saving payment settings:", error);
    res.status(500).json({ error: "Failed to save settings" });
  }
});

app.post("/api/settings/tracking", async (req, res) => {
  try {
    const userId = await getCurrentUserId(req);
    await (await getStorage()).updateUser(userId, {
      facebookPixelId: req.body.fbPixelId,
      facebookAccessToken: req.body.fbAccessToken,
    });
    res.json({ success: true });
  } catch (error) {
    console.error("Error saving tracking settings:", error);
    res.status(500).json({ error: "Failed to save settings" });
  }
});

app.post("/api/settings/email", async (req, res) => {
  try {
    const userId = await getCurrentUserId(req);
    await (await getStorage()).updateUser(userId, { fromEmail: req.body.fromEmail });
    res.json({ success: true });
  } catch (error) {
    console.error("Error saving email settings:", error);
    res.status(500).json({ error: "Failed to save settings" });
  }
});

app.post("/api/settings/domain", async (req, res) => {
  try {
    const userId = await getCurrentUserId(req);
    await (await getStorage()).updateUser(userId, { customDomain: req.body.customDomain });
    res.json({ success: true });
  } catch (error) {
    console.error("Error saving domain settings:", error);
    res.status(500).json({ error: "Failed to save settings" });
  }
});

app.get("/api/funnels", async (req, res) => {
  try {
    const userId = await getCurrentUserId(req);
    const funnels = await (await getStorage()).getFunnels(userId);
    res.json(funnels);
  } catch (error) {
    console.error("Error fetching funnels:", error);
    res.status(500).json({ error: "Failed to fetch funnels" });
  }
});

app.get("/api/funnels/:id", async (req, res) => {
  try {
    const funnel = await (await getStorage()).getFunnel(req.params.id);
    if (!funnel) return res.status(404).json({ error: "Funnel not found" });
    res.json(funnel);
  } catch (error) {
    console.error("Error fetching funnel:", error);
    res.status(500).json({ error: "Failed to fetch funnel" });
  }
});

app.post("/api/funnels", async (req, res) => {
  try {
    const userId = await getCurrentUserId(req);
    const funnel = await (await getStorage()).createFunnel({ ...req.body, userId });
    res.status(201).json(funnel);
  } catch (error) {
    console.error("Error creating funnel:", error);
    res.status(500).json({ error: "Failed to create funnel" });
  }
});

app.patch("/api/funnels/:id", async (req, res) => {
  try {
    const funnel = await (await getStorage()).updateFunnel(req.params.id, req.body);
    if (!funnel) return res.status(404).json({ error: "Funnel not found" });
    res.json(funnel);
  } catch (error) {
    console.error("Error updating funnel:", error);
    res.status(500).json({ error: "Failed to update funnel" });
  }
});

app.delete("/api/funnels/:id", async (req, res) => {
  try {
    const deleted = await (await getStorage()).deleteFunnel(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Funnel not found" });
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting funnel:", error);
    res.status(500).json({ error: "Failed to delete funnel" });
  }
});

app.get("/api/subscription", async (req, res) => {
  try {
    const userId = await getCurrentUserId(req);
    const user = await (await getStorage()).getUser(userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    
    let currentPlan = null;
    if (user.planId) {
      currentPlan = await (await getStorage()).getSubscriptionPlan(user.planId);
    }
    
    const plans = await (await getStorage()).getSubscriptionPlans();
    const activePlans = plans.filter(p => p.isActive).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    
    res.json({
      currentPlan,
      planStatus: user.planStatus || 'free',
      planExpiresAt: user.planExpiresAt,
      trialEndsAt: user.trialEndsAt,
      availablePlans: activePlans,
    });
  } catch (error) {
    console.error("Error fetching subscription:", error);
    res.status(500).json({ error: "Failed to fetch subscription" });
  }
});

// Auth logout
app.post("/api/auth/logout", async (req, res) => {
  res.json({ success: true });
});

// Supabase OAuth callback
app.post("/api/auth/supabase-callback", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.substring(7);
    if (!supabase) {
      return res.status(500).json({ error: "Supabase not configured" });
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user?.email) {
      return res.status(401).json({ error: "Invalid token" });
    }

    let dbUser = await (await getStorage()).getUserByEmail(user.email);
    if (!dbUser) {
      dbUser = await (await getStorage()).createUser({
        email: user.email,
        supabaseId: user.id,
        firstName: user.user_metadata?.full_name?.split(" ")[0],
        lastName: user.user_metadata?.full_name?.split(" ").slice(1).join(" "),
        avatarUrl: user.user_metadata?.avatar_url,
        role: "seller",
      });
    } else if (!dbUser.supabaseId) {
      await (await getStorage()).updateUser(dbUser.id, { 
        supabaseId: user.id,
        avatarUrl: user.user_metadata?.avatar_url || dbUser.avatarUrl,
      });
    }

    res.json({ 
      success: true, 
      user: {
        id: dbUser.id,
        email: dbUser.email,
        role: dbUser.role,
        firstName: dbUser.firstName,
        lastName: dbUser.lastName,
        businessName: dbUser.businessName,
        avatarUrl: dbUser.avatarUrl,
      }
    });
  } catch (error) {
    console.error("Supabase callback error:", error);
    res.status(500).json({ error: "Authentication failed" });
  }
});

// Admin login
app.post("/api/admin/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: "Email and password required" });
    }

    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (adminEmail && adminPassword && email === adminEmail && password === adminPassword) {
      return res.json({ 
        success: true, 
        user: {
          id: "env-admin",
          email: adminEmail,
          role: "super_admin",
          firstName: "Super",
          lastName: "Admin",
        }
      });
    }

    const user = await (await getStorage()).getUserByEmail(email);
    if (!user || (user.role !== "super_admin" && user.role !== "admin")) {
      return res.status(401).json({ success: false, error: "Invalid credentials" });
    }

    if (user.password !== password) {
      return res.status(401).json({ success: false, error: "Invalid credentials" });
    }

    res.json({ 
      success: true, 
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
      }
    });
  } catch (error) {
    console.error("Admin login error:", error);
    res.status(500).json({ success: false, error: "Login failed" });
  }
});

// Admin logout
app.post("/api/admin/logout", async (req, res) => {
  res.json({ success: true });
});

// Funnel pages
app.get("/api/funnels/:funnelId/pages", async (req, res) => {
  try {
    const pages = await (await getStorage()).getFunnelPages(req.params.funnelId);
    res.json(pages);
  } catch (error) {
    console.error("Error fetching funnel pages:", error);
    res.status(500).json({ error: "Failed to fetch funnel pages" });
  }
});

app.post("/api/funnels/:funnelId/pages", async (req, res) => {
  try {
    const page = await (await getStorage()).createFunnelPage({ ...req.body, funnelId: req.params.funnelId });
    res.status(201).json(page);
  } catch (error) {
    console.error("Error creating funnel page:", error);
    res.status(500).json({ error: "Failed to create funnel page" });
  }
});

app.patch("/api/funnel-pages/:id", async (req, res) => {
  try {
    const page = await (await getStorage()).updateFunnelPage(req.params.id, req.body);
    if (!page) return res.status(404).json({ error: "Page not found" });
    res.json(page);
  } catch (error) {
    console.error("Error updating funnel page:", error);
    res.status(500).json({ error: "Failed to update funnel page" });
  }
});

app.delete("/api/funnel-pages/:id", async (req, res) => {
  try {
    const deleted = await (await getStorage()).deleteFunnelPage(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Page not found" });
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting funnel page:", error);
    res.status(500).json({ error: "Failed to delete funnel page" });
  }
});

// Order bumps
app.get("/api/order-bumps", async (req, res) => {
  try {
    const userId = await getCurrentUserId(req);
    const bumps = await (await getStorage()).getOrderBumps(userId);
    res.json(bumps);
  } catch (error) {
    console.error("Error fetching order bumps:", error);
    res.status(500).json({ error: "Failed to fetch order bumps" });
  }
});

app.post("/api/order-bumps", async (req, res) => {
  try {
    const userId = await getCurrentUserId(req);
    const bump = await (await getStorage()).createOrderBump({ ...req.body, userId });
    res.status(201).json(bump);
  } catch (error) {
    console.error("Error creating order bump:", error);
    res.status(500).json({ error: "Failed to create order bump" });
  }
});

// Upsells
app.get("/api/upsells", async (req, res) => {
  try {
    const userId = await getCurrentUserId(req);
    const upsells = await (await getStorage()).getUpsells(userId);
    res.json(upsells);
  } catch (error) {
    console.error("Error fetching upsells:", error);
    res.status(500).json({ error: "Failed to fetch upsells" });
  }
});

app.post("/api/upsells", async (req, res) => {
  try {
    const userId = await getCurrentUserId(req);
    const upsell = await (await getStorage()).createUpsell({ ...req.body, userId });
    res.status(201).json(upsell);
  } catch (error) {
    console.error("Error creating upsell:", error);
    res.status(500).json({ error: "Failed to create upsell" });
  }
});

// User profile
app.get("/api/user/profile", async (req, res) => {
  try {
    const userId = await getCurrentUserId(req);
    const user = await (await getStorage()).getUser(userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    
    const { password, ...safeUser } = user;
    res.json(safeUser);
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

app.patch("/api/user/profile", async (req, res) => {
  try {
    const userId = await getCurrentUserId(req);
    const user = await (await getStorage()).updateUser(userId, req.body);
    if (!user) return res.status(404).json({ error: "User not found" });
    
    const { password, ...safeUser } = user;
    res.json(safeUser);
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

// Admin - Subscription Plans Management
app.get("/api/admin/plans", async (req, res) => {
  try {
    const plans = await (await getStorage()).getSubscriptionPlans();
    res.json(plans);
  } catch (error) {
    console.error("Error fetching plans:", error);
    res.status(500).json({ error: "Failed to fetch plans" });
  }
});

app.post("/api/admin/plans", async (req, res) => {
  try {
    const plan = await (await getStorage()).createSubscriptionPlan(req.body);
    res.status(201).json(plan);
  } catch (error) {
    console.error("Error creating plan:", error);
    res.status(500).json({ error: "Failed to create plan" });
  }
});

app.patch("/api/admin/plans/:id", async (req, res) => {
  try {
    const plan = await (await getStorage()).updateSubscriptionPlan(req.params.id, req.body);
    if (!plan) return res.status(404).json({ error: "Plan not found" });
    res.json(plan);
  } catch (error) {
    console.error("Error updating plan:", error);
    res.status(500).json({ error: "Failed to update plan" });
  }
});

app.delete("/api/admin/plans/:id", async (req, res) => {
  try {
    const deleted = await (await getStorage()).deleteSubscriptionPlan(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Plan not found" });
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting plan:", error);
    res.status(500).json({ error: "Failed to delete plan" });
  }
});

// Admin - Sellers Management
app.get("/api/admin/sellers", async (req, res) => {
  try {
    const sellers = await (await getStorage()).getAllUsers();
    const filteredSellers = sellers.filter(u => u.role === "seller" || !u.role);
    res.json(filteredSellers.map(({ password, ...s }) => s));
  } catch (error) {
    console.error("Error fetching sellers:", error);
    res.status(500).json({ error: "Failed to fetch sellers" });
  }
});

app.patch("/api/admin/sellers/:id", async (req, res) => {
  try {
    const user = await (await getStorage()).updateUser(req.params.id, req.body);
    if (!user) return res.status(404).json({ error: "Seller not found" });
    const { password, ...safeUser } = user;
    res.json(safeUser);
  } catch (error) {
    console.error("Error updating seller:", error);
    res.status(500).json({ error: "Failed to update seller" });
  }
});

// Media assets
app.get("/api/media", async (req, res) => {
  try {
    const userId = await getCurrentUserId(req);
    const assets = await (await getStorage()).getMediaAssets(userId);
    res.json(assets);
  } catch (error) {
    console.error("Error fetching media:", error);
    res.status(500).json({ error: "Failed to fetch media" });
  }
});

app.post("/api/media", async (req, res) => {
  try {
    const userId = await getCurrentUserId(req);
    const asset = await (await getStorage()).createMediaAsset({ ...req.body, userId });
    res.status(201).json(asset);
  } catch (error) {
    console.error("Error creating media:", error);
    res.status(500).json({ error: "Failed to create media" });
  }
});

app.delete("/api/media/:id", async (req, res) => {
  try {
    const deleted = await (await getStorage()).deleteMediaAsset(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Media not found" });
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting media:", error);
    res.status(500).json({ error: "Failed to delete media" });
  }
});

// Product files
app.get("/api/products/:productId/files", async (req, res) => {
  try {
    const files = await (await getStorage()).getProductFiles(req.params.productId);
    res.json(files);
  } catch (error) {
    console.error("Error fetching product files:", error);
    res.status(500).json({ error: "Failed to fetch files" });
  }
});

app.post("/api/products/:productId/files", async (req, res) => {
  try {
    const file = await (await getStorage()).createProductFile({ ...req.body, productId: req.params.productId });
    res.status(201).json(file);
  } catch (error) {
    console.error("Error creating product file:", error);
    res.status(500).json({ error: "Failed to create file" });
  }
});

app.delete("/api/product-files/:id", async (req, res) => {
  try {
    const deleted = await (await getStorage()).deleteProductFile(req.params.id);
    if (!deleted) return res.status(404).json({ error: "File not found" });
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting file:", error);
    res.status(500).json({ error: "Failed to delete file" });
  }
});

// Order creation for checkout
app.post("/api/orders", async (req, res) => {
  try {
    const userId = await getCurrentUserId(req);
    const crypto = await import("crypto");
    const confirmationToken = crypto.randomBytes(32).toString("hex");
    const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;
    
    const order = await (await getStorage()).createOrder({
      ...req.body,
      userId,
      orderNumber,
      confirmationToken,
      status: "pending",
    });
    res.status(201).json(order);
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({ error: "Failed to create order" });
  }
});

// Order confirmation page (public)
app.get("/api/order-confirmation/:token", async (req, res) => {
  try {
    const order = await (await getStorage()).getOrderByConfirmationToken(req.params.token);
    if (!order) return res.status(404).json({ error: "Order not found" });

    const customer = order.customerId ? await (await getStorage()).getCustomer(order.customerId) : null;
    const items = await (await getStorage()).getOrderItems(order.id);
    const seller = await (await getStorage()).getUser(order.userId);

    res.json({
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        totalAmount: order.totalAmount,
        status: order.status,
        createdAt: order.createdAt,
      },
      customer: customer ? {
        email: customer.email,
        firstName: customer.firstName,
        lastName: customer.lastName,
      } : null,
      items,
      seller: {
        businessName: seller?.businessName || "DigitalCart Store",
        logoUrl: seller?.logoUrl,
      },
    });
  } catch (error) {
    console.error("Error fetching order confirmation:", error);
    res.status(500).json({ error: "Failed to fetch order details" });
  }
});

export default function handler(req: VercelRequest, res: VercelResponse) {
  // Vercel rewrites preserve the original URL in req.url
  // Just pass through to Express
  console.log("[Vercel API] Request URL:", req.url, "Method:", req.method);
  return app(req as any, res as any);
}
