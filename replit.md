# DigitalCart - Digital Product Sales Platform

## Overview

DigitalCart is a conversion-optimized digital product sales platform designed for creators to sell ebooks and digital products. The platform provides customizable checkout pages, order management, customer analytics, and email automation. Built with a modern full-stack architecture, it emphasizes clean design, professional credibility, and conversion-first principles inspired by SamCart's approach to e-commerce.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System:**
- React 18+ with TypeScript for type-safe component development
- Vite for fast development builds and HMR (Hot Module Replacement)
- Wouter for lightweight client-side routing
- TanStack Query (React Query) for server state management with optimistic updates

**UI Component System:**
- Radix UI primitives for accessible, unstyled components
- shadcn/ui design system built on Radix with Tailwind CSS
- Class Variance Authority (CVA) for component variant management
- Custom theming system supporting light/dark modes with CSS variables

**Design Philosophy:**
- Conversion-first approach prioritizing trust and reduced friction
- Typography: Inter/DM Sans for primary text, Space Grotesk for accents
- Spacing system based on Tailwind's 4px base unit (2, 4, 6, 8, 12, 16, 20, 24, 32)
- Responsive grid layouts: single-column checkout, 3-4 column dashboards
- Visual editor with 40/60 split view for live preview

**Form Handling:**
- React Hook Form with Zod schema validation
- @hookform/resolvers for seamless integration
- Client-side validation with server-side verification

### Backend Architecture

**Server Framework:**
- Express.js with TypeScript for API routes
- HTTP server using Node's native `createServer`
- RESTful API design with `/api/*` namespacing
- Demo user mode for development (demo@example.com)

**Database Layer:**
- Drizzle ORM with PostgreSQL dialect for type-safe database queries
- Schema-first design with Zod validation integration (drizzle-zod)
- Migration system via drizzle-kit
- Connection pooling with node-postgres (pg)

**Database Schema Design:**
- Users: Store owners with business settings, payment credentials, branding
- Products: Digital goods with pricing, files, download limits, activation status
- Checkout Pages: Customizable templates with JSON block-based content system
- Funnels: Sales funnels containing multiple pages with AI generation support
- Funnel Pages: Individual pages within funnels (landing, sales, checkout, thank-you, upsell, downsell)
- Order Bumps & Upsells: Conversion optimization features
- Coupons: Discount codes with usage limits and expiration
- Customers: Buyer information with order history tracking
- Orders & Order Items: Transaction records with line items
- Abandoned Carts: Recovery tracking for incomplete purchases
- Email Templates: Customizable transactional emails
- Pixel Events: Analytics and conversion tracking (Facebook Pixel)

**Session & Authentication:**
- Two separate authentication systems:
  1. **Seller Authentication (Supabase Auth):**
     - Google OAuth via Supabase for sellers/merchants
     - Requires VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables
     - Frontend uses @supabase/supabase-js for OAuth flow
     - Backend verifies JWT tokens and creates/updates user records
     - Auth routes: /api/auth/session, /api/auth/supabase-callback, /api/auth/logout
  2. **Admin Authentication (Environment Variables):**
     - Email/password login via ADMIN_EMAIL and ADMIN_PASSWORD secrets
     - Separate from seller auth, uses session-based authentication
     - Auth routes: /api/admin/login, /api/admin/logout
- Express-session with PostgreSQL session storage (sessions table)
- useAuth hook for React components
- Demo mode fallback for development when not authenticated
- Sanitized user responses (excludes passwords and sensitive data)

**Supabase Auth Setup:**
1. Create a Supabase project at https://supabase.com
2. Enable Google provider in Authentication > Providers
3. Configure OAuth credentials in Google Cloud Console
4. Set redirect URL to: https://YOUR_PROJECT.supabase.co/auth/v1/callback
5. Add environment variables:
   - VITE_SUPABASE_URL: Your Supabase project URL (e.g., https://xxx.supabase.co)
   - VITE_SUPABASE_ANON_KEY: Your Supabase anon/public key

**API Design Patterns:**
- Resource-based endpoints (GET /api/products, POST /api/orders)
- Consistent error handling with try-catch blocks
- JSON request/response format
- Query invalidation via TanStack Query for cache management

### Data Storage Solutions

**Primary Database:**
- PostgreSQL for relational data storage
- UUID primary keys (gen_random_uuid())
- JSONB columns for flexible schema (blocks, customStyles, pixelData)
- Decimal type for currency (precision: 10, scale: 2)
- Timestamp tracking for created_at/updated_at fields

**Database Options:**
- **Supabase (current):** Using `SUPABASE_DATABASE_URL` secret for Supabase PostgreSQL
  - Connection: Transaction pooler (port 6543) with SSL enabled
  - SSL handling: sslmode parameter auto-removed, using pg ssl config
- **Replit PostgreSQL:** Falls back to built-in `DATABASE_URL` when Supabase is not configured
- **Firebase Firestore:** Set `DATABASE_TYPE=firebase` to use Firebase (requires `FIREBASE_SERVICE_ACCOUNT_KEY`)
- IStorage interface abstraction for database-agnostic operations
- Drizzle ORM with automatic schema migrations via `npx drizzle-kit push`

**Supabase Connection Notes:**
- Pooler URL format: `postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres`
- Special characters in password must be URL-encoded (% → %25, # → %23, ! → %21)
- Both server/db.ts and drizzle.config.ts auto-strip sslmode query param and use pg SSL config

**File Storage:**
- Product images and digital files via URL references
- File metadata tracking (fileName, fileSize)
- Download limit enforcement per product

### External Dependencies

**Payment Processing:**
- Two-tier UddoktaPay integration (Bangladesh-focused payment gateway):
  1. **Platform Level (Admin):** Collects subscription payments FROM sellers
     - Platform payment gateways table (platform_payment_gateways)
     - Admin UI in Settings > Payment tab to configure gateways
     - Subscription payment flow: /api/payments/subscription/initiate, /callback, /webhook
     - Seller payments tracked in seller_payments table
  2. **Seller Level:** Each seller configures their own UddoktaPay to collect from customers
     - Per-user API credentials (uddoktapayApiKey, uddoktapayApiUrl)
- Support for test mode and multiple currencies (default: BDT)
- Webhook handling for payment status updates

**Email Services:**
- Dual transport support: SMTP (manual config) and SendGrid API
- Template system for order confirmations, digital delivery, abandoned cart recovery
- Invoice generation with professional HTML templates
- Admin notifications for new orders and signups
- Seller notifications for sales events
- Customer emails with download links and receipts
- Variable substitution with {{variable}} syntax
- Fallback logging mode when no transport configured

**Analytics & Tracking:**
- Facebook Pixel integration for conversion tracking (client & server-side)
- Server-side Conversions API with hashed user data (SHA256)
- Pixel event storage with JSON metadata in database
- Custom event tracking support
- Access token management for Facebook Conversions API
- Client script generation endpoint for checkout pages

**AI Page Builder:**
- OpenAI GPT-4 integration for content generation
- Template-based page building system
- Block-based content structure (header, testimonials, FAQ, pricing, features)
- Customizable style presets
- User-provided API key support

**Cart Abandonment Recovery:**
- In-memory cart tracking with timestamps
- Configurable email sequences
- Periodic processing (every 5 minutes)
- Automatic recovery email sending
- Cart recovery URL generation

**Media Library:**
- Media asset management (images, videos, documents, audio)
- Grid and list view modes
- File type filtering and search
- URL-based file references
- Copy-to-clipboard functionality

**Design System:**
- Google Fonts: Inter, DM Sans, Space Grotesk, Fira Code, Geist Mono
- Tailwind CSS v3+ for utility-first styling
- PostCSS with Autoprefixer for cross-browser compatibility

**Charting & Visualization:**
- Recharts for revenue analytics, product performance, order trends
- Responsive chart containers for dashboard widgets
- Support for area charts, bar charts, pie charts, and line charts

**Development Tools:**
- Replit-specific plugins: cartographer, dev-banner, runtime-error-modal
- ESBuild for production bundling with dependency allowlisting
- TypeScript strict mode with path aliases (@/, @shared/, @assets/)

**Build & Deployment:**
- Production builds combine Vite (client) + ESBuild (server)
- Single output directory (dist/) with public/ subfolder for static assets
- Server bundling with selective external dependencies to reduce cold start times
- Allowlisted dependencies for bundling include: drizzle-orm, express, passport, stripe, axios, openai

### Vercel Deployment (Production)

**Serverless Architecture:**
- Application is configured for Vercel serverless deployment
- API routes consolidated in `/api/index.ts` as a single Express handler
- JWT-based authentication using Supabase tokens (no sessions for serverless compatibility)
- Database connection pooling optimized for serverless (max: 1 connection in production)

**Vercel Configuration (vercel.json):**
- Vite frontend builds to `dist/public/` and serves as static files
- All `/api/*` routes handled by the serverless function
- CORS headers configured for cross-origin requests
- Node.js 20 runtime for API functions

**Deployment Steps:**
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard:
   - DATABASE_URL (Supabase PostgreSQL connection string)
   - VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY (Supabase project credentials)
   - ADMIN_EMAIL, ADMIN_PASSWORD (Admin panel access)
   - SUPABASE_SERVICE_ROLE_KEY (for server-side operations)
   - Optional: AI provider keys, payment gateway credentials
3. Deploy using `vercel` CLI or automatic GitHub integration
4. Build command: `npm run build:vercel`
5. Output directory: `dist/public`

**Authentication for Vercel:**
- Frontend includes Supabase access token in Authorization header for all API requests
- Serverless function validates tokens via Supabase Admin SDK
- No server-side sessions (stateless JWT authentication)
- Admin login uses environment variable credentials (ADMIN_EMAIL/ADMIN_PASSWORD)