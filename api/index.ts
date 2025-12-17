import type { VercelRequest, VercelResponse } from "@vercel/node";

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";

async function getSupabaseAdmin() {
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(supabaseUrl, supabaseServiceKey);
}

async function getSupabaseClient() {
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(supabaseUrl, supabaseAnonKey);
}

async function getCurrentUser(req: VercelRequest) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return null;
  
  const token = authHeader.substring(7);
  const supabase = await getSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  
  const admin = await getSupabaseAdmin();
  const { data } = await admin.from("users").select("*").eq("email", user.email).single();
  
  if (!data && user.email) {
    const { data: newUser } = await admin.from("users").insert({
      email: user.email,
      supabase_id: user.id,
      business_name: user.user_metadata?.full_name || "My Store",
    }).select().single();
    return newUser;
  }
  return data;
}

async function getOrCreateDemoUser() {
  const admin = await getSupabaseAdmin();
  const { data } = await admin.from("users").select("*").eq("email", "demo@example.com").single();
  if (data) return data;
  
  const { data: newUser } = await admin.from("users").insert({
    email: "demo@example.com",
    business_name: "Demo Store",
  }).select().single();
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
    const admin = await getSupabaseAdmin();
    
    // Health check
    if (path === "/health" || path === "/") {
      return res.json({ status: "ok", timestamp: new Date().toISOString() });
    }
    
    // Debug endpoint
    if (path === "/debug/env") {
      return res.json({
        hasAdminEmail: !!process.env.ADMIN_EMAIL,
        hasSupabaseUrl: !!supabaseUrl,
        hasServiceKey: !!supabaseServiceKey,
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
      const { data: plans } = await admin.from("subscription_plans").select("*").eq("is_active", true).order("sort_order");
      return res.json(plans || []);
    }
    
    // Get current user for authenticated routes
    let user = await getCurrentUser(req);
    if (!user) {
      user = await getOrCreateDemoUser();
    }
    const userId = user?.id;
    
    // Products
    if (path === "/products" && method === "GET") {
      const { data } = await admin.from("products").select("*").eq("user_id", userId);
      return res.json(data || []);
    }
    
    if (path.match(/^\/products\/[^/]+$/) && method === "GET") {
      const id = path.split("/")[2];
      const { data } = await admin.from("products").select("*").eq("id", id).single();
      return res.json(data);
    }
    
    if (path === "/products" && method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      const { data } = await admin.from("products").insert({ ...body, user_id: userId }).select().single();
      return res.json(data);
    }
    
    if (path.match(/^\/products\/[^/]+$/) && method === "PATCH") {
      const id = path.split("/")[2];
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      const { data } = await admin.from("products").update(body).eq("id", id).select().single();
      return res.json(data);
    }
    
    if (path.match(/^\/products\/[^/]+$/) && method === "DELETE") {
      const id = path.split("/")[2];
      await admin.from("products").delete().eq("id", id);
      return res.json({ success: true });
    }
    
    // Checkout Pages
    if (path === "/checkout-pages" && method === "GET") {
      const { data } = await admin.from("checkout_pages").select("*").eq("user_id", userId);
      return res.json(data || []);
    }
    
    if (path.match(/^\/checkout-pages\/[^/]+$/) && method === "GET") {
      const id = path.split("/")[2];
      const { data } = await admin.from("checkout_pages").select("*").eq("id", id).single();
      return res.json(data);
    }
    
    if (path.match(/^\/checkout\/[^/]+$/) && method === "GET") {
      const slug = path.split("/")[2];
      const { data } = await admin.from("checkout_pages").select("*").eq("slug", slug).single();
      return res.json(data);
    }
    
    if (path === "/checkout-pages" && method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      const { data } = await admin.from("checkout_pages").insert({ ...body, user_id: userId }).select().single();
      return res.json(data);
    }
    
    if (path.match(/^\/checkout-pages\/[^/]+$/) && method === "PATCH") {
      const id = path.split("/")[2];
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      const { data } = await admin.from("checkout_pages").update(body).eq("id", id).select().single();
      return res.json(data);
    }
    
    if (path.match(/^\/checkout-pages\/[^/]+$/) && method === "DELETE") {
      const id = path.split("/")[2];
      await admin.from("checkout_pages").delete().eq("id", id);
      return res.json({ success: true });
    }
    
    // Coupons
    if (path === "/coupons" && method === "GET") {
      const { data } = await admin.from("coupons").select("*").eq("user_id", userId);
      return res.json(data || []);
    }
    
    if (path === "/coupons" && method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      const { data } = await admin.from("coupons").insert({ ...body, user_id: userId }).select().single();
      return res.json(data);
    }
    
    if (path.match(/^\/coupons\/[^/]+$/) && method === "PATCH") {
      const id = path.split("/")[2];
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      const { data } = await admin.from("coupons").update(body).eq("id", id).select().single();
      return res.json(data);
    }
    
    if (path.match(/^\/coupons\/[^/]+$/) && method === "DELETE") {
      const id = path.split("/")[2];
      await admin.from("coupons").delete().eq("id", id);
      return res.json({ success: true });
    }
    
    // Customers
    if (path === "/customers" && method === "GET") {
      const { data } = await admin.from("customers").select("*").eq("user_id", userId);
      return res.json(data || []);
    }
    
    // Orders
    if (path === "/orders" && method === "GET") {
      const { data } = await admin.from("orders").select("*").eq("user_id", userId);
      return res.json(data || []);
    }
    
    if (path.match(/^\/orders\/[^/]+$/) && method === "GET") {
      const id = path.split("/")[2];
      const { data } = await admin.from("orders").select("*").eq("id", id).single();
      return res.json(data);
    }
    
    // Email Templates
    if (path === "/email-templates" && method === "GET") {
      const { data } = await admin.from("email_templates").select("*").eq("user_id", userId);
      return res.json(data || []);
    }
    
    if (path === "/email-templates" && method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      const { data } = await admin.from("email_templates").insert({ ...body, user_id: userId }).select().single();
      return res.json(data);
    }
    
    if (path.match(/^\/email-templates\/[^/]+$/) && method === "PATCH") {
      const id = path.split("/")[2];
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      const { data } = await admin.from("email_templates").update(body).eq("id", id).select().single();
      return res.json(data);
    }
    
    if (path.match(/^\/email-templates\/[^/]+$/) && method === "DELETE") {
      const id = path.split("/")[2];
      await admin.from("email_templates").delete().eq("id", id);
      return res.json({ success: true });
    }
    
    // Analytics
    if (path === "/analytics" && method === "GET") {
      const { data: orders } = await admin.from("orders").select("*").eq("user_id", userId);
      const { data: customers } = await admin.from("customers").select("*").eq("user_id", userId);
      const { data: products } = await admin.from("products").select("*").eq("user_id", userId);
      
      const allOrders = orders || [];
      const completedOrders = allOrders.filter(o => o.status === "completed");
      const totalRevenue = completedOrders.reduce((sum, o) => sum + parseFloat(o.total_amount || "0"), 0);
      
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
        await admin.from("users").update({ business_name: body.storeName }).eq("id", userId);
      }
      return res.json({ success: true });
    }
    
    return res.status(404).json({ error: "Not found", path });
    
  } catch (error: any) {
    console.error("API Error:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}
