import type { Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import type { User, Customer } from "../../shared/schema";

export interface AuthenticatedRequest extends Request {
  sellerUser?: User;
  customerUser?: Customer;
  sellerId?: string;
  customerId?: string;
  sellerRole?: string;
}

const DEMO_USER_ID = "demo-user-id";

async function getCurrentUser(req: Request): Promise<User | undefined> {
  const session = (req as any).session;
  
  if (session?.userId) {
    return storage.getUser(session.userId);
  }

  if (session?.passport?.user) {
    const replitId = session.passport.user;
    const users = await storage.getAllUsers();
    return users.find((u) => u.googleId === replitId || u.email === replitId);
  }

  if (process.env.NODE_ENV === "development") {
    const users = await storage.getAllUsers();
    if (users.length > 0) {
      return users[0];
    }
    const newUser = await storage.createUser({
      email: "demo@example.com",
      businessName: "Demo Store",
      firstName: "Demo",
      lastName: "User",
      role: "seller",
    });
    return newUser;
  }

  return undefined;
}

async function getCurrentCustomer(req: Request): Promise<Customer | undefined> {
  const session = (req as any).session;
  
  if (session?.customerId) {
    return storage.getCustomer(session.customerId);
  }

  return undefined;
}

export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  getCurrentUser(req)
    .then((user) => {
      if (!user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      req.sellerUser = user;
      req.sellerId = user.id;
      req.sellerRole = user.role || "seller";
      next();
    })
    .catch((error) => {
      console.error("Auth error:", error);
      res.status(500).json({ message: "Authentication error" });
    });
}

export function requireSeller(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  getCurrentUser(req)
    .then((user) => {
      if (!user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      if (user.role !== "seller" && user.role !== "admin" && user.role !== "super_admin") {
        return res.status(403).json({ message: "Seller access required" });
      }
      req.sellerUser = user;
      req.sellerId = user.id;
      req.sellerRole = user.role || "seller";
      next();
    })
    .catch((error) => {
      console.error("Auth error:", error);
      res.status(500).json({ message: "Authentication error" });
    });
}

export function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  getCurrentUser(req)
    .then((user) => {
      if (!user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      if (user.role !== "admin" && user.role !== "super_admin") {
        return res.status(403).json({ message: "Admin access required" });
      }
      req.sellerUser = user;
      req.sellerId = user.id;
      req.sellerRole = user.role || "admin";
      next();
    })
    .catch((error) => {
      console.error("Auth error:", error);
      res.status(500).json({ message: "Authentication error" });
    });
}

export function requireSuperAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  getCurrentUser(req)
    .then((user) => {
      if (!user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      if (user.role !== "super_admin") {
        return res.status(403).json({ message: "Super admin access required" });
      }
      req.sellerUser = user;
      req.sellerId = user.id;
      req.sellerRole = "super_admin";
      next();
    })
    .catch((error) => {
      console.error("Auth error:", error);
      res.status(500).json({ message: "Authentication error" });
    });
}

export function requireCustomer(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  getCurrentCustomer(req)
    .then((customer) => {
      if (!customer) {
        return res.status(401).json({ message: "Customer authentication required" });
      }
      req.customerUser = customer;
      req.customerId = customer.id;
      next();
    })
    .catch((error) => {
      console.error("Customer auth error:", error);
      res.status(500).json({ message: "Authentication error" });
    });
}

export { getCurrentUser, getCurrentCustomer };
