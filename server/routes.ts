import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { emailService } from "./services/emailService";
import { aiPageBuilder } from "./services/aiPageBuilder";
import { facebookPixelService } from "./services/facebookPixel";
import { cartAbandonmentService } from "./services/cartAbandonment";
import { initSubscriptionPayment, UddoktaPayService, getPlatformPaymentService } from "./services/uddoktapay";
import { verifySupabaseToken } from "./supabaseAdmin";
import { getSession } from "./replit_integrations/auth";

// Extend Express Request to include user
declare global {
  namespace Express {
    interface User {
      claims: {
        sub: string;
        email?: string;
        first_name?: string;
        last_name?: string;
        profile_image_url?: string;
      };
      access_token: string;
      refresh_token?: string;
      expires_at?: number;
    }
  }
}

let cachedDemoUserId: string | null = null;

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Apply session middleware for maintaining user sessions
  app.use(getSession());

  // Get current user ID from authenticated session, or demo mode fallback
  async function getCurrentUserId(req: Request): Promise<string> {
    const session = (req as any).session;
    
    // Check for Supabase session first
    if (session?.userId) {
      return session.userId;
    }
    
    // Check for admin session
    if (session?.adminId && session.adminId !== 'env-admin') {
      return session.adminId;
    }
    
    // Demo mode fallback for development
    let user = await storage.getUserByEmail("demo@example.com");
    if (!user) {
      user = await storage.createUser({
        email: "demo@example.com",
        password: "demo123",
        businessName: "Demo Store",
      });
    }
    return user.id;
  }
  
  // Check if user is super admin
  async function isSuperAdmin(req: Request): Promise<boolean> {
    const session = (req as any).session;
    
    // Check session-based admin auth first
    if (session?.adminId) {
      // Special case: env-admin is always a super admin (logged in via environment variables)
      if (session.adminId === 'env-admin' && session.isEnvAdmin) {
        return true;
      }
      // Regular database admin lookup
      try {
        const admin = await storage.getUser(session.adminId);
        return admin?.role === 'super_admin' || admin?.role === 'admin';
      } catch (error) {
        console.error('Error checking admin status:', error);
        return false;
      }
    }
    
    // Check Supabase session
    if (session?.userId) {
      try {
        const user = await storage.getUser(session.userId);
        return user?.role === 'super_admin' || user?.role === 'admin';
      } catch (error) {
        console.error('Error checking user admin status:', error);
        return false;
      }
    }
    
    return false;
  }

  // ============ Public Routes (No Auth Required) ============
  
  // Public plans for pricing page
  app.get("/api/public/plans", async (req, res) => {
    try {
      const plans = await storage.getSubscriptionPlans();
      // Only return active plans with public info
      const publicPlans = plans
        .filter(p => p.isActive)
        .map(p => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          description: p.description,
          price: p.price,
          billingPeriod: p.billingPeriod,
          features: p.features,
          productLimit: p.productLimit,
          checkoutPageLimit: p.checkoutPageLimit,
          aiCreditsPerMonth: p.aiCreditsPerMonth,
          customDomainAllowed: p.customDomainAllowed,
          prioritySupport: p.prioritySupport,
          trialEnabled: p.trialEnabled || false,
          trialDays: p.trialDays || 0,
          sortOrder: p.sortOrder,
          isActive: p.isActive,
        }));
      res.json(publicPlans);
    } catch (error) {
      console.error("Error fetching public plans:", error);
      res.status(500).json({ error: "Failed to fetch plans" });
    }
  });

  // Auth session endpoint for frontend
  app.get("/api/auth/session", async (req, res) => {
    try {
      const session = (req as any).session;
      
      // Check admin session first
      if (session?.adminId) {
        // Handle env-admin (logged in via environment variables)
        if (session.adminId === 'env-admin' && session.isEnvAdmin) {
          const adminEmail = process.env.ADMIN_EMAIL || 'admin@digitalcart.com';
          return res.json({
            isAuthenticated: true,
            isAdmin: true,
            user: {
              id: 'env-admin',
              email: adminEmail,
              role: 'super_admin',
              firstName: 'Super',
              lastName: 'Admin',
            }
          });
        }
        
        // Handle database-backed admin
        const admin = await storage.getUser(session.adminId);
        if (admin) {
          return res.json({
            isAuthenticated: true,
            isAdmin: true,
            user: {
              id: admin.id,
              email: admin.email,
              role: admin.role,
              firstName: admin.firstName,
              lastName: admin.lastName,
            }
          });
        }
      }
      
      // Check Supabase session (Google OAuth for sellers)
      if (session?.userId) {
        const user = await storage.getUser(session.userId);
        if (user) {
          return res.json({
            isAuthenticated: true,
            isAdmin: user.role === 'super_admin' || user.role === 'admin',
            user: {
              id: user.id,
              email: user.email,
              role: user.role,
              firstName: user.firstName,
              lastName: user.lastName,
              businessName: user.businessName,
              avatarUrl: user.avatarUrl,
              planId: user.planId,
              planStatus: user.planStatus,
              planExpiresAt: user.planExpiresAt,
              trialEndsAt: user.trialEndsAt,
              subdomain: user.businessName?.toLowerCase().replace(/[^a-z0-9]/g, '-') || user.id.slice(0, 8),
              customDomain: user.customDomain,
              domainVerified: user.domainVerified,
            }
          });
        }
      }
      
      res.json({ isAuthenticated: false });
    } catch (error) {
      console.error("Error checking session:", error);
      res.json({ isAuthenticated: false });
    }
  });

  // Supabase OAuth callback - verify token and create session
  app.post("/api/auth/supabase-callback", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: "No token provided" });
      }

      const token = authHeader.substring(7);
      const supabaseUser = await verifySupabaseToken(token);
      
      if (!supabaseUser || !supabaseUser.email) {
        return res.status(401).json({ error: "Invalid token" });
      }

      // Find or create user in our database
      let user = await storage.getUserByEmail(supabaseUser.email);
      
      if (!user) {
        // Create new seller account
        user = await storage.createUser({
          email: supabaseUser.email,
          supabaseId: supabaseUser.id,
          firstName: supabaseUser.firstName,
          lastName: supabaseUser.lastName,
          avatarUrl: supabaseUser.avatarUrl,
          role: "seller",
        });
      } else {
        // Update existing user with Supabase ID if not set
        if (!user.supabaseId) {
          await storage.updateUser(user.id, { 
            supabaseId: supabaseUser.id,
            avatarUrl: supabaseUser.avatarUrl || user.avatarUrl,
          });
        }
      }

      // Create session
      const session = (req as any).session;
      session.userId = user.id;
      session.supabaseId = supabaseUser.id;

      res.json({ 
        success: true, 
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          businessName: user.businessName,
          avatarUrl: user.avatarUrl,
        }
      });
    } catch (error) {
      console.error("Supabase callback error:", error);
      res.status(500).json({ error: "Authentication failed" });
    }
  });

  // Seller logout
  app.post("/api/auth/logout", async (req, res) => {
    try {
      const session = (req as any).session;
      if (session) {
        session.userId = null;
        session.supabaseId = null;
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ error: "Logout failed" });
    }
  });

  // Admin login with email/password
  app.post("/api/admin/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ success: false, error: "Email and password required" });
      }
      
      // First, check against environment variable credentials
      const adminEmail = process.env.ADMIN_EMAIL;
      const adminPassword = process.env.ADMIN_PASSWORD;
      
      if (adminEmail && adminPassword && email === adminEmail && password === adminPassword) {
        // Environment variable admin login successful
        const session = (req as any).session;
        session.adminId = 'env-admin';
        session.isEnvAdmin = true;
        
        return res.json({ 
          success: true, 
          user: {
            id: 'env-admin',
            email: adminEmail,
            role: 'super_admin',
            firstName: 'Super',
            lastName: 'Admin',
          }
        });
      }
      
      // Fallback to database user check
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ success: false, error: "Invalid email or password" });
      }
      
      // Check if user is admin
      if (user.role !== 'super_admin' && user.role !== 'admin') {
        return res.status(403).json({ success: false, error: "Access denied" });
      }
      
      // For now, simple password check (in production use bcrypt)
      if (user.password !== password) {
        return res.status(401).json({ success: false, error: "Invalid email or password" });
      }
      
      // Set admin session
      const session = (req as any).session;
      session.adminId = user.id;
      
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
    try {
      const session = (req as any).session;
      if (session?.adminId) {
        delete session.adminId;
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, error: "Logout failed" });
    }
  });

  // Order confirmation for thank-you page (no auth required)
  app.get("/api/order-confirmation/:token", async (req, res) => {
    try {
      const { token } = req.params;
      
      // Get order by confirmation token
      const order = await storage.getOrderByConfirmationToken(token);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      
      // Get customer info
      const customer = await storage.getCustomer(order.customerId);
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }
      
      // Get order items with product info and download tokens
      const items = await storage.getOrderItems(order.id);
      const itemsWithFiles = await Promise.all(
        items.map(async (item) => {
          const product = await storage.getProduct(item.productId);
          const files = await storage.getProductFiles(item.productId);
          
          // Get or create download token for this order item
          let downloadToken = await storage.getDownloadTokenByOrderItem(item.id);
          if (!downloadToken) {
            const crypto = await import("crypto");
            const tokenStr = crypto.randomBytes(32).toString("hex");
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + (product?.downloadExpiry || 30));
            
            downloadToken = await storage.createDownloadToken({
              orderItemId: item.id,
              customerId: customer.id,
              productId: item.productId,
              token: tokenStr,
              downloadsRemaining: product?.downloadLimit || null,
              expiresAt,
            });
          }
          
          return {
            id: item.id,
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            price: item.price,
            downloadToken: downloadToken.token,
            files: files.map(f => ({
              id: f.id,
              name: f.name,
              fileName: f.fileName,
              fileSize: f.fileSize,
            })),
          };
        })
      );
      
      // Get seller info
      const seller = await storage.getUser(order.userId);
      
      res.json({
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          totalAmount: order.totalAmount,
          status: order.status,
          createdAt: order.createdAt,
        },
        customer: {
          email: customer.email,
          firstName: customer.firstName,
          lastName: customer.lastName,
        },
        items: itemsWithFiles,
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

  // ============ Products Routes ============
  app.get("/api/products", async (req, res) => {
    try {
      const userId = await getCurrentUserId(req);
      const products = await storage.getProducts(userId);
      res.json(products);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  app.get("/api/products/:id", async (req, res) => {
    try {
      const product = await storage.getProduct(req.params.id);
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
      const product = await storage.createProduct({
        ...req.body,
        userId,
      });
      res.status(201).json(product);
    } catch (error) {
      console.error("Error creating product:", error);
      res.status(500).json({ error: "Failed to create product" });
    }
  });

  app.patch("/api/products/:id", async (req, res) => {
    try {
      const product = await storage.updateProduct(req.params.id, req.body);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      console.error("Error updating product:", error);
      res.status(500).json({ error: "Failed to update product" });
    }
  });

  app.delete("/api/products/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteProduct(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting product:", error);
      res.status(500).json({ error: "Failed to delete product" });
    }
  });

  // ============ Funnels Routes ============
  app.get("/api/funnels", async (req, res) => {
    try {
      const userId = await getCurrentUserId(req);
      const funnels = await storage.getFunnels(userId);
      res.json(funnels);
    } catch (error) {
      console.error("Error fetching funnels:", error);
      res.status(500).json({ error: "Failed to fetch funnels" });
    }
  });

  app.get("/api/funnels/:id", async (req, res) => {
    try {
      const funnel = await storage.getFunnel(req.params.id);
      if (!funnel) {
        return res.status(404).json({ error: "Funnel not found" });
      }
      res.json(funnel);
    } catch (error) {
      console.error("Error fetching funnel:", error);
      res.status(500).json({ error: "Failed to fetch funnel" });
    }
  });

  app.post("/api/funnels", async (req, res) => {
    try {
      const userId = await getCurrentUserId(req);
      const { name, description, productId, upsellsEnabled, downsellsEnabled, orderBumpsEnabled, upsells, downsells, orderBumps, customInstructions, targetAudience, tone, additionalContent } = req.body;
      
      // Validate required fields
      if (!name || !productId) {
        return res.status(400).json({ error: "Name and product are required to create a funnel" });
      }
      
      // Generate slug from name
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now().toString(36);
      
      const funnel = await storage.createFunnel({
        userId,
        name,
        description,
        productId,
        slug,
        upsellsEnabled: upsellsEnabled ?? false,
        downsellsEnabled: downsellsEnabled ?? false,
        orderBumpsEnabled: orderBumpsEnabled ?? false,
        upsells: upsells ?? [],
        downsells: downsells ?? [],
        orderBumps: orderBumps ?? [],
        customInstructions,
        targetAudience,
        tone: tone ?? 'professional',
        additionalContent,
      });
      res.status(201).json(funnel);
    } catch (error) {
      console.error("Error creating funnel:", error);
      res.status(500).json({ error: "Failed to create funnel" });
    }
  });

  app.patch("/api/funnels/:id", async (req, res) => {
    try {
      const funnel = await storage.updateFunnel(req.params.id, req.body);
      if (!funnel) {
        return res.status(404).json({ error: "Funnel not found" });
      }
      res.json(funnel);
    } catch (error) {
      console.error("Error updating funnel:", error);
      res.status(500).json({ error: "Failed to update funnel" });
    }
  });

  app.delete("/api/funnels/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteFunnel(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Funnel not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting funnel:", error);
      res.status(500).json({ error: "Failed to delete funnel" });
    }
  });

  // ============ Funnel Pages Routes ============
  app.get("/api/funnels/:funnelId/pages", async (req, res) => {
    try {
      const pages = await storage.getFunnelPages(req.params.funnelId);
      res.json(pages);
    } catch (error) {
      console.error("Error fetching funnel pages:", error);
      res.status(500).json({ error: "Failed to fetch funnel pages" });
    }
  });

  app.get("/api/funnel-pages/:id", async (req, res) => {
    try {
      const page = await storage.getFunnelPage(req.params.id);
      if (!page) {
        return res.status(404).json({ error: "Funnel page not found" });
      }
      res.json(page);
    } catch (error) {
      console.error("Error fetching funnel page:", error);
      res.status(500).json({ error: "Failed to fetch funnel page" });
    }
  });

  app.post("/api/funnels/:funnelId/pages", async (req, res) => {
    try {
      const page = await storage.createFunnelPage({
        ...req.body,
        funnelId: req.params.funnelId,
      });
      res.status(201).json(page);
    } catch (error) {
      console.error("Error creating funnel page:", error);
      res.status(500).json({ error: "Failed to create funnel page" });
    }
  });

  app.patch("/api/funnel-pages/:id", async (req, res) => {
    try {
      const page = await storage.updateFunnelPage(req.params.id, req.body);
      if (!page) {
        return res.status(404).json({ error: "Funnel page not found" });
      }
      res.json(page);
    } catch (error) {
      console.error("Error updating funnel page:", error);
      res.status(500).json({ error: "Failed to update funnel page" });
    }
  });

  app.delete("/api/funnel-pages/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteFunnelPage(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Funnel page not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting funnel page:", error);
      res.status(500).json({ error: "Failed to delete funnel page" });
    }
  });

  // ============ AI Page Generation for Funnels ============
  app.post("/api/funnel-pages/:id/generate", async (req, res) => {
    try {
      const { instructions, productInfo, audience, tone, pageType } = req.body;
      const userId = await getCurrentUserId(req);
      
      const page = await storage.getFunnelPage(req.params.id);
      if (!page) {
        return res.status(404).json({ error: "Funnel page not found" });
      }
      
      // Fetch funnel data to get product context
      const funnel = await storage.getFunnel(page.funnelId);
      let productContext = productInfo || "Digital product";
      let audienceContext = audience || funnel?.targetAudience || "General audience";
      let toneContext = tone || funnel?.tone || "professional";
      let customInstructions = instructions || funnel?.customInstructions || "Create a conversion-optimized page";
      
      // Build rich product context if funnel has a product
      if (funnel?.product && !productInfo) {
        const product = funnel.product;
        productContext = `
Product Name: ${product.name}
Description: ${product.description || "No description"}
Price: $${Number(product.price).toFixed(2)}
Product Type: ${product.productType || "digital"}
${product.compareAtPrice ? `Compare At Price: $${Number(product.compareAtPrice).toFixed(2)}` : ""}
`.trim();
      }
      
      const settings = await storage.getPlatformSettings();
      const defaultProvider = settings.ai_default_provider || "gemini";
      const defaultModel = settings.ai_default_model || "gemini-2.0-flash";
      
      const geminiEnabled = settings.ai_gemini_enabled !== false;
      const openrouterEnabled = settings.ai_openrouter_enabled !== false;
      
      const AIPageBuilderV2 = (await import("./services/aiPageBuilderV2")).AIPageBuilderV2;
      const aiBuilder = new AIPageBuilderV2();
      
      const prompt = `Generate a ${pageType || page.pageType} page for a digital product sales funnel.

PRODUCT INFORMATION:
${productContext}

TARGET AUDIENCE: ${audienceContext}
TONE: ${toneContext}

CUSTOM INSTRUCTIONS FROM SELLER:
${customInstructions}

Generate content blocks for this page including:
- Hero section with compelling headline that highlights the product value
- Features/benefits section specific to the product
- Social proof/testimonials (create realistic testimonials for this product type)
- FAQ section addressing common objections
- Strong call to action with the product price

Return the response as JSON with a "blocks" array where each block has: id, type, content, styles, position`;

      let generatedBlocks: any[] = [];
      
      if (defaultProvider === "gemini" && geminiEnabled) {
        const geminiKey = await storage.getPlatformSetting("ai_gemini_api_key");
        if (geminiKey?.value) {
          const { GoogleGenAI } = await import("@google/genai");
          const client = new GoogleGenAI({ apiKey: geminiKey.value as string });
          
          const response = await client.models.generateContent({
            model: defaultModel.replace("google/", ""),
            contents: prompt,
          });
          
          const text = response.text || "";
          try {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              generatedBlocks = parsed.blocks || [];
            }
          } catch (e) {
            console.error("Failed to parse AI response:", e);
          }
        }
      } else if (defaultProvider === "openrouter" && openrouterEnabled) {
        const openrouterKey = await storage.getPlatformSetting("ai_openrouter_api_key");
        if (openrouterKey?.value) {
          const OpenAI = (await import("openai")).default;
          const client = new OpenAI({
            baseURL: "https://openrouter.ai/api/v1",
            apiKey: openrouterKey.value as string,
          });
          
          const response = await client.chat.completions.create({
            model: defaultModel,
            messages: [{ role: "user", content: prompt }],
          });
          
          const text = response.choices[0]?.message?.content || "";
          try {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              generatedBlocks = parsed.blocks || [];
            }
          } catch (e) {
            console.error("Failed to parse AI response:", e);
          }
        }
      }
      
      if (generatedBlocks.length === 0) {
        generatedBlocks = aiBuilder.generateDefaultBlocks(pageType || page.pageType);
      }
      
      const updatedPage = await storage.updateFunnelPage(req.params.id, {
        blocks: generatedBlocks,
        aiGenerated: true,
        aiPrompt: instructions,
        aiModel: defaultModel,
      });
      
      res.json({ success: true, page: updatedPage, blocks: generatedBlocks });
    } catch (error) {
      console.error("Error generating page content:", error);
      res.status(500).json({ error: "Failed to generate page content" });
    }
  });

  // ============ Checkout Pages Routes ============
  app.get("/api/checkout-pages", async (req, res) => {
    try {
      const userId = await getCurrentUserId(req);
      const pages = await storage.getCheckoutPages(userId);
      res.json(pages);
    } catch (error) {
      console.error("Error fetching checkout pages:", error);
      res.status(500).json({ error: "Failed to fetch checkout pages" });
    }
  });

  app.get("/api/checkout-pages/:id", async (req, res) => {
    try {
      const page = await storage.getCheckoutPage(req.params.id);
      if (!page) {
        return res.status(404).json({ error: "Checkout page not found" });
      }
      res.json(page);
    } catch (error) {
      console.error("Error fetching checkout page:", error);
      res.status(500).json({ error: "Failed to fetch checkout page" });
    }
  });

  app.get("/api/checkout-pages/slug/:slug", async (req, res) => {
    try {
      const page = await storage.getCheckoutPageBySlug(req.params.slug);
      if (!page) {
        return res.status(404).json({ error: "Checkout page not found" });
      }
      res.json(page);
    } catch (error) {
      console.error("Error fetching checkout page:", error);
      res.status(500).json({ error: "Failed to fetch checkout page" });
    }
  });

  app.post("/api/checkout-pages", async (req, res) => {
    try {
      const userId = await getCurrentUserId(req);
      const page = await storage.createCheckoutPage({
        ...req.body,
        userId,
      });
      res.status(201).json(page);
    } catch (error) {
      console.error("Error creating checkout page:", error);
      res.status(500).json({ error: "Failed to create checkout page" });
    }
  });

  app.patch("/api/checkout-pages/:id", async (req, res) => {
    try {
      const page = await storage.updateCheckoutPage(req.params.id, req.body);
      if (!page) {
        return res.status(404).json({ error: "Checkout page not found" });
      }
      res.json(page);
    } catch (error) {
      console.error("Error updating checkout page:", error);
      res.status(500).json({ error: "Failed to update checkout page" });
    }
  });

  app.delete("/api/checkout-pages/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteCheckoutPage(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Checkout page not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting checkout page:", error);
      res.status(500).json({ error: "Failed to delete checkout page" });
    }
  });

  // ============ Coupons Routes ============
  app.get("/api/coupons", async (req, res) => {
    try {
      const userId = await getCurrentUserId(req);
      const coupons = await storage.getCoupons(userId);
      res.json(coupons);
    } catch (error) {
      console.error("Error fetching coupons:", error);
      res.status(500).json({ error: "Failed to fetch coupons" });
    }
  });

  app.post("/api/coupons", async (req, res) => {
    try {
      const userId = await getCurrentUserId(req);
      const coupon = await storage.createCoupon({
        ...req.body,
        userId,
      });
      res.status(201).json(coupon);
    } catch (error) {
      console.error("Error creating coupon:", error);
      res.status(500).json({ error: "Failed to create coupon" });
    }
  });

  app.patch("/api/coupons/:id", async (req, res) => {
    try {
      const coupon = await storage.updateCoupon(req.params.id, req.body);
      if (!coupon) {
        return res.status(404).json({ error: "Coupon not found" });
      }
      res.json(coupon);
    } catch (error) {
      console.error("Error updating coupon:", error);
      res.status(500).json({ error: "Failed to update coupon" });
    }
  });

  app.delete("/api/coupons/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteCoupon(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Coupon not found" });
      }
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
      const coupon = await storage.getCouponByCode(code, userId);
      
      if (!coupon) {
        return res.status(404).json({ error: "Coupon not found" });
      }
      
      if (!coupon.isActive) {
        return res.status(400).json({ error: "Coupon is inactive" });
      }
      
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

  // ============ Customers Routes ============
  app.get("/api/customers", async (req, res) => {
    try {
      const userId = await getCurrentUserId(req);
      const customers = await storage.getCustomers(userId);
      res.json(customers);
    } catch (error) {
      console.error("Error fetching customers:", error);
      res.status(500).json({ error: "Failed to fetch customers" });
    }
  });

  app.get("/api/customers/:id", async (req, res) => {
    try {
      const customer = await storage.getCustomer(req.params.id);
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }
      res.json(customer);
    } catch (error) {
      console.error("Error fetching customer:", error);
      res.status(500).json({ error: "Failed to fetch customer" });
    }
  });

  // ============ Orders Routes ============
  app.get("/api/orders", async (req, res) => {
    try {
      const userId = await getCurrentUserId(req);
      const orders = await storage.getOrders(userId);
      res.json(orders);
    } catch (error) {
      console.error("Error fetching orders:", error);
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  app.get("/api/orders/:id", async (req, res) => {
    try {
      const order = await storage.getOrder(req.params.id);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      res.json(order);
    } catch (error) {
      console.error("Error fetching order:", error);
      res.status(500).json({ error: "Failed to fetch order" });
    }
  });

  // ============ Email Templates Routes ============
  app.get("/api/email-templates", async (req, res) => {
    try {
      const userId = await getCurrentUserId(req);
      const templates = await storage.getEmailTemplates(userId);
      res.json(templates);
    } catch (error) {
      console.error("Error fetching email templates:", error);
      res.status(500).json({ error: "Failed to fetch email templates" });
    }
  });

  app.post("/api/email-templates", async (req, res) => {
    try {
      const userId = await getCurrentUserId(req);
      const template = await storage.createEmailTemplate({
        ...req.body,
        userId,
      });
      res.status(201).json(template);
    } catch (error) {
      console.error("Error creating email template:", error);
      res.status(500).json({ error: "Failed to create email template" });
    }
  });

  app.patch("/api/email-templates/:id", async (req, res) => {
    try {
      const template = await storage.updateEmailTemplate(req.params.id, req.body);
      if (!template) {
        return res.status(404).json({ error: "Email template not found" });
      }
      res.json(template);
    } catch (error) {
      console.error("Error updating email template:", error);
      res.status(500).json({ error: "Failed to update email template" });
    }
  });

  app.delete("/api/email-templates/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteEmailTemplate(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Email template not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting email template:", error);
      res.status(500).json({ error: "Failed to delete email template" });
    }
  });

  // ============ Analytics Routes ============
  app.get("/api/analytics", async (req, res) => {
    try {
      const userId = await getCurrentUserId(req);
      
      // Get real data from storage
      const orders = await storage.getOrders(userId);
      const customers = await storage.getCustomers(userId);
      const products = await storage.getProducts(userId);
      
      // Calculate totals
      const totalRevenue = orders.reduce((sum: number, o) => sum + Number(o.totalAmount || 0), 0);
      const totalOrders = orders.length;
      const totalCustomers = customers.length;
      
      // Calculate conversion rate (if we have page views)
      const completedOrders = orders.filter((o) => o.status === 'completed').length;
      const conversionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;
      
      // Get last 30 days revenue by day
      const last30Days = new Date();
      last30Days.setDate(last30Days.getDate() - 30);
      
      const revenueByDay: { date: string; revenue: number }[] = [];
      for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const dayRevenue = orders
          .filter((o) => o.createdAt && new Date(o.createdAt).toISOString().split('T')[0] === dateStr)
          .reduce((sum: number, o) => sum + Number(o.totalAmount || 0), 0);
        revenueByDay.push({ date: dateStr.slice(5), revenue: dayRevenue });
      }
      
      // Get top products by sales (use items from orders which have items included)
      const productSales: Record<string, { name: string; sales: number; revenue: number }> = {};
      for (const order of orders) {
        const items = order.items || [];
        for (const item of items) {
          const product = products.find((p) => p.id === item.productId);
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
      const topProducts = Object.values(productSales)
        .sort((a, b) => b.sales - a.sales)
        .slice(0, 5);
      
      // Get recent orders with customer info
      const recentOrders = orders
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
        .slice(0, 5)
        .map((o) => ({
          id: o.id,
          customer: o.customer?.email || 'Unknown',
          amount: Number(o.totalAmount || 0),
          status: o.status || 'pending',
          date: o.createdAt?.toISOString() || '',
        }));
      
      const analyticsData = {
        totalRevenue,
        totalOrders,
        totalCustomers,
        conversionRate: Math.round(conversionRate * 10) / 10,
        revenueChange: 0, // Would need historical data to calculate
        ordersChange: 0,
        customersChange: 0,
        conversionChange: 0,
        revenueByDay,
        topProducts,
        recentOrders,
      };
      
      res.json(analyticsData);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });

  app.get("/api/analytics/detailed", async (req, res) => {
    try {
      const userId = await getCurrentUserId(req);
      
      // Get real data from storage
      const orders = await storage.getOrders(userId);
      const customers = await storage.getCustomers(userId);
      const products = await storage.getProducts(userId);
      const checkoutPages = await storage.getCheckoutPages(userId);
      
      // Calculate totals
      const totalRevenue = orders.reduce((sum: number, o) => sum + Number(o.totalAmount || 0), 0);
      const totalOrders = orders.length;
      const totalCustomers = customers.length;
      
      // Orders by status
      const ordersByStatus: Record<string, number> = {};
      orders.forEach((o) => {
        const status = o.status || 'pending';
        ordersByStatus[status] = (ordersByStatus[status] || 0) + 1;
      });
      
      // Get last 30 days data
      const revenueByDay: { date: string; amount: number }[] = [];
      const ordersByDay: { date: string; count: number }[] = [];
      const customersByDay: { date: string; count: number }[] = [];
      
      for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const shortDate = dateStr.slice(5);
        
        const dayRevenue = orders
          .filter((o) => o.createdAt && new Date(o.createdAt).toISOString().split('T')[0] === dateStr)
          .reduce((sum: number, o) => sum + Number(o.totalAmount || 0), 0);
        revenueByDay.push({ date: shortDate, amount: dayRevenue });
        
        const dayOrders = orders.filter((o) => o.createdAt && new Date(o.createdAt).toISOString().split('T')[0] === dateStr).length;
        ordersByDay.push({ date: shortDate, count: dayOrders });
        
        const dayCustomers = customers.filter((c) => c.createdAt && new Date(c.createdAt).toISOString().split('T')[0] === dateStr).length;
        customersByDay.push({ date: shortDate, count: dayCustomers });
      }
      
      // Get top products by sales (use items from orders which have items included)
      const productSales: Record<string, { name: string; sales: number; revenue: number }> = {};
      for (const order of orders) {
        const items = order.items || [];
        for (const item of items) {
          const product = products.find((p) => p.id === item.productId);
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
      const topProducts = Object.values(productSales)
        .sort((a, b) => b.sales - a.sales)
        .slice(0, 5);
      
      // Get top checkout pages
      const topPages = checkoutPages
        .slice(0, 5)
        .map((p) => ({ name: p.name, views: 0, conversions: 0 }));
      
      // Calculate conversion rate
      const completedOrders = orders.filter((o) => o.status === 'completed').length;
      const conversionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;
      
      const analyticsData = {
        revenue: {
          total: totalRevenue,
          change: 0,
          byDay: revenueByDay,
        },
        orders: {
          total: totalOrders,
          change: 0,
          byDay: ordersByDay,
          byStatus: Object.entries(ordersByStatus).map(([status, count]) => ({ status, count })),
        },
        customers: {
          total: totalCustomers,
          change: 0,
          newByDay: customersByDay,
        },
        conversions: {
          rate: Math.round(conversionRate * 10) / 10,
          change: 0,
          pageViews: 0,
          checkouts: totalOrders,
          purchases: completedOrders,
        },
        topProducts,
        topPages,
      };
      
      res.json(analyticsData);
    } catch (error) {
      console.error("Error fetching detailed analytics:", error);
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });

  // ============ Settings Routes ============
  app.post("/api/settings/general", async (req, res) => {
    try {
      const userId = await getCurrentUserId(req);
      const user = await storage.updateUser(userId, {
        businessName: req.body.storeName,
      });
      res.json({ success: true });
    } catch (error) {
      console.error("Error saving settings:", error);
      res.status(500).json({ error: "Failed to save settings" });
    }
  });

  app.post("/api/settings/payment", async (req, res) => {
    try {
      const userId = await getCurrentUserId(req);
      await storage.updateUser(userId, {
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
      await storage.updateUser(userId, {
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
      await storage.updateUser(userId, {
        fromEmail: req.body.fromEmail,
      });
      res.json({ success: true });
    } catch (error) {
      console.error("Error saving email settings:", error);
      res.status(500).json({ error: "Failed to save settings" });
    }
  });

  app.post("/api/settings/domain", async (req, res) => {
    try {
      const userId = await getCurrentUserId(req);
      await storage.updateUser(userId, {
        customDomain: req.body.customDomain,
      });
      res.json({ success: true });
    } catch (error) {
      console.error("Error saving domain settings:", error);
      res.status(500).json({ error: "Failed to save settings" });
    }
  });

  // ============ Admin Routes ============
  
  // Admin Stats
  app.get("/api/admin/stats", async (req, res) => {
    try {
      if (!(await isSuperAdmin(req))) {
        return res.status(403).json({ error: "Admin access required" });
      }
      const allUsers = await storage.getAllUsers();
      const totalUsers = allUsers.length;
      const activeUsers = allUsers.filter(u => u.isActive !== false).length;
      
      // For now, use mock platform-wide data
      res.json({
        totalUsers,
        activeUsers,
        totalRevenue: 8450,
        totalOrders: 1256,
        planDistribution: [
          { name: "Free", count: Math.floor(totalUsers * 0.47), color: "#94a3b8" },
          { name: "Starter", count: Math.floor(totalUsers * 0.29), color: "#22c55e" },
          { name: "Pro", count: Math.floor(totalUsers * 0.19), color: "#3b82f6" },
          { name: "Enterprise", count: Math.floor(totalUsers * 0.05), color: "#a855f7" },
        ],
        recentSignups: [
          { date: "Mon", count: 12 },
          { date: "Tue", count: 18 },
          { date: "Wed", count: 15 },
          { date: "Thu", count: 22 },
          { date: "Fri", count: 19 },
          { date: "Sat", count: 8 },
          { date: "Sun", count: 6 },
        ],
      });
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ error: "Failed to fetch admin stats" });
    }
  });

  // Admin Users
  app.get("/api/admin/users", async (req, res) => {
    try {
      if (!(await isSuperAdmin(req))) {
        return res.status(403).json({ error: "Admin access required" });
      }
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.patch("/api/admin/users/:id", async (req, res) => {
    try {
      if (!(await isSuperAdmin(req))) {
        return res.status(403).json({ error: "Admin access required" });
      }
      const user = await storage.updateUser(req.params.id, req.body);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  // Admin Subscription Plans
  app.get("/api/admin/plans", async (req, res) => {
    try {
      if (!(await isSuperAdmin(req))) {
        return res.status(403).json({ error: "Admin access required" });
      }
      const plans = await storage.getSubscriptionPlans();
      res.json(plans);
    } catch (error) {
      console.error("Error fetching plans:", error);
      res.status(500).json({ error: "Failed to fetch plans" });
    }
  });

  app.post("/api/admin/plans", async (req, res) => {
    try {
      if (!(await isSuperAdmin(req))) {
        return res.status(403).json({ error: "Admin access required" });
      }
      const plan = await storage.createSubscriptionPlan(req.body);
      res.status(201).json(plan);
    } catch (error) {
      console.error("Error creating plan:", error);
      res.status(500).json({ error: "Failed to create plan" });
    }
  });

  app.patch("/api/admin/plans/:id", async (req, res) => {
    try {
      if (!(await isSuperAdmin(req))) {
        return res.status(403).json({ error: "Admin access required" });
      }
      const plan = await storage.updateSubscriptionPlan(req.params.id, req.body);
      if (!plan) {
        return res.status(404).json({ error: "Plan not found" });
      }
      res.json(plan);
    } catch (error) {
      console.error("Error updating plan:", error);
      res.status(500).json({ error: "Failed to update plan" });
    }
  });

  // Admin Settings
  app.get("/api/admin/settings", async (req, res) => {
    try {
      if (!(await isSuperAdmin(req))) {
        return res.status(403).json({ error: "Admin access required" });
      }
      const settings = await storage.getPlatformSettings();
      // Redact sensitive API keys in settings
      const safeSettings: Record<string, any> = {};
      for (const [key, value] of Object.entries(settings)) {
        if (key.includes('api_key') && typeof value === 'string' && value.length > 8) {
          safeSettings[key] = '••••••••' + value.slice(-4);
        } else {
          safeSettings[key] = value;
        }
      }
      res.json(safeSettings);
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.post("/api/admin/settings", async (req, res) => {
    try {
      if (!(await isSuperAdmin(req))) {
        return res.status(403).json({ error: "Admin access required" });
      }
      for (const [key, value] of Object.entries(req.body)) {
        await storage.updatePlatformSetting(key, value);
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error saving settings:", error);
      res.status(500).json({ error: "Failed to save settings" });
    }
  });

  // Admin - Platform Payment Gateways (Admin only)
  app.get("/api/admin/payment-gateways", async (req, res) => {
    try {
      if (!(await isSuperAdmin(req))) {
        return res.status(403).json({ error: "Admin access required" });
      }
      
      const gateways = await storage.getPlatformPaymentGateways();
      // Redact sensitive credentials for safety
      const safeGateways = gateways.map(g => ({
        ...g,
        apiKey: g.apiKey ? '••••••••' + (g.apiKey.slice(-4) || '') : null,
        webhookSecret: g.webhookSecret ? '••••••••' : null,
      }));
      res.json(safeGateways);
    } catch (error) {
      console.error("Error fetching payment gateways:", error);
      res.status(500).json({ error: "Failed to fetch payment gateways" });
    }
  });

  app.post("/api/admin/payment-gateways", async (req, res) => {
    try {
      if (!(await isSuperAdmin(req))) {
        return res.status(403).json({ error: "Admin access required" });
      }
      
      const { provider, displayName, apiKey, apiUrl, webhookSecret, isTestMode, isActive, isPrimary, supportedCurrencies, metadata } = req.body;
      
      if (isPrimary) {
        const existingGateways = await storage.getPlatformPaymentGateways();
        for (const g of existingGateways) {
          if (g.isPrimary) {
            await storage.updatePlatformPaymentGateway(g.id, { isPrimary: false });
          }
        }
      }
      
      const gateway = await storage.createPlatformPaymentGateway({
        provider,
        displayName,
        apiKey,
        apiUrl,
        webhookSecret,
        isTestMode: isTestMode ?? true,
        isActive: isActive ?? true,
        isPrimary: isPrimary ?? false,
        supportedCurrencies: supportedCurrencies ?? ['BDT'],
        metadata: metadata ?? {},
      });
      
      // Return safe version without credentials
      res.json({
        ...gateway,
        apiKey: gateway.apiKey ? '••••••••' + (gateway.apiKey.slice(-4) || '') : null,
        webhookSecret: gateway.webhookSecret ? '••••••••' : null,
      });
    } catch (error) {
      console.error("Error creating payment gateway:", error);
      res.status(500).json({ error: "Failed to create payment gateway" });
    }
  });

  app.patch("/api/admin/payment-gateways/:id", async (req, res) => {
    try {
      if (!(await isSuperAdmin(req))) {
        return res.status(403).json({ error: "Admin access required" });
      }
      
      const { isPrimary } = req.body;
      
      if (isPrimary) {
        const existingGateways = await storage.getPlatformPaymentGateways();
        for (const g of existingGateways) {
          if (g.isPrimary && g.id !== req.params.id) {
            await storage.updatePlatformPaymentGateway(g.id, { isPrimary: false });
          }
        }
      }
      
      const gateway = await storage.updatePlatformPaymentGateway(req.params.id, req.body);
      if (!gateway) {
        return res.status(404).json({ error: "Payment gateway not found" });
      }
      
      // Return safe version without credentials
      res.json({
        ...gateway,
        apiKey: gateway.apiKey ? '••••••••' + (gateway.apiKey.slice(-4) || '') : null,
        webhookSecret: gateway.webhookSecret ? '••••••••' : null,
      });
    } catch (error) {
      console.error("Error updating payment gateway:", error);
      res.status(500).json({ error: "Failed to update payment gateway" });
    }
  });

  app.delete("/api/admin/payment-gateways/:id", async (req, res) => {
    try {
      if (!(await isSuperAdmin(req))) {
        return res.status(403).json({ error: "Admin access required" });
      }
      
      const deleted = await storage.deletePlatformPaymentGateway(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Payment gateway not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting payment gateway:", error);
      res.status(500).json({ error: "Failed to delete payment gateway" });
    }
  });

  // ============ Subscription Payment Routes ============
  app.post("/api/payments/subscription/initiate", async (req, res) => {
    try {
      const userId = await getCurrentUserId(req);
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      const { planId } = req.body;
      if (!planId) {
        return res.status(400).json({ error: "Plan ID is required" });
      }

      const plan = await storage.getSubscriptionPlan(planId);
      if (!plan) {
        return res.status(404).json({ error: "Plan not found" });
      }

      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const result = await initSubscriptionPayment(
        userId,
        planId,
        plan.price.toString(),
        user.email,
        user.businessName || user.email,
        baseUrl
      );

      if (!result) {
        return res.status(500).json({ error: "Failed to initiate payment" });
      }

      res.json({ paymentUrl: result.paymentUrl, paymentId: result.paymentId });
    } catch (error) {
      console.error("Error initiating subscription payment:", error);
      res.status(500).json({ error: "Failed to initiate payment" });
    }
  });

  app.get("/api/payments/subscription/callback", async (req, res) => {
    try {
      const { invoice_id, status } = req.query;
      
      if (!invoice_id) {
        return res.redirect('/pricing?error=missing_invoice');
      }

      const payment = await storage.getSellerPaymentByInvoiceId(invoice_id as string);
      if (!payment) {
        return res.redirect('/pricing?error=payment_not_found');
      }

      if (status === 'COMPLETED') {
        const paymentService = await getPlatformPaymentService();
        if (paymentService) {
          try {
            const verification = await paymentService.verifyPayment(invoice_id as string);
            if (verification.status === 'COMPLETED') {
              await storage.updateSellerPayment(payment.id, {
                status: 'completed',
                transactionId: verification.transaction_id,
                paidAt: new Date(),
              });

              if (payment.planId) {
                const plan = await storage.getSubscriptionPlan(payment.planId);
                if (plan) {
                  const now = new Date();
                  const expiresAt = new Date(now);
                  if (plan.billingPeriod === 'monthly') {
                    expiresAt.setMonth(expiresAt.getMonth() + 1);
                  } else if (plan.billingPeriod === 'yearly') {
                    expiresAt.setFullYear(expiresAt.getFullYear() + 1);
                  }

                  await storage.updateUser(payment.userId, {
                    planStatus: 'active',
                    planExpiresAt: expiresAt,
                    subscriptionId: payment.id,
                  });
                }
              }

              return res.redirect('/dashboard?subscription=success');
            }
          } catch (verifyError) {
            console.error("Payment verification failed:", verifyError);
          }
        }
      }

      return res.redirect('/pricing?error=payment_failed');
    } catch (error) {
      console.error("Error in subscription callback:", error);
      return res.redirect('/pricing?error=callback_error');
    }
  });

  app.post("/api/webhooks/uddoktapay/subscription", async (req, res) => {
    try {
      const signature = req.headers['rt-uddoktapay-signature'] as string || req.headers['x-uddoktapay-signature'] as string;
      const paymentService = await getPlatformPaymentService();
      
      if (paymentService && signature) {
        const rawBody = JSON.stringify(req.body);
        if (!paymentService.verifyWebhookSignature(rawBody, signature)) {
          console.warn('Webhook signature verification failed');
          return res.status(401).json({ error: "Invalid signature" });
        }
      }
      
      const { invoice_id, status, transaction_id, metadata } = req.body;
      
      if (!invoice_id) {
        return res.status(400).json({ error: "Missing invoice_id" });
      }

      const payment = await storage.getSellerPaymentByInvoiceId(invoice_id);
      if (!payment) {
        console.warn(`Webhook: Payment not found for invoice ${invoice_id}`);
        return res.status(200).json({ message: "Payment not found" });
      }

      if (status === 'COMPLETED' && payment.status !== 'completed') {
        await storage.updateSellerPayment(payment.id, {
          status: 'completed',
          transactionId: transaction_id,
          paidAt: new Date(),
        });

        if (payment.planId) {
          const plan = await storage.getSubscriptionPlan(payment.planId);
          if (plan) {
            const now = new Date();
            const expiresAt = new Date(now);
            if (plan.billingPeriod === 'monthly') {
              expiresAt.setMonth(expiresAt.getMonth() + 1);
            } else if (plan.billingPeriod === 'yearly') {
              expiresAt.setFullYear(expiresAt.getFullYear() + 1);
            }

            await storage.updateUser(payment.userId, {
              planStatus: 'active',
              planExpiresAt: expiresAt,
              subscriptionId: payment.id,
            });
          }
        }
      } else if (status === 'FAILED') {
        await storage.updateSellerPayment(payment.id, {
          status: 'failed',
        });
      }

      res.status(200).json({ message: "Webhook processed" });
    } catch (error) {
      console.error("Error processing subscription webhook:", error);
      res.status(500).json({ error: "Webhook processing failed" });
    }
  });

  // ============ AI Page Builder Routes ============
  app.post("/api/ai/generate-page", async (req, res) => {
    try {
      const { productName, productDescription, targetAudience, tone, style, includeTestimonials, includeGuarantee, includeCountdown } = req.body;
      
      const result = await aiPageBuilder.generateCheckoutPage({
        productName,
        productDescription,
        targetAudience,
        tone,
        style,
        includeTestimonials,
        includeGuarantee,
        includeCountdown,
      });
      
      res.json(result);
    } catch (error) {
      console.error("Error generating page:", error);
      res.status(500).json({ error: "Failed to generate page" });
    }
  });

  app.post("/api/ai/generate-email", async (req, res) => {
    try {
      const { eventType, productName, customerName, tone } = req.body;
      
      const result = await aiPageBuilder.generateEmailCopy({
        eventType,
        productName,
        customerName,
        tone,
      });
      
      res.json(result);
    } catch (error) {
      console.error("Error generating email:", error);
      res.status(500).json({ error: "Failed to generate email" });
    }
  });

  // ============ Facebook Pixel Routes ============
  app.post("/api/pixel/track", async (req, res) => {
    try {
      const userId = await getCurrentUserId(req);
      const user = await storage.getUser(userId);
      
      if (!user?.facebookPixelId || !user?.facebookAccessToken) {
        return res.status(400).json({ error: "Facebook Pixel not configured" });
      }
      
      const { eventName, eventData, customData, userData } = req.body;
      
      const event = {
        eventName,
        eventId: facebookPixelService.generateEventId(),
        eventTime: Math.floor(Date.now() / 1000),
        userData: userData || {},
        customData,
        eventSourceUrl: req.headers.referer,
        actionSource: 'website' as const,
      };
      
      const result = await facebookPixelService.sendServerEvent(
        user.facebookPixelId,
        user.facebookAccessToken,
        event
      );
      
      res.json(result);
    } catch (error) {
      console.error("Error tracking pixel event:", error);
      res.status(500).json({ error: "Failed to track event" });
    }
  });

  app.get("/api/pixel/script", async (req, res) => {
    try {
      const userId = await getCurrentUserId(req);
      const user = await storage.getUser(userId);
      
      if (!user?.facebookPixelId) {
        return res.status(400).json({ error: "Facebook Pixel not configured" });
      }
      
      const script = facebookPixelService.getClientSideScript(user.facebookPixelId);
      res.json({ script });
    } catch (error) {
      console.error("Error getting pixel script:", error);
      res.status(500).json({ error: "Failed to get pixel script" });
    }
  });

  // ============ Cart Abandonment Routes ============
  app.post("/api/cart/track", async (req, res) => {
    try {
      const { cartId, email, customerName, productId, productName, productImage, price, checkoutPageId, checkoutUrl } = req.body;
      
      cartAbandonmentService.trackCart({
        id: cartId,
        email,
        customerName,
        productId,
        productName,
        productImage,
        price,
        checkoutPageId,
        checkoutUrl,
        createdAt: new Date(),
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error tracking cart:", error);
      res.status(500).json({ error: "Failed to track cart" });
    }
  });

  app.post("/api/cart/recover/:cartId", async (req, res) => {
    try {
      cartAbandonmentService.markRecovered(req.params.cartId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking cart recovered:", error);
      res.status(500).json({ error: "Failed to mark cart recovered" });
    }
  });

  app.get("/api/cart/abandoned", async (req, res) => {
    try {
      const carts = cartAbandonmentService.getAbandonedCarts();
      const stats = cartAbandonmentService.getStats();
      res.json({ carts, stats });
    } catch (error) {
      console.error("Error getting abandoned carts:", error);
      res.status(500).json({ error: "Failed to get abandoned carts" });
    }
  });

  // ============ Media Library Routes ============
  app.get("/api/media", async (req, res) => {
    try {
      const userId = await getCurrentUserId(req);
      const assets = await storage.getMediaAssets(userId);
      res.json(assets);
    } catch (error) {
      console.error("Error fetching media assets:", error);
      res.status(500).json({ error: "Failed to fetch media assets" });
    }
  });

  app.post("/api/media", async (req, res) => {
    try {
      const userId = await getCurrentUserId(req);
      const asset = await storage.createMediaAsset({
        ...req.body,
        userId,
      });
      res.status(201).json(asset);
    } catch (error) {
      console.error("Error creating media asset:", error);
      res.status(500).json({ error: "Failed to create media asset" });
    }
  });

  app.delete("/api/media/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteMediaAsset(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Media asset not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting media asset:", error);
      res.status(500).json({ error: "Failed to delete media asset" });
    }
  });

  // ============ Invoice Generation Routes ============
  app.get("/api/orders/:orderId/invoice", async (req, res) => {
    try {
      const order = await storage.getOrder(req.params.orderId);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      
      const customer = order.customerId ? await storage.getCustomer(order.customerId) : null;
      const user = await storage.getUser(order.userId);
      const items = await storage.getOrderItems(order.id);
      
      const customerName = customer 
        ? `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Customer'
        : 'Customer';
      
      const invoiceHtml = emailService.generateInvoiceHtml({
        invoiceNumber: order.invoiceId || `INV-${order.id.substring(0, 8).toUpperCase()}`,
        date: order.createdAt ? new Date(order.createdAt).toLocaleDateString() : new Date().toLocaleDateString(),
        sellerInfo: {
          name: user?.businessName || 'Seller',
          email: user?.email || '',
        },
        customerInfo: {
          name: customerName,
          email: customer?.email || '',
        },
        items: items.map(item => ({
          name: item.product?.name || item.productId,
          quantity: 1,
          price: item.price?.toString() || '0',
          total: item.price?.toString() || '0',
        })),
        subtotal: order.subtotal?.toString() || '0',
        discount: order.discount?.toString(),
        total: order.total?.toString() || '0',
        currency: 'USD',
      });
      
      res.setHeader('Content-Type', 'text/html');
      res.send(invoiceHtml);
    } catch (error) {
      console.error("Error generating invoice:", error);
      res.status(500).json({ error: "Failed to generate invoice" });
    }
  });

  // ============ Email Sending Routes ============
  app.post("/api/email/send", async (req, res) => {
    try {
      const userId = await getCurrentUserId(req);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(400).json({ error: "User not found" });
      }
      
      await emailService.initialize({
        sendgridApiKey: user.sendgridApiKey || undefined,
        fromEmail: user.fromEmail || user.email,
        fromName: user.businessName || 'DigitalCart',
      });
      
      const { to, subject, html, text } = req.body;
      const success = await emailService.sendEmail({ to, subject, html, text });
      
      res.json({ success });
    } catch (error) {
      console.error("Error sending email:", error);
      res.status(500).json({ error: "Failed to send email" });
    }
  });

  app.post("/api/email/test", async (req, res) => {
    try {
      const userId = await getCurrentUserId(req);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(400).json({ error: "User not found" });
      }
      
      await emailService.initialize({
        sendgridApiKey: user.sendgridApiKey || undefined,
        fromEmail: user.fromEmail || user.email,
        fromName: user.businessName || 'DigitalCart',
      });
      
      const success = await emailService.sendEmail({
        to: user.email,
        subject: 'Test Email from DigitalCart',
        html: '<h1>Test Email</h1><p>This is a test email from your DigitalCart store.</p>',
      });
      
      res.json({ success, message: success ? 'Test email sent!' : 'Email not configured' });
    } catch (error) {
      console.error("Error sending test email:", error);
      res.status(500).json({ error: "Failed to send test email" });
    }
  });

  // ============ AI Page Builder V2 Routes ============
  app.get("/api/ai-builder/blocks", async (_req, res) => {
    try {
      const { aiPageBuilderV2 } = await import("./services/aiPageBuilderV2");
      res.json(aiPageBuilderV2.getAvailableBlocks());
    } catch (error) {
      console.error("Error getting available blocks:", error);
      res.status(500).json({ error: "Failed to get available blocks" });
    }
  });

  app.get("/api/ai-builder/models", async (_req, res) => {
    try {
      const { aiPageBuilderV2 } = await import("./services/aiPageBuilderV2");
      const models = aiPageBuilderV2.getAvailableModels();
      const configured = aiPageBuilderV2.isConfigured();
      res.json({ models, configured });
    } catch (error) {
      console.error("Error getting available models:", error);
      res.status(500).json({ error: "Failed to get available models" });
    }
  });

  app.post("/api/ai-builder/generate", async (req, res) => {
    try {
      const { aiPageBuilderV2 } = await import("./services/aiPageBuilderV2");
      const blocks = await aiPageBuilderV2.generatePage(req.body);
      res.json({ blocks });
    } catch (error) {
      console.error("Error generating page:", error);
      res.status(500).json({ error: "Failed to generate page with AI" });
    }
  });

  app.get("/api/ai-builder/templates/:type", async (req, res) => {
    try {
      const { aiPageBuilderV2 } = await import("./services/aiPageBuilderV2");
      const blocks = aiPageBuilderV2.getDefaultTemplate(req.params.type);
      res.json({ blocks });
    } catch (error) {
      console.error("Error getting template:", error);
      res.status(500).json({ error: "Failed to get template" });
    }
  });

  app.get("/api/ai-builder/block-defaults/:type", async (req, res) => {
    try {
      const { getDefaultBlockContent, getDefaultBlockStyles } = await import("./services/aiPageBuilderV2");
      const type = req.params.type as any;
      res.json({
        content: getDefaultBlockContent(type),
        styles: getDefaultBlockStyles(type),
      });
    } catch (error) {
      console.error("Error getting block defaults:", error);
      res.status(500).json({ error: "Failed to get block defaults" });
    }
  });

  // Admin AI Configuration Routes
  app.get("/api/admin/ai-config", async (req, res) => {
    try {
      if (!(await isSuperAdmin(req))) {
        return res.status(403).json({ error: "Admin access required" });
      }
      const geminiKey = await storage.getPlatformSetting('gemini_api_key');
      const geminiEnabled = await storage.getPlatformSetting('gemini_enabled');
      const geminiLastTested = await storage.getPlatformSetting('gemini_last_tested');
      const geminiTestStatus = await storage.getPlatformSetting('gemini_test_status');
      const openrouterKey = await storage.getPlatformSetting('openrouter_api_key');
      const openrouterEnabled = await storage.getPlatformSetting('openrouter_enabled');
      const openrouterLastTested = await storage.getPlatformSetting('openrouter_last_tested');
      const openrouterTestStatus = await storage.getPlatformSetting('openrouter_test_status');
      const defaultProvider = await storage.getPlatformSetting('ai_default_provider');
      const defaultModel = await storage.getPlatformSetting('ai_default_model');
      
      res.json({
        geminiEnabled: geminiEnabled?.value !== 'false',
        geminiConfigured: !!geminiKey?.value,
        geminiLastTested: geminiLastTested?.value || null,
        geminiTestStatus: geminiTestStatus?.value || null,
        openrouterEnabled: openrouterEnabled?.value !== 'false',
        openrouterConfigured: !!openrouterKey?.value,
        openrouterLastTested: openrouterLastTested?.value || null,
        openrouterTestStatus: openrouterTestStatus?.value || null,
        defaultProvider: defaultProvider?.value || 'gemini',
        defaultModel: defaultModel?.value || 'gemini-3-pro',
      });
    } catch (error) {
      console.error("Error getting AI config:", error);
      res.status(500).json({ error: "Failed to get AI configuration" });
    }
  });

  app.post("/api/admin/ai-config/gemini", async (req, res) => {
    try {
      if (!(await isSuperAdmin(req))) {
        return res.status(403).json({ error: "Admin access required" });
      }
      const { apiKey, enabled } = req.body;
      
      await storage.updatePlatformSetting('gemini_enabled', String(enabled));
      
      if (apiKey && apiKey.trim()) {
        await storage.updatePlatformSetting('gemini_api_key', apiKey);
        const { aiPageBuilderV2 } = await import("./services/aiPageBuilderV2");
        aiPageBuilderV2.configureGemini(apiKey);
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error saving Gemini config:", error);
      res.status(500).json({ error: "Failed to save Gemini configuration" });
    }
  });

  app.post("/api/admin/ai-config/openrouter", async (req, res) => {
    try {
      if (!(await isSuperAdmin(req))) {
        return res.status(403).json({ error: "Admin access required" });
      }
      const { apiKey, enabled } = req.body;
      
      await storage.updatePlatformSetting('openrouter_enabled', String(enabled));
      
      if (apiKey && apiKey.trim()) {
        await storage.updatePlatformSetting('openrouter_api_key', apiKey);
        const { aiPageBuilderV2 } = await import("./services/aiPageBuilderV2");
        aiPageBuilderV2.configureOpenRouter(apiKey);
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error saving OpenRouter config:", error);
      res.status(500).json({ error: "Failed to save OpenRouter configuration" });
    }
  });

  app.post("/api/admin/ai-config/defaults", async (req, res) => {
    try {
      if (!(await isSuperAdmin(req))) {
        return res.status(403).json({ error: "Admin access required" });
      }
      const { defaultProvider, defaultModel } = req.body;
      
      if (defaultProvider) {
        await storage.updatePlatformSetting('ai_default_provider', defaultProvider);
      }
      if (defaultModel) {
        await storage.updatePlatformSetting('ai_default_model', defaultModel);
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error saving AI defaults:", error);
      res.status(500).json({ error: "Failed to save AI defaults" });
    }
  });

  app.post("/api/admin/ai-config/test/gemini", async (req, res) => {
    try {
      if (!(await isSuperAdmin(req))) {
        return res.status(403).json({ error: "Admin access required" });
      }
      const geminiKey = await storage.getPlatformSetting('gemini_api_key');
      
      if (!geminiKey?.value) {
        return res.json({ success: false, error: "Gemini API key not configured" });
      }
      
      const { GoogleGenAI } = await import("@google/genai");
      const client = new GoogleGenAI({ apiKey: geminiKey.value as string });
      
      try {
        const response = await client.models.generateContent({
          model: 'gemini-2.0-flash',
          contents: 'Say "Hello" in one word.',
        });
        
        await storage.updatePlatformSetting('gemini_last_tested', new Date().toISOString());
        await storage.updatePlatformSetting('gemini_test_status', 'success');
        
        res.json({ success: true, message: "Connection successful" });
      } catch (apiError: any) {
        await storage.updatePlatformSetting('gemini_last_tested', new Date().toISOString());
        await storage.updatePlatformSetting('gemini_test_status', 'failed');
        
        res.json({ success: false, error: apiError.message || "API call failed" });
      }
    } catch (error) {
      console.error("Error testing Gemini:", error);
      res.status(500).json({ error: "Failed to test Gemini connection" });
    }
  });

  app.post("/api/admin/ai-config/test/openrouter", async (req, res) => {
    try {
      if (!(await isSuperAdmin(req))) {
        return res.status(403).json({ error: "Admin access required" });
      }
      const openrouterKey = await storage.getPlatformSetting('openrouter_api_key');
      
      if (!openrouterKey?.value) {
        return res.json({ success: false, error: "OpenRouter API key not configured" });
      }
      
      const OpenAI = (await import("openai")).default;
      const client = new OpenAI({
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey: openrouterKey.value as string,
      });
      
      try {
        const response = await client.chat.completions.create({
          model: 'meta-llama/llama-3.3-70b-instruct',
          messages: [{ role: 'user', content: 'Say "Hello" in one word.' }],
          max_tokens: 10,
        });
        
        await storage.updatePlatformSetting('openrouter_last_tested', new Date().toISOString());
        await storage.updatePlatformSetting('openrouter_test_status', 'success');
        
        res.json({ success: true, message: "Connection successful" });
      } catch (apiError: any) {
        await storage.updatePlatformSetting('openrouter_last_tested', new Date().toISOString());
        await storage.updatePlatformSetting('openrouter_test_status', 'failed');
        
        res.json({ success: false, error: apiError.message || "API call failed" });
      }
    } catch (error) {
      console.error("Error testing OpenRouter:", error);
      res.status(500).json({ error: "Failed to test OpenRouter connection" });
    }
  });

  // Start cart abandonment processing
  cartAbandonmentService.startProcessing();

  // ============ Subscription & Billing Routes ============
  
  // Get available subscription plans
  app.get("/api/subscription/plans", async (req, res) => {
    try {
      const plans = await storage.getSubscriptionPlans();
      res.json(plans.filter(p => p.isActive));
    } catch (error) {
      console.error("Error fetching plans:", error);
      res.status(500).json({ error: "Failed to fetch plans" });
    }
  });

  // Start subscription with Uddoktapay
  app.post("/api/subscription/checkout", async (req, res) => {
    try {
      const userId = await getCurrentUserId(req);
      const { planId, startTrial } = req.body;
      
      const plan = await storage.getSubscriptionPlan(planId);
      if (!plan) {
        return res.status(404).json({ error: "Plan not found" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Handle trial subscription
      if (startTrial && plan.trialEnabled && plan.trialDays && plan.trialDays > 0) {
        const trialEndsAt = new Date();
        trialEndsAt.setDate(trialEndsAt.getDate() + plan.trialDays);
        
        await storage.updateUser(userId, {
          planId: plan.id,
          planStatus: "trial",
          trialEndsAt,
        });
        
        return res.json({ 
          success: true, 
          message: `Started ${plan.trialDays}-day free trial`,
          trialEndsAt 
        });
      }

      // Get Uddoktapay settings
      const uddoktapayApiKeySetting = await storage.getPlatformSetting('uddoktapay_api_key');
      const uddoktapayApiUrlSetting = await storage.getPlatformSetting('uddoktapay_api_url');
      const apiKey = user.uddoktapayApiKey || (uddoktapayApiKeySetting?.value as string);
      const apiUrl = user.uddoktapayApiUrl || (uddoktapayApiUrlSetting?.value as string);
      
      if (!apiKey || !apiUrl) {
        return res.status(400).json({ error: "Payment gateway not configured" });
      }

      // Create payment record
      const payment = await storage.createSellerPayment({
        userId,
        planId: plan.id,
        amount: plan.price,
        currency: "BDT",
        paymentMethod: "uddoktapay",
        status: "pending",
        paymentType: "subscription",
      });

      // Initialize Uddoktapay payment
      const paymentData = {
        full_name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.businessName || 'Customer',
        email: user.email,
        amount: plan.price,
        metadata: {
          paymentId: payment.id,
          planId: plan.id,
          userId: userId,
        },
        redirect_url: `${req.protocol}://${req.hostname}/subscription/success`,
        cancel_url: `${req.protocol}://${req.hostname}/subscription/cancel`,
        webhook_url: `${req.protocol}://${req.hostname}/api/webhooks/uddoktapay`,
      };

      const response = await fetch(`${apiUrl}/api/checkout-v2`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'RT-UDDOKTAPAY-API-KEY': apiKey,
        },
        body: JSON.stringify(paymentData),
      });

      const result = await response.json();
      
      if (result.status && result.payment_url) {
        await storage.updateSellerPayment(payment.id, {
          transactionId: result.invoice_id,
        });
        res.json({ success: true, paymentUrl: result.payment_url });
      } else {
        await storage.updateSellerPayment(payment.id, { status: "failed" });
        res.status(400).json({ error: result.message || "Payment initialization failed" });
      }
    } catch (error) {
      console.error("Error creating subscription:", error);
      res.status(500).json({ error: "Failed to create subscription" });
    }
  });

  // Uddoktapay webhook
  app.post("/api/webhooks/uddoktapay", async (req, res) => {
    try {
      const { invoice_id, status, metadata } = req.body;
      
      if (!metadata?.paymentId) {
        return res.status(400).json({ error: "Invalid webhook data" });
      }

      const payment = await storage.getSellerPayment(metadata.paymentId);
      if (!payment) {
        return res.status(404).json({ error: "Payment not found" });
      }

      if (status === "COMPLETED") {
        await storage.updateSellerPayment(payment.id, {
          status: "completed",
          paidAt: new Date(),
          transactionId: invoice_id,
        });

        // Activate subscription
        const plan = await storage.getSubscriptionPlan(metadata.planId);
        const expiresAt = new Date();
        if (plan?.billingPeriod === "yearly") {
          expiresAt.setFullYear(expiresAt.getFullYear() + 1);
        } else {
          expiresAt.setMonth(expiresAt.getMonth() + 1);
        }

        await storage.updateUser(metadata.userId, {
          planId: metadata.planId,
          planStatus: "active",
          planExpiresAt: expiresAt,
          trialEndsAt: null,
        });
      } else if (status === "FAILED" || status === "CANCELLED") {
        await storage.updateSellerPayment(payment.id, { status: "failed" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Webhook error:", error);
      res.status(500).json({ error: "Webhook processing failed" });
    }
  });

  // Get current subscription status
  app.get("/api/subscription/status", async (req, res) => {
    try {
      const userId = await getCurrentUserId(req);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      let plan = null;
      if (user.planId) {
        plan = await storage.getSubscriptionPlan(user.planId);
      }

      res.json({
        planStatus: user.planStatus,
        plan: plan ? { id: plan.id, name: plan.name, price: plan.price } : null,
        planExpiresAt: user.planExpiresAt,
        trialEndsAt: user.trialEndsAt,
      });
    } catch (error) {
      console.error("Error fetching subscription:", error);
      res.status(500).json({ error: "Failed to fetch subscription" });
    }
  });

  // ============ Secure Download Routes ============
  
  // Generate download token for a purchased product
  app.post("/api/downloads/generate-token", async (req, res) => {
    try {
      const { orderItemId, customerId, productId } = req.body;
      
      // Verify the order item exists and is paid
      const orderItem = await storage.getOrderItem(orderItemId);
      if (!orderItem) {
        return res.status(404).json({ error: "Order item not found" });
      }

      const order = await storage.getOrder(orderItem.orderId);
      if (!order || order.status !== "completed") {
        return res.status(403).json({ error: "Order not completed" });
      }

      const product = await storage.getProduct(productId);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }

      // Generate secure token
      const crypto = await import("crypto");
      const token = crypto.randomBytes(32).toString("hex");
      
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7-day expiry

      const downloadToken = await storage.createDownloadToken({
        orderItemId,
        customerId,
        productId,
        token,
        downloadsRemaining: product.downloadLimit || 5,
        expiresAt,
      });

      res.json({ 
        token: downloadToken.token,
        expiresAt: downloadToken.expiresAt,
        downloadsRemaining: downloadToken.downloadsRemaining,
      });
    } catch (error) {
      console.error("Error generating download token:", error);
      res.status(500).json({ error: "Failed to generate download token" });
    }
  });

  // Download file using token (with optional fileId for multi-file products)
  app.get("/api/downloads/:token/:fileId?", async (req, res) => {
    try {
      const { token, fileId } = req.params;
      
      const downloadToken = await storage.getDownloadTokenByToken(token);
      if (!downloadToken) {
        return res.status(404).json({ error: "Invalid download token" });
      }

      // Check expiry
      if (new Date() > new Date(downloadToken.expiresAt)) {
        return res.status(410).json({ error: "Download link has expired" });
      }

      // Check download limit (null means unlimited)
      if (downloadToken.downloadsRemaining !== null && downloadToken.downloadsRemaining <= 0) {
        return res.status(410).json({ error: "Download limit reached" });
      }

      const product = await storage.getProduct(downloadToken.productId);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }

      // Get product files
      const productFiles = await storage.getProductFiles(product.id);
      if (!productFiles || productFiles.length === 0) {
        return res.status(404).json({ error: "No files available for download" });
      }

      // Find the requested file (by fileId or default to first file)
      let targetFile = productFiles[0];
      if (fileId && fileId !== "main") {
        const foundFile = productFiles.find(f => f.id === fileId);
        if (!foundFile) {
          return res.status(404).json({ error: "Requested file not found" });
        }
        targetFile = foundFile;
      }

      // Generate signed URL from Supabase Storage
      const { getSecureProductDownloadUrl } = await import("./services/supabase-storage");
      const signedUrlResult = await getSecureProductDownloadUrl(targetFile.fileUrl, 3600);
      
      if (!signedUrlResult.success || !signedUrlResult.signedUrl) {
        return res.status(500).json({ error: "Failed to generate download URL" });
      }

      // Update download count only if limited (null means unlimited)
      if (downloadToken.downloadsRemaining !== null) {
        await storage.updateDownloadToken(downloadToken.id, {
          downloadsRemaining: downloadToken.downloadsRemaining - 1,
          lastDownloadAt: new Date(),
          ipAddress: req.ip || null,
        });
      } else {
        // Just update last download info for unlimited tokens
        await storage.updateDownloadToken(downloadToken.id, {
          lastDownloadAt: new Date(),
          ipAddress: req.ip || null,
        });
      }

      // Redirect to signed URL
      res.redirect(signedUrlResult.signedUrl);
    } catch (error) {
      console.error("Error processing download:", error);
      res.status(500).json({ error: "Download failed" });
    }
  });

  // Customer portal - get purchases
  app.get("/api/customer/purchases", async (req, res) => {
    try {
      const session = (req as any).session;
      const customerId = session?.customerId;
      
      if (!customerId) {
        return res.status(401).json({ error: "Customer not authenticated" });
      }

      const orders = await storage.getOrdersByCustomer(customerId);
      const ordersWithItems = await Promise.all(
        orders.map(async (order) => {
          const items = await storage.getOrderItems(order.id);
          return { ...order, items };
        })
      );

      res.json(ordersWithItems);
    } catch (error) {
      console.error("Error fetching purchases:", error);
      res.status(500).json({ error: "Failed to fetch purchases" });
    }
  });

  // Customer portal - get available downloads
  app.get("/api/customer/downloads", async (req, res) => {
    try {
      const session = (req as any).session;
      const customerId = session?.customerId;
      
      if (!customerId) {
        return res.status(401).json({ error: "Customer not authenticated" });
      }

      const downloads = await storage.getDownloadTokensByCustomer(customerId);
      const downloadsWithProducts = await Promise.all(
        downloads.map(async (dl) => {
          const product = await storage.getProduct(dl.productId);
          return {
            ...dl,
            productName: product?.name,
            productImage: product?.imageUrl,
          };
        })
      );

      res.json(downloadsWithProducts);
    } catch (error) {
      console.error("Error fetching downloads:", error);
      res.status(500).json({ error: "Failed to fetch downloads" });
    }
  });

  // ============ File Upload Routes ============
  
  // Upload product file
  app.post("/api/upload/product-file", async (req, res) => {
    try {
      const userId = await getCurrentUserId(req);
      const { productId, fileName, fileData, mimeType } = req.body;
      
      if (!productId || !fileName || !fileData) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const { uploadProductFile } = await import("./services/supabase-storage");
      const buffer = Buffer.from(fileData, "base64");
      
      const result = await uploadProductFile(userId, productId, buffer, fileName, mimeType || "application/octet-stream");
      
      if (!result.success) {
        return res.status(500).json({ error: result.error || "Upload failed" });
      }

      // Save file reference to database
      const productFile = await storage.createProductFile({
        productId,
        name: fileName,
        fileName,
        fileUrl: result.path!,
        fileSize: buffer.length,
      });

      res.json({ success: true, file: productFile });
    } catch (error) {
      console.error("Error uploading file:", error);
      res.status(500).json({ error: "File upload failed" });
    }
  });

  // Upload media asset
  app.post("/api/upload/media", async (req, res) => {
    try {
      const userId = await getCurrentUserId(req);
      const { fileName, fileData, mimeType, fileType } = req.body;
      
      if (!fileName || !fileData) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const { uploadMediaAsset } = await import("./services/supabase-storage");
      const buffer = Buffer.from(fileData, "base64");
      
      const result = await uploadMediaAsset(userId, buffer, fileName, mimeType || "application/octet-stream");
      
      if (!result.success) {
        return res.status(500).json({ error: result.error || "Upload failed" });
      }

      // Save to media library
      const mediaAsset = await storage.createMediaAsset({
        userId,
        name: fileName,
        fileName,
        fileType: fileType || "document",
        mimeType: mimeType || "application/octet-stream",
        fileSize: buffer.length,
        fileUrl: result.publicUrl || result.path!,
      });

      res.json({ success: true, asset: mediaAsset });
    } catch (error) {
      console.error("Error uploading media:", error);
      res.status(500).json({ error: "Media upload failed" });
    }
  });

  return httpServer;
}

// Helper functions for mock data
function generateMockRevenueData() {
  const data = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    data.push({
      date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      amount: Math.floor(Math.random() * 500) + 100,
    });
  }
  return data;
}

function generateMockOrdersData() {
  const data = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    data.push({
      date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      count: Math.floor(Math.random() * 10) + 1,
    });
  }
  return data;
}

function generateMockCustomersData() {
  const data = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    data.push({
      date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      count: Math.floor(Math.random() * 5) + 1,
    });
  }
  return data;
}
