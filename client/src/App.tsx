import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AdminSidebar } from "@/components/admin-sidebar";
import { CustomerSidebar } from "@/components/customer-sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { Skeleton } from "@/components/ui/skeleton";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Subscription from "@/pages/subscription";
import Products from "@/pages/products";
import ProductForm from "@/pages/product-form";
import CheckoutPages from "@/pages/checkout-pages";
import CheckoutPageForm from "@/pages/checkout-page-form";
import PageEditor from "@/pages/page-editor";
import Orders from "@/pages/orders";
import Customers from "@/pages/customers";
import Coupons from "@/pages/coupons";
import EmailTemplates from "@/pages/email-templates";
import Analytics from "@/pages/analytics";
import Settings from "@/pages/settings";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminUsers from "@/pages/admin/users";
import AdminPlans from "@/pages/admin/plans";
import AdminSettings from "@/pages/admin/settings";
import AdminAISettings from "@/pages/admin/ai-settings";
import MediaLibrary from "@/pages/media-library";
import Funnels from "@/pages/funnels";
import FunnelEditor from "@/pages/funnel-editor";
import CustomerPortal from "@/pages/customer/portal";
import CustomerDownloads from "@/pages/customer/downloads";
import CustomerAccount from "@/pages/customer/account";
import Landing from "@/pages/landing";
import Pricing from "@/pages/pricing";
import Login from "@/pages/login";
import Signup from "@/pages/signup";
import AdminLogin from "@/pages/admin-login";
import ThankYou from "@/pages/thank-you";
import AuthCallback from "@/pages/auth-callback";

interface AuthState {
  isAuthenticated: boolean;
  user?: {
    id: string;
    email: string;
    role: string;
    firstName?: string;
    lastName?: string;
    businessName?: string;
  };
  isAdmin?: boolean;
}

function useAuth() {
  return useQuery<AuthState>({
    queryKey: ["/api/auth/session"],
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

function SellerRouter() {
  return (
    <Switch>
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/subscription" component={Subscription} />
      <Route path="/products" component={Products} />
      <Route path="/products/new" component={ProductForm} />
      <Route path="/products/:id" component={ProductForm} />
      <Route path="/funnels" component={Funnels} />
      <Route path="/funnels/:id" component={FunnelEditor} />
      <Route path="/checkout-pages" component={CheckoutPages} />
      <Route path="/checkout-pages/new" component={CheckoutPageForm} />
      <Route path="/checkout-pages/:id/editor" component={PageEditor} />
      <Route path="/orders" component={Orders} />
      <Route path="/customers" component={Customers} />
      <Route path="/coupons" component={Coupons} />
      <Route path="/email-templates" component={EmailTemplates} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/media-library" component={MediaLibrary} />
      <Route path="/settings" component={Settings} />
      <Route path="/">
        <Redirect to="/dashboard" />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function AdminRouter() {
  return (
    <Switch>
      <Route path="/admin/users" component={AdminUsers} />
      <Route path="/admin/plans" component={AdminPlans} />
      <Route path="/admin/settings" component={AdminSettings} />
      <Route path="/admin/ai-settings" component={AdminAISettings} />
      <Route path="/admin" component={AdminDashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function CustomerRouter() {
  return (
    <Switch>
      <Route path="/account" component={CustomerPortal} />
      <Route path="/account/downloads" component={CustomerDownloads} />
      <Route path="/account/settings" component={CustomerAccount} />
      <Route component={NotFound} />
    </Switch>
  );
}

function PublicRouter() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/auth/callback" component={AuthCallback} />
      <Route path="/thank-you/:token" component={ThankYou} />
      <Route path="/account" component={CustomerPortal} />
      <Route path="/account/downloads" component={CustomerDownloads} />
      <Route component={NotFound} />
    </Switch>
  );
}

function SellerLayout() {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex flex-col flex-1 overflow-hidden">
          <header className="flex h-14 items-center justify-between gap-4 border-b px-4 shrink-0">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto p-6">
            <SellerRouter />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

function AdminLayout() {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <AdminSidebar />
        <SidebarInset className="flex flex-col flex-1 overflow-hidden">
          <header className="flex h-14 items-center justify-between gap-4 border-b px-4 shrink-0">
            <SidebarTrigger data-testid="button-admin-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto p-6">
            <AdminRouter />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

function CustomerLayout() {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <CustomerSidebar />
        <SidebarInset className="flex flex-col flex-1 overflow-hidden">
          <header className="flex h-14 items-center justify-between gap-4 border-b px-4 shrink-0">
            <SidebarTrigger data-testid="button-customer-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto p-6">
            <CustomerRouter />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

function LoadingScreen() {
  return (
    <div className="h-screen w-full flex items-center justify-center">
      <div className="space-y-4 text-center">
        <Skeleton className="h-12 w-12 rounded-full mx-auto" />
        <Skeleton className="h-4 w-32 mx-auto" />
      </div>
    </div>
  );
}

function AppLayout() {
  const [location] = useLocation();
  const { data: auth, isLoading } = useAuth();

  // Public routes that don't require authentication
  const publicPaths = ["/", "/pricing", "/login", "/signup", "/admin/login", "/auth/callback"];
  const isPublicPath = publicPaths.includes(location) || 
                       location.startsWith("/thank-you/") ||
                       location.startsWith("/checkout/");

  // Show loading while checking auth
  if (isLoading && !isPublicPath) {
    return <LoadingScreen />;
  }

  // Public pages - always accessible
  if (isPublicPath && (!auth?.isAuthenticated || location === "/" || location === "/pricing")) {
    // If on landing/pricing while logged in, still show public page
    // but if on login/signup while logged in, redirect
    if (auth?.isAuthenticated && (location === "/login" || location === "/signup")) {
      if (auth.user?.role === "super_admin" || auth.user?.role === "admin" || auth.isAdmin) {
        return <Redirect to="/admin" />;
      }
      return <Redirect to="/dashboard" />;
    }
    return <PublicRouter />;
  }

  // Admin routes - require admin authentication
  if (location.startsWith("/admin")) {
    if (!auth?.isAuthenticated && !auth?.isAdmin) {
      return <Redirect to="/admin/login" />;
    }
    if (auth?.user?.role !== "super_admin" && auth?.user?.role !== "admin" && !auth?.isAdmin) {
      return <Redirect to="/dashboard" />;
    }
    return <AdminLayout />;
  }

  // Customer routes
  if (location.startsWith("/account")) {
    return <CustomerLayout />;
  }

  // Seller routes - require seller authentication
  if (!auth?.isAuthenticated) {
    return <Redirect to="/login" />;
  }

  // Redirect root to dashboard for authenticated sellers
  if (location === "/") {
    return <Redirect to="/dashboard" />;
  }

  return <SellerLayout />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <AppLayout />
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
