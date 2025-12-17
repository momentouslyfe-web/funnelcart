import type { VercelRequest, VercelResponse } from "@vercel/node";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";

interface SupabaseResponse<T = any> {
  data: T | null;
  error: string | null;
}

async function supabaseQuery<T = any>(
  table: string,
  options: {
    method?: "GET" | "POST" | "PATCH" | "DELETE";
    select?: string;
    filters?: Record<string, any>;
    body?: any;
    single?: boolean;
    order?: string;
  } = {}
): Promise<SupabaseResponse<T>> {
  const { method = "GET", select = "*", filters = {}, body, single = false, order } = options;
  
  let url = `${SUPABASE_URL}/rest/v1/${table}?select=${encodeURIComponent(select)}`;
  
  for (const [key, value] of Object.entries(filters)) {
    url += `&${key}=eq.${encodeURIComponent(value)}`;
  }
  
  if (order) {
    url += `&order=${encodeURIComponent(order)}`;
  }
  
  const headers: Record<string, string> = {
    "apikey": SUPABASE_SERVICE_KEY,
    "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
    "Content-Type": "application/json",
  };
  
  if (single) {
    headers["Accept"] = "application/vnd.pgrst.object+json";
  }
  
  if (method === "POST") {
    headers["Prefer"] = "return=representation";
  } else if (method === "PATCH" || method === "DELETE") {
    headers["Prefer"] = "return=representation";
  }
  
  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    
    if (method === "DELETE" && (response.status === 204 || response.status === 200)) {
      return { data: null, error: null };
    }
    
    if (response.status === 406 || (single && response.status === 200)) {
      const text = await response.text();
      if (!text || text === '[]' || text === 'null') {
        return { data: null, error: null };
      }
      try {
        const data = JSON.parse(text);
        return { data, error: null };
      } catch {
        return { data: null, error: null };
      }
    }
    
    if (!response.ok) {
      const errorText = await response.text();
      return { data: null, error: errorText };
    }
    
    const data = await response.json();
    return { data, error: null };
  } catch (err: any) {
    return { data: null, error: err.message };
  }
}

async function verifyToken(token: string): Promise<any> {
  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${token}`,
      },
    });
    
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

async function getCurrentUser(req: VercelRequest) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return null;
  
  const token = authHeader.substring(7);
  const authUser = await verifyToken(token);
  if (!authUser?.email) return null;
  
  const { data } = await supabaseQuery("users", {
    filters: { email: authUser.email },
    single: true,
  });
  
  if (!data && authUser.email) {
    const { data: newUser } = await supabaseQuery("users", {
      method: "POST",
      body: {
        email: authUser.email,
        supabase_id: authUser.id,
        business_name: authUser.user_metadata?.full_name || "My Store",
      },
      single: true,
    });
    return newUser;
  }
  return data;
}

async function getOrCreateDemoUser() {
  const { data } = await supabaseQuery("users", {
    filters: { email: "demo@example.com" },
    single: true,
  });
  
  if (data) return data;
  
  const { data: newUser } = await supabaseQuery("users", {
    method: "POST",
    body: {
      email: "demo@example.com",
      business_name: "Demo Store",
    },
    single: true,
  });
  return newUser;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);
  const path = url.pathname.replace("/api", "") || "/";
  const method = req.method || "GET";
  
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  
  if (method === "OPTIONS") {
    return res.status(200).end();
  }
  
  try {
    // Health check
    if (path === "/health" || path === "/") {
      return res.json({ 
        status: "ok", 
        timestamp: new Date().toISOString(),
        supabaseConfigured: !!SUPABASE_URL && !!SUPABASE_SERVICE_KEY,
      });
    }
    
    // Debug endpoint
    if (path === "/debug/env") {
      return res.json({
        hasSupabaseUrl: !!SUPABASE_URL,
        hasServiceKey: !!SUPABASE_SERVICE_KEY,
        hasAnonKey: !!SUPABASE_ANON_KEY,
        hasDatabaseUrl: !!process.env.SUPABASE_DATABASE_URL,
        nodeEnv: process.env.NODE_ENV,
      });
    }
    
    // Auth session
    if (path === "/auth/session") {
      const user = await getCurrentUser(req);
      return res.json({
        isAuthenticated: !!user,
        user: user ? {
          id: user.id,
          email: user.email,
          businessName: user.business_name,
          planStatus: user.plan_status,
        } : null,
      });
    }
    
    // Public plans
    if (path === "/public/plans" && method === "GET") {
      const { data, error } = await supabaseQuery("subscription_plans", {
        filters: { is_active: true },
        order: "sort_order",
      });
      if (error) return res.status(500).json({ error });
      return res.json(data || []);
    }
    
    // Get current user for authenticated routes
    let user = await getCurrentUser(req);
    if (!user) {
      user = await getOrCreateDemoUser();
    }
    const userId = user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    // Products
    if (path === "/products" && method === "GET") {
      const { data, error } = await supabaseQuery("products", { filters: { user_id: userId } });
      if (error) return res.status(500).json({ error });
      return res.json(data || []);
    }
    
    if (path.match(/^\/products\/[^/]+$/) && method === "GET") {
      const id = path.split("/")[2];
      const { data, error } = await supabaseQuery("products", { filters: { id, user_id: userId }, single: true });
      if (error) return res.status(500).json({ error });
      if (!data) return res.status(404).json({ error: "Product not found" });
      return res.json(data);
    }
    
    if (path === "/products" && method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      const { data, error } = await supabaseQuery("products", {
        method: "POST",
        body: { ...body, user_id: userId },
        single: true,
      });
      if (error) return res.status(500).json({ error });
      return res.json(data);
    }
    
    if (path.match(/^\/products\/[^/]+$/) && method === "PATCH") {
      const id = path.split("/")[2];
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      let updateUrl = `${SUPABASE_URL}/rest/v1/products?id=eq.${id}&user_id=eq.${userId}`;
      const response = await fetch(updateUrl, {
        method: "PATCH",
        headers: {
          "apikey": SUPABASE_SERVICE_KEY,
          "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
          "Content-Type": "application/json",
          "Prefer": "return=representation",
        },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      return res.json(Array.isArray(data) ? data[0] : data);
    }
    
    if (path.match(/^\/products\/[^/]+$/) && method === "DELETE") {
      const id = path.split("/")[2];
      let deleteUrl = `${SUPABASE_URL}/rest/v1/products?id=eq.${id}&user_id=eq.${userId}`;
      await fetch(deleteUrl, {
        method: "DELETE",
        headers: {
          "apikey": SUPABASE_SERVICE_KEY,
          "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
      });
      return res.json({ success: true });
    }
    
    // Checkout Pages
    if (path === "/checkout-pages" && method === "GET") {
      const { data, error } = await supabaseQuery("checkout_pages", { filters: { user_id: userId } });
      if (error) return res.status(500).json({ error });
      return res.json(data || []);
    }
    
    if (path.match(/^\/checkout-pages\/[^/]+$/) && method === "GET") {
      const id = path.split("/")[2];
      const { data, error } = await supabaseQuery("checkout_pages", { filters: { id, user_id: userId }, single: true });
      if (error) return res.status(500).json({ error });
      if (!data) return res.status(404).json({ error: "Checkout page not found" });
      return res.json(data);
    }
    
    if (path.match(/^\/checkout\/[^/]+$/) && method === "GET") {
      const slug = path.split("/")[2];
      const { data, error } = await supabaseQuery("checkout_pages", { filters: { slug }, single: true });
      if (error) return res.status(500).json({ error });
      return res.json(data);
    }
    
    if (path === "/checkout-pages" && method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      const { data, error } = await supabaseQuery("checkout_pages", {
        method: "POST",
        body: { ...body, user_id: userId },
        single: true,
      });
      if (error) return res.status(500).json({ error });
      return res.json(data);
    }
    
    if (path.match(/^\/checkout-pages\/[^/]+$/) && method === "PATCH") {
      const id = path.split("/")[2];
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      let updateUrl = `${SUPABASE_URL}/rest/v1/checkout_pages?id=eq.${id}&user_id=eq.${userId}`;
      const response = await fetch(updateUrl, {
        method: "PATCH",
        headers: {
          "apikey": SUPABASE_SERVICE_KEY,
          "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
          "Content-Type": "application/json",
          "Prefer": "return=representation",
        },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      return res.json(Array.isArray(data) ? data[0] : data);
    }
    
    if (path.match(/^\/checkout-pages\/[^/]+$/) && method === "DELETE") {
      const id = path.split("/")[2];
      let deleteUrl = `${SUPABASE_URL}/rest/v1/checkout_pages?id=eq.${id}&user_id=eq.${userId}`;
      await fetch(deleteUrl, {
        method: "DELETE",
        headers: {
          "apikey": SUPABASE_SERVICE_KEY,
          "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
      });
      return res.json({ success: true });
    }
    
    // Coupons
    if (path === "/coupons" && method === "GET") {
      const { data, error } = await supabaseQuery("coupons", { filters: { user_id: userId } });
      if (error) return res.status(500).json({ error });
      return res.json(data || []);
    }
    
    if (path === "/coupons" && method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      const { data, error } = await supabaseQuery("coupons", {
        method: "POST",
        body: { ...body, user_id: userId },
        single: true,
      });
      if (error) return res.status(500).json({ error });
      return res.json(data);
    }
    
    if (path.match(/^\/coupons\/[^/]+$/) && method === "PATCH") {
      const id = path.split("/")[2];
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      let updateUrl = `${SUPABASE_URL}/rest/v1/coupons?id=eq.${id}&user_id=eq.${userId}`;
      const response = await fetch(updateUrl, {
        method: "PATCH",
        headers: {
          "apikey": SUPABASE_SERVICE_KEY,
          "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
          "Content-Type": "application/json",
          "Prefer": "return=representation",
        },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      return res.json(Array.isArray(data) ? data[0] : data);
    }
    
    if (path.match(/^\/coupons\/[^/]+$/) && method === "DELETE") {
      const id = path.split("/")[2];
      let deleteUrl = `${SUPABASE_URL}/rest/v1/coupons?id=eq.${id}&user_id=eq.${userId}`;
      await fetch(deleteUrl, {
        method: "DELETE",
        headers: {
          "apikey": SUPABASE_SERVICE_KEY,
          "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
      });
      return res.json({ success: true });
    }
    
    // Customers
    if (path === "/customers" && method === "GET") {
      const { data, error } = await supabaseQuery("customers", { filters: { user_id: userId } });
      if (error) return res.status(500).json({ error });
      return res.json(data || []);
    }
    
    if (path.match(/^\/customers\/[^/]+$/) && method === "GET") {
      const id = path.split("/")[2];
      const { data, error } = await supabaseQuery("customers", { filters: { id, user_id: userId }, single: true });
      if (error) return res.status(500).json({ error });
      if (!data) return res.status(404).json({ error: "Customer not found" });
      return res.json(data);
    }
    
    // Orders
    if (path === "/orders" && method === "GET") {
      const { data, error } = await supabaseQuery("orders", { filters: { user_id: userId } });
      if (error) return res.status(500).json({ error });
      return res.json(data || []);
    }
    
    if (path.match(/^\/orders\/[^/]+$/) && method === "GET") {
      const id = path.split("/")[2];
      const { data, error } = await supabaseQuery("orders", { filters: { id, user_id: userId }, single: true });
      if (error) return res.status(500).json({ error });
      if (!data) return res.status(404).json({ error: "Order not found" });
      return res.json(data);
    }
    
    // Email Templates
    if (path === "/email-templates" && method === "GET") {
      const { data, error } = await supabaseQuery("email_templates", { filters: { user_id: userId } });
      if (error) return res.status(500).json({ error });
      return res.json(data || []);
    }
    
    if (path === "/email-templates" && method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      const { data, error } = await supabaseQuery("email_templates", {
        method: "POST",
        body: { ...body, user_id: userId },
        single: true,
      });
      if (error) return res.status(500).json({ error });
      return res.json(data);
    }
    
    if (path.match(/^\/email-templates\/[^/]+$/) && method === "PATCH") {
      const id = path.split("/")[2];
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      let updateUrl = `${SUPABASE_URL}/rest/v1/email_templates?id=eq.${id}&user_id=eq.${userId}`;
      const response = await fetch(updateUrl, {
        method: "PATCH",
        headers: {
          "apikey": SUPABASE_SERVICE_KEY,
          "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
          "Content-Type": "application/json",
          "Prefer": "return=representation",
        },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      return res.json(Array.isArray(data) ? data[0] : data);
    }
    
    if (path.match(/^\/email-templates\/[^/]+$/) && method === "DELETE") {
      const id = path.split("/")[2];
      let deleteUrl = `${SUPABASE_URL}/rest/v1/email_templates?id=eq.${id}&user_id=eq.${userId}`;
      await fetch(deleteUrl, {
        method: "DELETE",
        headers: {
          "apikey": SUPABASE_SERVICE_KEY,
          "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
      });
      return res.json({ success: true });
    }
    
    // Funnels
    if (path === "/funnels" && method === "GET") {
      const { data, error } = await supabaseQuery("funnels", { filters: { user_id: userId } });
      if (error) return res.status(500).json({ error });
      return res.json(data || []);
    }
    
    if (path.match(/^\/funnels\/[^/]+$/) && method === "GET") {
      const id = path.split("/")[2];
      const { data, error } = await supabaseQuery("funnels", { filters: { id, user_id: userId }, single: true });
      if (error) return res.status(500).json({ error });
      if (!data) return res.status(404).json({ error: "Funnel not found" });
      return res.json(data);
    }
    
    if (path === "/funnels" && method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      const { data, error } = await supabaseQuery("funnels", {
        method: "POST",
        body: { ...body, user_id: userId },
        single: true,
      });
      if (error) return res.status(500).json({ error });
      return res.json(data);
    }
    
    if (path.match(/^\/funnels\/[^/]+$/) && method === "PATCH") {
      const id = path.split("/")[2];
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      let updateUrl = `${SUPABASE_URL}/rest/v1/funnels?id=eq.${id}&user_id=eq.${userId}`;
      const response = await fetch(updateUrl, {
        method: "PATCH",
        headers: {
          "apikey": SUPABASE_SERVICE_KEY,
          "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
          "Content-Type": "application/json",
          "Prefer": "return=representation",
        },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      return res.json(Array.isArray(data) ? data[0] : data);
    }
    
    if (path.match(/^\/funnels\/[^/]+$/) && method === "DELETE") {
      const id = path.split("/")[2];
      let deleteUrl = `${SUPABASE_URL}/rest/v1/funnels?id=eq.${id}&user_id=eq.${userId}`;
      await fetch(deleteUrl, {
        method: "DELETE",
        headers: {
          "apikey": SUPABASE_SERVICE_KEY,
          "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
      });
      return res.json({ success: true });
    }
    
    // Funnel Steps
    if (path.match(/^\/funnels\/[^/]+\/steps$/) && method === "GET") {
      const funnelId = path.split("/")[2];
      const { data, error } = await supabaseQuery("funnel_steps", { 
        filters: { funnel_id: funnelId },
        order: "step_order",
      });
      if (error) return res.status(500).json({ error });
      return res.json(data || []);
    }
    
    // Analytics
    if (path === "/analytics" && method === "GET") {
      const { data: orders } = await supabaseQuery("orders", { filters: { user_id: userId } });
      const { data: customers } = await supabaseQuery("customers", { filters: { user_id: userId } });
      const { data: products } = await supabaseQuery("products", { filters: { user_id: userId } });
      
      const allOrders = orders || [];
      const completedOrders = allOrders.filter((o: any) => o.status === "completed");
      const totalRevenue = completedOrders.reduce((sum: number, o: any) => sum + parseFloat(o.total_amount || "0"), 0);
      
      return res.json({
        totalRevenue,
        totalOrders: allOrders.length,
        totalCustomers: (customers || []).length,
        totalProducts: (products || []).length,
        conversionRate: allOrders.length > 0 ? (completedOrders.length / allOrders.length) * 100 : 0,
        averageOrderValue: completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0,
        recentOrders: allOrders.slice(0, 5),
        topProducts: [],
      });
    }
    
    // Settings
    if (path === "/settings" && method === "GET") {
      return res.json({
        storeName: user?.business_name || "My Store",
        storeEmail: user?.email || "",
        currency: "USD",
      });
    }
    
    if (path === "/settings" && method === "PATCH") {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      if (body.storeName) {
        let updateUrl = `${SUPABASE_URL}/rest/v1/users?id=eq.${userId}`;
        await fetch(updateUrl, {
          method: "PATCH",
          headers: {
            "apikey": SUPABASE_SERVICE_KEY,
            "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ business_name: body.storeName }),
        });
      }
      return res.json({ success: true });
    }
    
    // Subscription Plans
    if (path === "/subscription-plans" && method === "GET") {
      const { data, error } = await supabaseQuery("subscription_plans", { order: "sort_order" });
      if (error) return res.status(500).json({ error });
      return res.json(data || []);
    }
    
    return res.status(404).json({ error: "Not found", path });
    
  } catch (error: any) {
    console.error("API Error:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}
