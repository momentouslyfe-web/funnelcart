import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { 
  Zap, ShoppingCart, FileText, Mail, BarChart3, 
  CreditCard, Sparkles, Globe, Shield, Users,
  ArrowRight, CheckCircle2, Star, Check
} from "lucide-react";
import type { SubscriptionPlan } from "@shared/schema";

const features = [
  {
    icon: ShoppingCart,
    title: "High-Converting Checkout",
    description: "Customizable checkout pages designed to maximize conversions with one-click upsells and order bumps."
  },
  {
    icon: FileText,
    title: "Digital Product Delivery",
    description: "Secure file hosting with instant delivery via download links. No login required for customers."
  },
  {
    icon: Sparkles,
    title: "AI Page Builder",
    description: "Create stunning sales pages in minutes with our AI-powered page builder using GPT-4 and Gemini."
  },
  {
    icon: Mail,
    title: "Email Automation",
    description: "Automated order confirmations, download links, and cart abandonment recovery emails."
  },
  {
    icon: BarChart3,
    title: "Analytics Dashboard",
    description: "Track sales, conversion rates, and customer behavior with detailed analytics."
  },
  {
    icon: CreditCard,
    title: "Flexible Payments",
    description: "Accept payments via UddoktaPay with support for subscriptions and trials."
  },
  {
    icon: Globe,
    title: "Custom Domains",
    description: "Use your own domain for a professional branded experience."
  },
  {
    icon: Shield,
    title: "Secure Downloads",
    description: "Token-based secure downloads with expiry dates and download limits."
  }
];

const testimonials = [
  {
    name: "Sarah Ahmed",
    role: "Course Creator",
    content: "DigitalCart helped me 3x my course sales. The checkout pages are beautiful and the AI builder saved me hours.",
    rating: 5
  },
  {
    name: "Rahim Khan",
    role: "eBook Author",
    content: "Finally a platform that understands digital creators. Easy to use and my customers love the instant downloads.",
    rating: 5
  },
  {
    name: "Nadia Islam",
    role: "Template Designer",
    content: "The order bumps and upsells have increased my average order value by 40%. Highly recommended!",
    rating: 5
  }
];

export default function Landing() {
  const { data: plans, isLoading: plansLoading } = useQuery<SubscriptionPlan[]>({
    queryKey: ["/api/public/plans"],
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">DigitalCart</span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Pricing
            </Link>
            <Link href="/login">
              <Button variant="ghost" data-testid="button-login">Log In</Button>
            </Link>
            <Link href="/signup">
              <Button data-testid="button-signup">Get Started Free</Button>
            </Link>
          </div>
          <div className="flex md:hidden items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" size="sm">Log In</Button>
            </Link>
            <Link href="/signup">
              <Button size="sm">Sign Up</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 md:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/10" />
        <div className="container relative mx-auto px-4 text-center">
          <Badge variant="secondary" className="mb-4">
            <Zap className="w-3 h-3 mr-1" />
            Trusted by 1000+ Digital Creators
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Sell Digital Products<br />
            <span className="text-primary">Like a Pro</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            The all-in-one platform for selling ebooks, courses, templates, and digital downloads. 
            Beautiful checkout pages, instant delivery, and powerful analytics.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/signup">
              <Button size="lg" className="gap-2" data-testid="button-hero-cta">
                Start Selling Today
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/pricing">
              <Button size="lg" variant="outline" data-testid="button-view-pricing">
                View Pricing
              </Button>
            </Link>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Free plan available. No credit card required.
          </p>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Everything You Need to Sell Online</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              From checkout pages to email automation, we've got you covered with all the tools you need to grow your digital business.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="hover-elevate" data-testid={`card-feature-${index}`}>
                <CardContent className="pt-6">
                  <feature.icon className="w-10 h-10 text-primary mb-4" />
                  <h3 className="font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">How It Works</h2>
            <p className="text-muted-foreground">Get started in just 3 simple steps</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { step: "1", title: "Create Your Store", desc: "Sign up and set up your seller account in minutes" },
              { step: "2", title: "Add Products", desc: "Upload your digital products and customize checkout pages" },
              { step: "3", title: "Start Selling", desc: "Share your links and watch the sales roll in" }
            ].map((item, index) => (
              <div key={index} className="text-center" data-testid={`step-${index}`}>
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Loved by Creators</h2>
            <p className="text-muted-foreground">See what our customers have to say</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <Card key={index} data-testid={`card-testimonial-${index}`}>
                <CardContent className="pt-6">
                  <div className="flex gap-1 mb-4">
                    {Array.from({ length: testimonial.rating }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                    ))}
                  </div>
                  <p className="text-sm mb-4">{testimonial.content}</p>
                  <div>
                    <p className="font-semibold">{testimonial.name}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Preview Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4">
              <Sparkles className="w-3 h-3 mr-1" />
              Simple Pricing
            </Badge>
            <h2 className="text-3xl font-bold mb-4">Choose Your Plan</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Start free and scale as you grow. All plans include our core features.
            </p>
          </div>

          {plansLoading ? (
            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-24 mb-2" />
                    <Skeleton className="h-10 w-32" />
                  </CardHeader>
                  <CardContent>
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
              {plans?.filter(p => p.isActive).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)).map((plan, index, arr) => {
                const isPopular = arr.length >= 3 ? index === 1 : index === 0;
                const isFree = Number(plan.price) === 0;

                return (
                  <Card 
                    key={plan.id} 
                    className={`relative ${isPopular ? 'border-primary shadow-lg' : ''}`}
                    data-testid={`card-landing-plan-${plan.slug}`}
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
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 text-sm">
                        {plan.productLimit && (
                          <li className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-primary shrink-0" />
                            Up to {plan.productLimit} products
                          </li>
                        )}
                        {plan.checkoutPageLimit && (
                          <li className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-primary shrink-0" />
                            {plan.checkoutPageLimit} checkout pages
                          </li>
                        )}
                        {plan.aiCreditsPerMonth && plan.aiCreditsPerMonth > 0 && (
                          <li className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-primary shrink-0" />
                            {plan.aiCreditsPerMonth} AI credits/month
                          </li>
                        )}
                      </ul>
                    </CardContent>
                    <CardFooter>
                      <Link href={`/signup?plan=${plan.slug}`} className="w-full">
                        <Button 
                          className="w-full gap-2" 
                          variant={isPopular ? "default" : "outline"}
                          data-testid={`button-landing-select-${plan.slug}`}
                        >
                          {isFree ? "Get Started Free" : "Get Started"}
                          <ArrowRight className="w-4 h-4" />
                        </Button>
                      </Link>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}

          <div className="text-center mt-8">
            <Link href="/pricing">
              <Button variant="ghost" className="gap-1" data-testid="button-view-all-plans">
                View all plans and features
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Start Selling?</h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Join thousands of creators who trust DigitalCart to power their digital product business.
          </p>
          <Link href="/signup">
            <Button size="lg" className="gap-2" data-testid="button-footer-cta">
              Create Your Free Account
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary" />
              <span className="font-semibold">DigitalCart</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link href="/pricing" className="hover:text-foreground transition-colors">Pricing</Link>
              <Link href="/login" className="hover:text-foreground transition-colors">Login</Link>
            </div>
            <p className="text-sm text-muted-foreground">
              2024 DigitalCart. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
