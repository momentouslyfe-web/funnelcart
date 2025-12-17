import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Product } from "@shared/schema";

const checkoutPageFormSchema = z.object({
  name: z.string().min(1, "Page name is required"),
  slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers, and hyphens"),
  productId: z.string().min(1, "Please select a product"),
  template: z.enum(["publisher", "author", "clean", "minimalist"]),
});

type CheckoutPageFormData = z.infer<typeof checkoutPageFormSchema>;

const templates = [
  {
    id: "publisher" as const,
    name: "Publisher",
    description: "Bold and professional, perfect for ebooks and guides",
    preview: "bg-gradient-to-br from-blue-500 to-blue-600",
  },
  {
    id: "author" as const,
    name: "Author",
    description: "Elegant and personal, ideal for personal brand products",
    preview: "bg-gradient-to-br from-purple-500 to-purple-600",
  },
  {
    id: "clean" as const,
    name: "Clean",
    description: "Minimal and focused, emphasizes the product",
    preview: "bg-gradient-to-br from-gray-500 to-gray-600",
  },
  {
    id: "minimalist" as const,
    name: "Minimalist",
    description: "Ultra-simple, distraction-free checkout",
    preview: "bg-gradient-to-br from-green-500 to-green-600",
  },
];

function FormSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10" />
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32 mt-2" />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="aspect-video" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function CheckoutPageForm() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const searchParams = new URLSearchParams(window.location.search);
  const preselectedProductId = searchParams.get("productId");

  const { data: products, isLoading: isLoadingProducts } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const form = useForm<CheckoutPageFormData>({
    resolver: zodResolver(checkoutPageFormSchema),
    defaultValues: {
      name: "",
      slug: "",
      productId: preselectedProductId || "",
      template: "publisher",
    },
  });

  const watchName = form.watch("name");

  useEffect(() => {
    if (watchName) {
      const slug = watchName
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");
      form.setValue("slug", slug);
    }
  }, [watchName, form]);

  const createMutation = useMutation({
    mutationFn: async (data: CheckoutPageFormData) => {
      const response = await apiRequest("POST", "/api/checkout-pages", {
        ...data,
        userId: "demo-user",
        blocks: getDefaultBlocks(data.template),
        customStyles: {},
        isPublished: false,
      });
      return await response.json() as { id: string };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/checkout-pages"] });
      toast({
        title: "Checkout page created",
        description: "Now customize it with the visual editor.",
      });
      navigate(`/checkout-pages/${data.id}/editor`);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create checkout page. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CheckoutPageFormData) => {
    createMutation.mutate(data);
  };

  if (isLoadingProducts) {
    return <FormSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/checkout-pages")}
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">
            Create Checkout Page
          </h1>
          <p className="text-muted-foreground mt-1">
            Choose a template and product to get started
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Page Details</CardTitle>
                <CardDescription>
                  Configure your checkout page settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="productId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-product">
                            <SelectValue placeholder="Select a product" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {products?.map((product) => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.name} - ${Number(product.price).toFixed(2)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        The product customers will purchase
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Page Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Ultimate Guide Checkout"
                          {...field}
                          data-testid="input-page-name"
                        />
                      </FormControl>
                      <FormDescription>
                        Internal name for your reference
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL Slug</FormLabel>
                      <FormControl>
                        <div className="flex">
                          <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 bg-muted text-muted-foreground text-sm">
                            /c/
                          </span>
                          <Input
                            className="rounded-l-none"
                            placeholder="ultimate-guide"
                            {...field}
                            data-testid="input-page-slug"
                          />
                        </div>
                      </FormControl>
                      <FormDescription>
                        This will be your checkout page URL
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Choose Template
                </CardTitle>
                <CardDescription>
                  Select a starting template for your checkout page
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="template"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="grid grid-cols-2 gap-4"
                        >
                          {templates.map((template) => (
                            <div key={template.id}>
                              <RadioGroupItem
                                value={template.id}
                                id={template.id}
                                className="peer sr-only"
                              />
                              <Label
                                htmlFor={template.id}
                                className="flex flex-col cursor-pointer rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary transition-all"
                                data-testid={`template-${template.id}`}
                              >
                                <div className={`aspect-video rounded-md mb-3 ${template.preview}`} />
                                <span className="font-semibold">{template.name}</span>
                                <span className="text-xs text-muted-foreground mt-1">
                                  {template.description}
                                </span>
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/checkout-pages")}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || !products?.length}
              data-testid="button-create-page"
            >
              {createMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Create & Customize
            </Button>
          </div>
        </form>
      </Form>

      {(!products || products.length === 0) && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground mb-4">
              You need to create a product first before creating a checkout page.
            </p>
            <Button asChild>
              <a href="/products/new">Create Product</a>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function getDefaultBlocks(template: string) {
  const baseBlocks = [
    {
      id: "hero-1",
      type: "hero",
      content: {
        title: "Get Instant Access Now",
        subtitle: "Transform your skills with this comprehensive guide",
      },
      position: 0,
    },
    {
      id: "pricing-1",
      type: "pricing",
      content: {
        showOriginalPrice: true,
        ctaText: "Buy Now",
      },
      position: 1,
    },
    {
      id: "features-1",
      type: "features",
      content: {
        title: "What You'll Get",
        items: [
          "Complete step-by-step guide",
          "Downloadable resources",
          "Lifetime access",
        ],
      },
      position: 2,
    },
    {
      id: "payment-1",
      type: "paymentForm",
      content: {},
      position: 3,
    },
    {
      id: "guarantee-1",
      type: "guarantee",
      content: {
        title: "100% Money-Back Guarantee",
        description: "If you're not satisfied, we'll refund your purchase. No questions asked.",
      },
      position: 4,
    },
  ];

  return baseBlocks;
}
