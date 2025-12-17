# Design Guidelines: Digital Product Sales Platform

## Design Approach

**Reference-Based: SamCart + Modern E-commerce Best Practices**

Drawing inspiration from SamCart's conversion-optimized design philosophy while incorporating modern web aesthetics from Stripe (clean minimalism), Gumroad (creator-friendly), and Shopify (robust e-commerce).

**Core Principles:**
- Conversion-first: Every element serves to build trust and reduce friction
- Professional credibility: Clean, polished aesthetic that instills confidence
- Visual clarity: Information hierarchy guides users naturally toward action
- Creator empowerment: Dashboard and editor feel powerful yet approachable

---

## Typography

**Font Stack:**
- **Primary:** Inter or DM Sans via Google Fonts (clean, professional, excellent readability)
- **Accent:** Space Grotesk for headings in marketing contexts (adds personality without sacrificing clarity)

**Type Scale:**
- Hero Headlines: text-5xl to text-6xl, font-bold
- Section Headers: text-3xl to text-4xl, font-semibold
- Subsections: text-xl to text-2xl, font-medium
- Body Text: text-base, regular weight, leading-relaxed
- Labels/Meta: text-sm, font-medium
- Micro-copy: text-xs

**Hierarchy Implementation:**
- Checkout pages: Larger type (trust-building), generous line-height
- Dashboards: Compact, information-dense but scannable
- Editors: Clear labels, medium weight for all interactive elements

---

## Layout System

**Spacing Primitives (Tailwind units):**
- Micro: 2, 4 (component internal spacing)
- Standard: 6, 8 (component padding, gaps)
- Section: 12, 16, 20 (vertical rhythm)
- Hero: 24, 32 (major section separation)

**Grid System:**
- Checkout Pages: Single column flow (max-w-2xl centered) with occasional 2-column splits for comparison
- Product Dashboard: 12-column grid, cards in 3-4 column layouts (grid-cols-1 md:grid-cols-2 lg:grid-cols-3)
- Visual Editor: Split view - 40% sidebar, 60% live preview
- Analytics: Mixed layouts - KPI cards in 4-column grid, charts full-width below

**Container Widths:**
- Checkout flows: max-w-2xl (focused, distraction-free)
- Dashboards: max-w-7xl (utilize screen real estate)
- Marketing pages: max-w-6xl with full-width hero sections
- Modals/Editors: max-w-4xl to max-w-5xl

---

## Component Library

### Navigation & Structure

**Main Dashboard Header:**
- Full-width, border-b, bg-white with shadow-sm
- Logo left, primary navigation center, user menu + notifications right
- Height: h-16, px-6
- Sticky positioning on scroll

**Sidebar Navigation (Editor/Settings):**
- w-64 fixed, full-height
- Hierarchical menu structure with icons
- Collapsible sections, active state with subtle bg highlight

### Forms & Inputs

**Input Fields:**
- Consistent h-12 height, rounded-lg borders
- Focus states: ring-2 with brand color
- Labels above inputs (text-sm font-medium mb-2)
- Helper text below (text-xs text-gray-600)
- Error states: border-red-500 with error message

**Buttons:**
- Primary CTA: Larger (h-12 to h-14), bold, full-width on mobile
- Secondary: Outline style, same height as primary
- Tertiary: Text-only with hover underline
- Icon buttons: Square (h-10 w-10), rounded-lg
- Disabled state: Reduced opacity (0.5), cursor-not-allowed

### Product Cards (Dashboard)

- Card container: p-6, rounded-xl, border or shadow-md
- Product image: aspect-square or 4:3, rounded-lg, mb-4
- Title: text-lg font-semibold, mb-2
- Price: text-2xl font-bold, primary color
- Metadata row: Flex layout, text-sm, muted color
- Action buttons: Bottom of card, gap-2

### Checkout Components

**Pricing Display:**
- Large, bold pricing (text-4xl font-bold)
- Strike-through original price if discounted
- Savings badge (bg-green-100 text-green-800 rounded-full px-3 py-1)

**Order Summary:**
- Sticky sidebar or fixed bottom on mobile
- Line items with quantity, price
- Subtotal, discount, total with visual hierarchy
- Total emphasized (text-2xl font-bold)

**Trust Signals:**
- Payment icons row (Visa, Mastercard, etc.)
- Security badge ("Secure Checkout" with lock icon)
- Money-back guarantee badge
- Small text: "Processed by UddoktaPay"

**Order Bumps:**
- Bordered box (border-2), rounded-lg, p-4
- Checkbox input with label inline
- Product thumbnail left, details right (2-column on desktop)
- Add/save price highlighted (text-green-600 font-semibold)

### Drag-and-Drop Editor

**Component Palette:**
- Left sidebar with categorized blocks
- Icons for each block type
- Drag handles (⋮⋮ icon), hover states
- Preview thumbnails for templates

**Canvas Area:**
- Checkerboard background to indicate editing mode
- Component outlines on hover (border-2 border-dashed border-blue-400)
- Selected state: border-2 border-solid border-blue-600
- Floating toolbar on selection (delete, duplicate, settings)

**Block Components:**
- Text blocks: Various heading levels, paragraph, list
- Image blocks: Upload area, size controls, alignment
- Button blocks: Text, link, style customization
- Pricing table: Columns, rows, highlight column
- Testimonial: Avatar, quote, name/title
- Countdown timer: Visual digits, configurable end time

### Data Visualization (Analytics)

**KPI Cards:**
- White bg, shadow-sm, rounded-xl, p-6
- Large metric (text-3xl font-bold)
- Label above (text-sm text-gray-600)
- Trend indicator (▲ green or ▼ red with percentage)

**Charts:**
- Clean, minimal styling
- Grid lines: subtle gray (opacity-20)
- Data colors: Brand color with varying opacity for multiple series
- Tooltips on hover with precise values

### Customer Portal

**Product Library Grid:**
- Cards with product cover image
- Download button prominent (primary style)
- Download count/limit indicator
- Expiration date if applicable

---

## Page-Specific Layouts

### Checkout Pages (The Core Product)

**Structure:**
1. **Header:** Minimal branding, progress indicator (if multi-step)
2. **Hero Product Section:**
   - Product image/mockup left (40%)
   - Product details right (60%): title, description, pricing
   - CTA button: Large, contrasting, with urgency text ("Get Instant Access")
3. **Order Bump Section:** Immediately after hero
4. **Payment Form:** Full-width single column, clear field labels
5. **Order Summary:** Sticky right sidebar on desktop, accordion on mobile
6. **Trust Footer:** Payment icons, security badges, guarantee

**Mobile:** Stack everything, sticky CTA button at bottom

### Product Dashboard

**Grid Layout:**
- Filter/sort bar at top (h-16, flex justify-between)
- Product cards in responsive grid (3-4 columns desktop, 1 mobile)
- Empty state: Centered message with "Create First Product" CTA
- Pagination or infinite scroll at bottom

### Visual Page Editor

**Three-Column Split:**
1. **Left Sidebar (20%):** Component palette, collapsible categories
2. **Center Canvas (55%):** Live preview with component outlines
3. **Right Panel (25%):** Properties inspector for selected component

**Top Bar:**
- Template name input (editable)
- Save, Preview, Publish buttons (right-aligned)
- Device switcher (desktop/tablet/mobile icons)

### Analytics Dashboard

**Layout Flow:**
1. **Date Range Picker:** Top-right
2. **KPI Row:** 4-column grid of key metrics
3. **Revenue Chart:** Full-width, 2/3 height
4. **Conversion Funnel:** Below chart, 3-column breakdown
5. **Top Products Table:** Full-width, alternating row bg

---

## Images

### Hero Sections
**Checkout Pages:** Yes, large hero image
- Product mockup or lifestyle image showing the ebook/digital product
- Aspect ratio: 16:9 or 4:3
- Placement: Left or right 40-50% of hero section
- Quality: High-resolution, professional photography or 3D renders

### Dashboard Areas
**Product Cards:** Thumbnail images
- Square or 4:3 aspect ratio
- Rounded corners (rounded-lg)
- Fallback: Gradient with product type icon if no image

**Empty States:** Illustration or icon
- Centered, max-width of 400px
- Playful but professional style

### Marketing Pages (if built)
**Hero:** Full-width background image with overlay
- Dark overlay (bg-black/50) for text contrast
- Minimum height: 70vh
- Buttons with backdrop-blur-sm bg-white/20

**Feature Sections:** Icons or small illustrative images
- Icons: 64x64 to 96x96
- Illustrations: Support points, not decorative

---

## Visual Hierarchy Patterns

**Emphasis Order:**
1. Primary CTA buttons (largest, highest contrast)
2. Pricing/value proposition (bold, large type)
3. Product imagery (visual anchor)
4. Supporting copy (readable but secondary)
5. Trust signals (present but understated)

**Spacing Rhythm:**
- Tight clustering for related elements (gap-2 to gap-4)
- Medium separation between sections (py-12 to py-16)
- Large breathing room around CTAs (my-8 to my-12)

**Call-to-Action Placement:**
- Above the fold on checkout pages
- Repeated after key information blocks
- Persistent/sticky on mobile during scroll
- Always visible in viewport on payment forms

---

This platform prioritizes **conversion psychology** through visual trust-building, clear value communication, and frictionless user flows. Every design decision should ask: "Does this help users confidently complete their purchase?"