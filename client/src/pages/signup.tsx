import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { ShoppingCart, Check, Loader2 } from "lucide-react";
import { SiGoogle } from "react-icons/si";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { signInWithGoogle } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import type { SubscriptionPlan } from "@shared/schema";

export default function Signup() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const searchParams = new URLSearchParams(window.location.search);
  const selectedPlanSlug = searchParams.get("plan");

  const { data: plans, isLoading: plansLoading } = useQuery<SubscriptionPlan[]>({
    queryKey: ["/api/public/plans"],
  });

  const selectedPlan = plans?.find(p => p.slug === selectedPlanSlug);
  const freePlan = plans?.find(p => p.slug === "free" || Number(p.price) === 0);
  const displayPlan = selectedPlan || freePlan;

  const handleGoogleSignup = async () => {
    if (selectedPlanSlug) {
      sessionStorage.setItem("selectedPlan", selectedPlanSlug);
    }
    setIsLoading(true);
    try {
      await signInWithGoogle();
    } catch (error: any) {
      toast({
        title: "Sign up failed",
        description: error.message || "Failed to sign up with Google",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const getPlanFeatures = (plan: SubscriptionPlan | undefined) => {
    if (!plan) {
      return [
        "Create digital products",
        "Customizable checkout pages",
        "Instant file delivery",
        "Customer analytics",
        "Email automation"
      ];
    }

    const features: string[] = [];
    
    if (plan.productLimit) {
      features.push(`Up to ${plan.productLimit} products`);
    } else {
      features.push("Unlimited products");
    }
    
    if (plan.checkoutPageLimit) {
      features.push(`Up to ${plan.checkoutPageLimit} checkout pages`);
    } else {
      features.push("Unlimited checkout pages");
    }
    
    features.push("Instant file delivery");
    features.push("Customer analytics");
    
    if (plan.aiCreditsPerMonth && plan.aiCreditsPerMonth > 0) {
      features.push(`${plan.aiCreditsPerMonth} AI credits per month`);
    }
    
    if (plan.customDomainAllowed) {
      features.push("Custom domain support");
    }
    
    if (plan.prioritySupport) {
      features.push("Priority support");
    }
    
    return features;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <nav className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <ShoppingCart className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">DigitalCart</span>
          </Link>
          <Link href="/login">
            <Button variant="ghost">Already have an account?</Button>
          </Link>
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <Card data-testid="card-signup">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Create Your Account</CardTitle>
              <CardDescription>
                Start selling digital products in minutes
              </CardDescription>
              {displayPlan && (
                <div className="mt-3 space-y-1">
                  <Badge variant={Number(displayPlan.price) > 0 ? "default" : "secondary"}>
                    {displayPlan.name} Plan
                  </Badge>
                  {Number(displayPlan.price) > 0 ? (
                    <p className="text-sm text-muted-foreground">
                      ${Number(displayPlan.price).toFixed(2)}/{displayPlan.billingPeriod || "month"}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">Free forever</p>
                  )}
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={handleGoogleSignup}
                className="w-full gap-2"
                size="lg"
                disabled={isLoading}
                data-testid="button-google-signup"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <SiGoogle className="w-4 h-4" />
                )}
                Sign up with Google
              </Button>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    What you get
                  </span>
                </div>
              </div>

              {plansLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-5 w-full" />
                  ))}
                </div>
              ) : (
                <ul className="space-y-2">
                  {getPlanFeatures(displayPlan).map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              )}

              <p className="text-center text-xs text-muted-foreground pt-4">
                By signing up, you agree to our Terms of Service and Privacy Policy.
              </p>
            </CardContent>
          </Card>

          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
