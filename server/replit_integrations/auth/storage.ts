import { users, type User, type InsertUser } from "../../../shared/schema";
import { db } from "../../db";
import { eq } from "drizzle-orm";

// UpsertUser type for auth operations
export type UpsertUser = InsertUser;

// Interface for auth storage operations
// (IMPORTANT) These user operations are mandatory for Replit Auth.
export interface IAuthStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
}

class AuthStorage implements IAuthStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.googleId, googleId));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // Try to find existing user by email or googleId
    let existingUser: User | undefined;
    
    if (userData.email) {
      const [user] = await db.select().from(users).where(eq(users.email, userData.email));
      existingUser = user;
    }
    
    if (!existingUser && userData.googleId) {
      const [user] = await db.select().from(users).where(eq(users.googleId, userData.googleId));
      existingUser = user;
    }

    if (existingUser) {
      // Update existing user
      const [updatedUser] = await db
        .update(users)
        .set({
          ...userData,
          lastLoginAt: new Date(),
        })
        .where(eq(users.id, existingUser.id))
        .returning();
      return updatedUser;
    } else {
      // Create new user
      const [newUser] = await db
        .insert(users)
        .values({
          ...userData,
          lastLoginAt: new Date(),
        })
        .returning();
      return newUser;
    }
  }
}

export const authStorage = new AuthStorage();
