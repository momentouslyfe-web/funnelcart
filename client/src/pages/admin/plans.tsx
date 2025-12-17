import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Link } from "wouter";
import { ArrowLeft, Plus, Edit, Check, Sparkles } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { SubscriptionPlan } from "@shared/schema";

const planFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required"),
  description: z.string().optional(),
  price: z.coerce.number().min(0),
  productLimit: z.coerce.number().min(1).optional(),
  checkoutPageLimit: z.coerce.number().min(1).optional(),
  monthlyOrderLimit: z.coerce.number().min(1).optional(),
  aiCreditsPerMonth: z.coerce.number().min(0).optional(),
  customDomainAllowed: z.boolean().optional(),
  prioritySupport: z.boolean().optional(),
  whitelabelAllowed: z.boolean().optional(),
  trialEnabled: z.boolean().optional(),
  trialDays: z.coerce.number().min(0).optional(),
  isActive: z.boolean().optional(),
});

type PlanFormValues = z.infer<typeof planFormSchema>;

export default function AdminPlans() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);

  const { data: plans, isLoading } = useQuery<SubscriptionPlan[]>({
    queryKey: ["/api/admin/plans"],
  });

  const form = useForm<PlanFormValues>({
    resolver: zodResolver(planFormSchema),
    defaultValues: {
      name: "",
      slug: "",
      description: "",
      price: 0,
      productLimit: 10,
      checkoutPageLimit: 10,
      monthlyOrderLimit: 500,
      aiCreditsPerMonth: 50,
      customDomainAllowed: false,
      prioritySupport: false,
      whitelabelAllowed: false,
      trialEnabled: false,
      trialDays: 7,
      isActive: true,
    },
  });

  const savePlanMutation = useMutation({
    mutationFn: async (values: PlanFormValues) => {
      if (editingPlan) {
        return apiRequest("PATCH", `/api/admin/plans/${editingPlan.id}`, values);
      }
      return apiRequest("POST", "/api/admin/plans", values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/plans"] });
      toast({ title: editingPlan ? "Plan updated" : "Plan created" });
      setDialogOpen(false);
      setEditingPlan(null);
      form.reset();
    },
    onError: () => {
      toast({ title: "Failed to save plan", variant: "destructive" });
    },
  });

  const openEditDialog = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    form.reset({
      name: plan.name,
      slug: plan.slug,
      description: plan.description || "",
      price: parseFloat(plan.price),
      productLimit: plan.productLimit || 10,
      checkoutPageLimit: plan.checkoutPageLimit || 10,
      monthlyOrderLimit: plan.monthlyOrderLimit || 500,
      aiCreditsPerMonth: plan.aiCreditsPerMonth || 0,
      customDomainAllowed: plan.customDomainAllowed || false,
      prioritySupport: plan.prioritySupport || false,
      whitelabelAllowed: plan.whitelabelAllowed || false,
      trialEnabled: plan.trialEnabled || false,
      trialDays: plan.trialDays || 7,
      isActive: plan.isActive !== false,
    });
    setDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingPlan(null);
    form.reset({
      name: "",
      slug: "",
      description: "",
      price: 0,
      productLimit: 10,
      checkoutPageLimit: 10,
      monthlyOrderLimit: 500,
      aiCreditsPerMonth: 50,
      customDomainAllowed: false,
      prioritySupport: false,
      whitelabelAllowed: false,
      trialEnabled: false,
      trialDays: 7,
      isActive: true,
    });
    setDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-96 w-full" />
          ))}
        </div>
      </div>
    );
  }

  // Demo plans if API returns empty
  const displayPlans = plans?.length ? plans : [
    { id: "1", name: "Free", slug: "free", price: "0", description: "Get started", productLimit: 3, checkoutPageLimit: 3, monthlyOrderLimit: 50, aiCreditsPerMonth: 5, isActive: true, sortOrder: 0 },
    { id: "2", name: "Starter", slug: "starter", price: "29", description: "For growing creators", productLimit: 10, checkoutPageLimit: 10, monthlyOrderLimit: 500, aiCreditsPerMonth: 50, isActive: true, sortOrder: 1 },
    { id: "3", name: "Pro", slug: "pro", price: "79", description: "Advanced features", productLimit: 50, checkoutPageLimit: 50, monthlyOrderLimit: 2500, aiCreditsPerMonth: 200, customDomainAllowed: true, prioritySupport: true, isActive: true, sortOrder: 2 },
  ] as SubscriptionPlan[];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/admin">
            <Button variant="ghost" size="icon" data-testid="button-back-admin">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-plans-title">Subscription Plans</h1>
            <p className="text-muted-foreground">Configure pricing tiers and feature limits</p>
          </div>
        </div>
        <Button onClick={openCreateDialog} data-testid="button-create-plan">
          <Plus className="h-4 w-4 mr-2" />
          Add Plan
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {displayPlans.map((plan) => (
          <Card key={plan.id} className={plan.slug === "pro" ? "border-primary" : ""}>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2">
                  {plan.name}
                  {plan.slug === "pro" && (
                    <Badge className="bg-primary text-primary-foreground">Popular</Badge>
                  )}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => openEditDialog(plan)}
                  data-testid={`button-edit-plan-${plan.id}`}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold">${plan.price}</span>
                <span className="text-muted-foreground">/month</span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-sm">{plan.productLimit || "Unlimited"} products</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-sm">{plan.checkoutPageLimit || "Unlimited"} checkout pages</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-sm">{plan.monthlyOrderLimit || "Unlimited"} orders/month</span>
                </div>
                {plan.aiCreditsPerMonth && plan.aiCreditsPerMonth > 0 && (
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-purple-500" />
                    <span className="text-sm">{plan.aiCreditsPerMonth} AI credits/month</span>
                  </div>
                )}
                {plan.customDomainAllowed && (
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Custom domain</span>
                  </div>
                )}
                {plan.prioritySupport && (
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Priority support</span>
                  </div>
                )}
              </div>

              {!plan.isActive && (
                <Badge variant="destructive">Inactive</Badge>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPlan ? "Edit Plan" : "Create Plan"}</DialogTitle>
            <DialogDescription>
              Configure the subscription plan details and limits
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((v) => savePlanMutation.mutate(v))} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-plan-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Slug</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-plan-slug" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} data-testid="input-plan-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monthly Price ($)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} data-testid="input-plan-price" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="productLimit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product Limit</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="checkoutPageLimit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Checkout Page Limit</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="monthlyOrderLimit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Monthly Order Limit</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="aiCreditsPerMonth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>AI Credits/Month</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="customDomainAllowed"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <FormLabel>Custom Domain</FormLabel>
                        <FormDescription>Allow custom domains</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="prioritySupport"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <FormLabel>Priority Support</FormLabel>
                        <FormDescription>Faster response times</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="trialEnabled"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <FormLabel>Trial Period</FormLabel>
                        <FormDescription>Allow free trial before billing</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {form.watch("trialEnabled") && (
                  <FormField
                    control={form.control}
                    name="trialDays"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Trial Duration (Days)</FormLabel>
                        <FormControl>
                          <Input type="number" min="1" {...field} data-testid="input-trial-days" />
                        </FormControl>
                        <FormDescription>Number of days before billing starts</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <FormLabel>Active</FormLabel>
                        <FormDescription>Plan is available for purchase</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={savePlanMutation.isPending} data-testid="button-save-plan">
                  {savePlanMutation.isPending ? "Saving..." : "Save Plan"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
