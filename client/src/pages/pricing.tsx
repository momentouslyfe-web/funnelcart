import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { ShoppingCart, Check, ArrowRight, Sparkles } from "lucide-react";
import type { SubscriptionPlan } from "@shared/schema";

export default function Pricing() {
  const { data: plans, isLoading } = useQuery<SubscriptionPlan[]>({
    queryKey: ["/api/public/plans"],
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <ShoppingCart className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">DigitalCart</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost" data-testid="button-login">Log In</Button>
            </Link>
            <Link href="/signup">
              <Button data-testid="button-signup">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Pricing Header */}
      <section className="py-16 text-center">
        <div className="container mx-auto px-4">
          <Badge variant="secondary" className="mb-4">
            <Sparkles className="w-3 h-3 mr-1" />
            Simple, Transparent Pricing
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Start free and scale as you grow. All plans include our core features.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-20">
        <div className="container mx-auto px-4">
          {isLoading ? (
            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-24 mb-2" />
                    <Skeleton className="h-10 w-32" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-3/4 mb-4" />
                    <div className="space-y-2">
                      {[1, 2, 3, 4].map((j) => (
                        <Skeleton key={j} className="h-4 w-full" />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {/* Dynamic Plans from API - all plans come from admin dashboard */}
              {plans?.filter(p => p.isActive).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)).map((plan, index, arr) => {
                // Mark the middle plan as popular (typically the Starter plan)
                const isPopular = arr.length >= 3 ? index === 1 : index === 0;
                const features = Array.isArray(plan.features) ? plan.features : [];
                const isFree = Number(plan.price) === 0;
                
                return (
                  <Card 
                    key={plan.id} 
                    className={`relative ${isPopular ? 'border-primary shadow-lg' : ''}`}
                    data-testid={`card-plan-${plan.slug}`}
                  >
                    {isPopular && (
                      <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                        Most Popular
                      </Badge>
                    )}
                    <CardHeader>
                      <CardTitle>{plan.name}</CardTitle>
                      <CardDescription>{plan.description}</CardDescription>
                      <div className="mt-4">
                        <span className="text-4xl font-bold">
                          ${Number(plan.price).toFixed(0)}
                        </span>
                        <span className="text-muted-foreground">
                          /{plan.billingPeriod === "yearly" ? "year" : "month"}
                        </span>
                      </div>
                      {plan.trialEnabled && plan.trialDays && plan.trialDays > 0 && (
                        <Badge variant="secondary" className="mt-2">
                          {plan.trialDays}-day free trial
                        </Badge>
                      )}
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3">
                        {plan.productLimit && (
                          <li className="flex items-center gap-2 text-sm">
                            <Check className="w-4 h-4 text-primary shrink-0" />
                            Up to {plan.productLimit} products
                          </li>
                        )}
                        {plan.checkoutPageLimit && (
                          <li className="flex items-center gap-2 text-sm">
                            <Check className="w-4 h-4 text-primary shrink-0" />
                            {plan.checkoutPageLimit} checkout pages
                          </li>
                        )}
                        {plan.aiCreditsPerMonth && plan.aiCreditsPerMonth > 0 && (
                          <li className="flex items-center gap-2 text-sm">
                            <Check className="w-4 h-4 text-primary shrink-0" />
                            {plan.aiCreditsPerMonth} AI credits/month
                          </li>
                        )}
                        {plan.customDomainAllowed && (
                          <li className="flex items-center gap-2 text-sm">
                            <Check className="w-4 h-4 text-primary shrink-0" />
                            Custom domain
                          </li>
                        )}
                        {plan.prioritySupport && (
                          <li className="flex items-center gap-2 text-sm">
                            <Check className="w-4 h-4 text-primary shrink-0" />
                            Priority support
                          </li>
                        )}
                        {features.map((feature, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm">
                            <Check className="w-4 h-4 text-primary shrink-0" />
                            {String(feature)}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                    <CardFooter>
                      <Link href={`/signup?plan=${plan.slug}`} className="w-full">
                        <Button 
                          className="w-full gap-2" 
                          variant={isPopular ? "default" : "outline"}
                          data-testid={`button-select-${plan.slug}`}
                        >
                          {isFree ? "Get Started Free" : plan.trialEnabled ? "Start Free Trial" : "Get Started"}
                          <ArrowRight className="w-4 h-4" />
                        </Button>
                      </Link>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-6">
            {[
              {
                q: "Can I change plans later?",
                a: "Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately."
              },
              {
                q: "What payment methods do you accept?",
                a: "We accept payments via UddoktaPay, supporting various local and international payment methods."
              },
              {
                q: "Is there a free trial?",
                a: "Yes, our paid plans come with a free trial period. You can try all features before committing."
              },
              {
                q: "Do my customers need to create accounts?",
                a: "No! Customers can download their purchases directly from the thank-you page or via email - no login required."
              }
            ].map((faq, index) => (
              <div key={index} data-testid={`faq-${index}`}>
                <h3 className="font-semibold mb-2">{faq.q}</h3>
                <p className="text-muted-foreground">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            <span className="font-semibold">DigitalCart</span>
          </div>
          <p className="text-sm text-muted-foreground">
            2024 DigitalCart. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
