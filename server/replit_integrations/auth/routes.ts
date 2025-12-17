import type { Express } from "express";
import { authStorage } from "./storage";
import { isAuthenticated } from "./replitAuth";

// Register auth-specific routes
export function registerAuthRoutes(app: Express): void {
  // Get current authenticated user (returns sanitized user data)
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const googleId = req.user.claims.sub;
      const user = await authStorage.getUserByGoogleId(googleId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Return sanitized user object without sensitive fields
      const sanitizedUser = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
        businessName: user.businessName,
        role: user.role,
        planStatus: user.planStatus,
        isActive: user.isActive,
        createdAt: user.createdAt,
      };
      
      res.json(sanitizedUser);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
}
