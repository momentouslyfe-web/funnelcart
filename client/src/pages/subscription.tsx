import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, Crown, Sparkles, ArrowRight, AlertCircle, Calendar, Clock } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import type { SubscriptionPlan } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

function formatDate(dateString: string | undefined | null): string {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getStatusBadgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "active":
      return "default";
    case "trial":
      return "secondary";
    case "cancelled":
    case "past_due":
    case "expired":
      return "destructive";
    default:
      return "outline";
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case "active":
      return "Active";
    case "trial":
      return "Trial";
    case "free":
      return "Free";
    case "cancelled":
      return "Cancelled";
    case "past_due":
      return "Past Due";
    case "expired":
      return "Expired";
    default:
      return status;
  }
}

function CurrentPlanCard() {
  const { user, isLoading: userLoading } = useAuth();
  const { data: plans, isLoading: plansLoading } = useQuery<SubscriptionPlan[]>({
    queryKey: ["/api/public/plans"],
  });

  const isLoading = userLoading || plansLoading;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32 mb-2" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  const planStatus = user?.planStatus || "free";
  const matchedPlan = user?.planId ? plans?.find(p => p.id === user.planId) : null;
  const freePlan = plans?.find(p => p.slug === "free" || Number(p.price) === 0);
  const currentPlan = matchedPlan || (planStatus === "free" ? freePlan : null);
  const isFree = planStatus === "free";
  const isPaid = planStatus === "active" || planStatus === "trial";
  const isExpired = planStatus === "cancelled" || planStatus === "past_due" || planStatus === "expired";
  const displayName = currentPlan?.name || (isFree ? "Free" : isPaid ? "Paid Plan" : planStatus);
  
  // Determine next billing/expiry date
  const expiryDate = user?.planExpiresAt;
  const trialEndDate = user?.trialEndsAt;
  const relevantDate = planStatus === "trial" ? trialEndDate : expiryDate;

  return (
    <Card data-testid="card-current-plan">
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              {isFree ? <Sparkles className="h-5 w-5" /> : <Crown className="h-5 w-5 text-amber-500" />}
              Current Plan
            </CardTitle>
            <CardDescription>Your active subscription details</CardDescription>
          </div>
          <Badge variant={getStatusBadgeVariant(planStatus)} className="text-sm">
            {getStatusLabel(planStatus)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Plan Name and Price */}
        <div>
          <h3 className="text-2xl font-bold">{displayName}</h3>
          {currentPlan && Number(currentPlan.price) > 0 && (
            <p className="text-muted-foreground">
              ${Number(currentPlan.price).toFixed(2)}/{currentPlan.billingPeriod || "month"}
            </p>
          )}
          {isFree && (
            <p className="text-muted-foreground">No charge</p>
          )}
        </div>

        {/* Billing Information */}
        {!isFree && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <Calendar className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Billing Period</p>
                <p className="text-sm text-muted-foreground capitalize">
                  {currentPlan?.billingPeriod || "Monthly"}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <Clock className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">
                  {planStatus === "trial" ? "Trial Ends" : isExpired ? "Expired On" : "Next Billing"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(relevantDate)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Expired Warning */}
        {isExpired && (
          <div className="flex items-start gap-3 p-4 rounded-lg border border-destructive/50 bg-destructive/10">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-destructive">Subscription Expired</p>
              <p className="text-sm text-muted-foreground">
                Your subscription has expired. Your products and funnels are not accessible to customers. 
                Please upgrade to restore access.
              </p>
            </div>
          </div>
        )}

        {/* Plan Features */}
        {currentPlan && (
          <div>
            <p className="text-sm font-medium mb-3">Plan Features</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-green-600 shrink-0" />
                <span>Products: {currentPlan.productLimit || "Unlimited"}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-green-600 shrink-0" />
                <span>Checkout Pages: {currentPlan.checkoutPageLimit || "Unlimited"}</span>
              </div>
              {currentPlan.aiCreditsPerMonth && currentPlan.aiCreditsPerMonth > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-600 shrink-0" />
                  <span>AI Credits: {currentPlan.aiCreditsPerMonth}/month</span>
                </div>
              )}
              {currentPlan.customDomainAllowed && (
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-600 shrink-0" />
                  <span>Custom Domain</span>
                </div>
              )}
              {currentPlan.prioritySupport && (
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-600 shrink-0" />
                  <span>Priority Support</span>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DomainInfoCard() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32 mb-2" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  const subdomain = user?.subdomain || "your-store";
  const customDomain = user?.customDomain;
  const domainVerified = user?.domainVerified;
  // Use app domain for subdomain URLs
  const appDomain = window.location.hostname;

  return (
    <Card data-testid="card-domain-info">
      <CardHeader>
        <CardTitle>Your Store URL</CardTitle>
        <CardDescription>Share this link with your customers</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm font-medium mb-1">Subdomain</p>
          <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
            <code className="text-sm flex-1 truncate">
              {appDomain}/s/{subdomain}
            </code>
            <Button 
              size="sm" 
              variant="ghost"
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/s/${subdomain}`);
              }}
            >
              Copy
            </Button>
          </div>
        </div>

        {customDomain && (
          <div>
            <p className="text-sm font-medium mb-1">Custom Domain</p>
            <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
              <code className="text-sm flex-1 truncate">{customDomain}</code>
              <Badge variant={domainVerified ? "default" : "secondary"}>
                {domainVerified ? "Verified" : "Pending"}
              </Badge>
            </div>
          </div>
        )}

        <p className="text-sm text-muted-foreground">
          Configure your custom domain in Settings to use your own domain.
        </p>
      </CardContent>
    </Card>
  );
}

function UpgradePlansSection() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [upgradingPlanId, setUpgradingPlanId] = useState<string | null>(null);
  const { data: plans, isLoading } = useQuery<SubscriptionPlan[]>({
    queryKey: ["/api/public/plans"],
  });

  const currentPlanId = user?.planId;
  
  // Show paid plans that are different from current plan
  const availablePlans = plans?.filter(p => p.isActive && Number(p.price) > 0) || [];

  const handleUpgrade = async (planId: string) => {
    setUpgradingPlanId(planId);
    try {
      const response = await apiRequest("POST", "/api/payments/subscription/initiate", {
        planId,
      });
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
      } else {
        toast({
          title: "Payment processing",
          description: "Redirecting to payment...",
        });
      }
    } catch (error: any) {
      console.error("Upgrade error:", error);
      toast({
        title: "Upgrade not available",
        description: "Payment system is being set up. Please try again later or contact support.",
        variant: "destructive",
      });
    } finally {
      setUpgradingPlanId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Available Plans</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (availablePlans.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No upgrade plans available at this time.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Available Plans</h2>
        <p className="text-muted-foreground">Upgrade to unlock more features</p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {availablePlans.map((plan) => {
          const price = Number(plan.price);
          const isCurrentPlan = plan.id === currentPlanId;
          const isUpgrading = upgradingPlanId === plan.id;
          
          return (
            <Card key={plan.id} className={isCurrentPlan ? "border-primary" : ""} data-testid={`card-plan-${plan.slug}`}>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle>{plan.name}</CardTitle>
                  {isCurrentPlan && <Badge>Current</Badge>}
                </div>
                {plan.description && (
                  <CardDescription>{plan.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <span className="text-3xl font-bold">${price.toFixed(0)}</span>
                  <span className="text-muted-foreground">/{plan.billingPeriod || "month"}</span>
                </div>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600 shrink-0" />
                    <span>{plan.productLimit || "Unlimited"} Products</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600 shrink-0" />
                    <span>{plan.checkoutPageLimit || "Unlimited"} Checkout Pages</span>
                  </li>
                  {plan.aiCreditsPerMonth && plan.aiCreditsPerMonth > 0 && (
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600 shrink-0" />
                      <span>{plan.aiCreditsPerMonth} AI Credits/month</span>
                    </li>
                  )}
                  {plan.customDomainAllowed && (
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600 shrink-0" />
                      <span>Custom Domain</span>
                    </li>
                  )}
                  {plan.prioritySupport && (
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600 shrink-0" />
                      <span>Priority Support</span>
                    </li>
                  )}
                </ul>
              </CardContent>
              <CardFooter>
                {isCurrentPlan ? (
                  <Button className="w-full" variant="outline" disabled>
                    Current Plan
                  </Button>
                ) : (
                  <Button 
                    className="w-full gap-1" 
                    onClick={() => handleUpgrade(plan.id)}
                    disabled={isUpgrading}
                    data-testid={`button-upgrade-${plan.slug}`}
                  >
                    {isUpgrading ? "Processing..." : `Upgrade to ${plan.name}`}
                    {!isUpgrading && <ArrowRight className="h-4 w-4" />}
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export default function Subscription() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-page-title">Subscription</h1>
        <p className="text-muted-foreground mt-1">
          Manage your subscription plan and billing
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <CurrentPlanCard />
        <DomainInfoCard />
      </div>

      <UpgradePlansSection />
    </div>
  );
}
