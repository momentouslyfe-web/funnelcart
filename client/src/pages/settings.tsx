import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Globe,
  CreditCard,
  Mail,
  BarChart3,
  Palette,
  Lock,
  Save,
  Loader2,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const generalSettingsSchema = z.object({
  storeName: z.string().min(1, "Store name is required"),
  storeUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  supportEmail: z.string().email("Must be a valid email").optional().or(z.literal("")),
  timezone: z.string().optional(),
});

const paymentSettingsSchema = z.object({
  uddoktapayApiKey: z.string().optional(),
  uddoktapayApiUrl: z.string().optional(),
  testMode: z.boolean().default(true),
  currency: z.string().default("BDT"),
});

const trackingSettingsSchema = z.object({
  fbPixelId: z.string().optional(),
  fbAccessToken: z.string().optional(),
  fbTestEventCode: z.string().optional(),
  enableServerSide: z.boolean().default(false),
});

const emailSettingsSchema = z.object({
  smtpHost: z.string().optional(),
  smtpPort: z.string().optional(),
  smtpUser: z.string().optional(),
  smtpPassword: z.string().optional(),
  fromEmail: z.string().email().optional().or(z.literal("")),
  fromName: z.string().optional(),
});

const domainSettingsSchema = z.object({
  customDomain: z.string().optional(),
  sslEnabled: z.boolean().default(true),
});

type GeneralSettings = z.infer<typeof generalSettingsSchema>;
type PaymentSettings = z.infer<typeof paymentSettingsSchema>;
type TrackingSettings = z.infer<typeof trackingSettingsSchema>;
type EmailSettings = z.infer<typeof emailSettingsSchema>;
type DomainSettings = z.infer<typeof domainSettingsSchema>;

function GeneralSettingsForm() {
  const { toast } = useToast();
  const form = useForm<GeneralSettings>({
    resolver: zodResolver(generalSettingsSchema),
    defaultValues: {
      storeName: "",
      storeUrl: "",
      supportEmail: "",
      timezone: "UTC",
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: GeneralSettings) => {
      return await apiRequest("POST", "/api/settings/general", data);
    },
    onSuccess: () => {
      toast({
        title: "Settings saved",
        description: "Your general settings have been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => saveMutation.mutate(data))} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Store Information</CardTitle>
            <CardDescription>Basic information about your store</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="storeName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Store Name</FormLabel>
                  <FormControl>
                    <Input placeholder="My Digital Store" {...field} data-testid="input-store-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="storeUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Store URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://mystore.com" {...field} data-testid="input-store-url" />
                  </FormControl>
                  <FormDescription>Your store's primary URL</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="supportEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Support Email</FormLabel>
                  <FormControl>
                    <Input placeholder="support@mystore.com" {...field} data-testid="input-support-email" />
                  </FormControl>
                  <FormDescription>Email for customer support inquiries</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
        <div className="flex justify-end">
          <Button type="submit" disabled={saveMutation.isPending} data-testid="button-save-general">
            {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </form>
    </Form>
  );
}

function PaymentSettingsForm() {
  const { toast } = useToast();
  const form = useForm<PaymentSettings>({
    resolver: zodResolver(paymentSettingsSchema),
    defaultValues: {
      uddoktapayApiKey: "",
      uddoktapayApiUrl: "https://sandbox.uddoktapay.com/api/checkout-v2",
      testMode: true,
      currency: "BDT",
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: PaymentSettings) => {
      return await apiRequest("POST", "/api/settings/payment", data);
    },
    onSuccess: () => {
      toast({
        title: "Settings saved",
        description: "Your payment settings have been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => saveMutation.mutate(data))} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <img src="https://uddoktapay.com/assets/images/logo.png" alt="UddoktaPay" className="h-6" />
              UddoktaPay Integration
            </CardTitle>
            <CardDescription>
              Accept payments via bKash, Nagad, Rocket, and cards through UddoktaPay
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="uddoktapayApiKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>API Key</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Enter your UddoktaPay API key"
                      {...field}
                      data-testid="input-uddoktapay-key"
                    />
                  </FormControl>
                  <FormDescription>
                    Get your API key from{" "}
                    <a
                      href="https://uddoktapay.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      UddoktaPay Dashboard
                    </a>
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="uddoktapayApiUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>API URL</FormLabel>
                  <FormControl>
                    <Input {...field} data-testid="input-uddoktapay-url" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="testMode"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Test Mode</FormLabel>
                    <FormDescription>
                      Use sandbox environment for testing
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="switch-test-mode"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Currency</FormLabel>
                  <FormControl>
                    <Input {...field} data-testid="input-currency" />
                  </FormControl>
                  <FormDescription>Default: BDT (Bangladeshi Taka)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
        <div className="flex justify-end">
          <Button type="submit" disabled={saveMutation.isPending} data-testid="button-save-payment">
            {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </form>
    </Form>
  );
}

function TrackingSettingsForm() {
  const { toast } = useToast();
  const form = useForm<TrackingSettings>({
    resolver: zodResolver(trackingSettingsSchema),
    defaultValues: {
      fbPixelId: "",
      fbAccessToken: "",
      fbTestEventCode: "",
      enableServerSide: false,
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: TrackingSettings) => {
      return await apiRequest("POST", "/api/settings/tracking", data);
    },
    onSuccess: () => {
      toast({
        title: "Settings saved",
        description: "Your tracking settings have been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => saveMutation.mutate(data))} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Facebook Pixel</CardTitle>
            <CardDescription>
              Track conversions and optimize your ads with Facebook Pixel
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="fbPixelId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pixel ID</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter your Facebook Pixel ID" {...field} data-testid="input-pixel-id" />
                  </FormControl>
                  <FormDescription>
                    Find your Pixel ID in{" "}
                    <a
                      href="https://business.facebook.com/events_manager"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Facebook Events Manager
                    </a>
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Separator />
            <div className="space-y-4">
              <div>
                <h4 className="font-medium">Server-Side Tracking (Conversions API)</h4>
                <p className="text-sm text-muted-foreground">
                  Improve event match quality and track conversions more accurately
                </p>
              </div>
              <FormField
                control={form.control}
                name="enableServerSide"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Enable Server-Side Tracking</FormLabel>
                      <FormDescription>
                        Send events to Facebook Conversions API for better accuracy
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-server-side"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="fbAccessToken"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Access Token</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Enter your Conversions API access token"
                        {...field}
                        data-testid="input-fb-token"
                      />
                    </FormControl>
                    <FormDescription>
                      Generate a token in Facebook Events Manager under Settings
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="fbTestEventCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Test Event Code (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="TEST12345"
                        {...field}
                        data-testid="input-fb-test-code"
                      />
                    </FormControl>
                    <FormDescription>
                      Use this code to test events before going live
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Event Configuration</CardTitle>
            <CardDescription>Events that are automatically tracked</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { event: "PageView", description: "When checkout page is viewed" },
                { event: "ViewContent", description: "When product details are viewed" },
                { event: "InitiateCheckout", description: "When customer starts checkout" },
                { event: "AddPaymentInfo", description: "When payment info is entered" },
                { event: "Purchase", description: "When purchase is completed" },
              ].map((item) => (
                <div key={item.event} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">{item.event}</p>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                  <Badge variant="secondary">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Auto
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={saveMutation.isPending} data-testid="button-save-tracking">
            {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </form>
    </Form>
  );
}

function EmailSettingsForm() {
  const { toast } = useToast();
  const form = useForm<EmailSettings>({
    resolver: zodResolver(emailSettingsSchema),
    defaultValues: {
      smtpHost: "",
      smtpPort: "587",
      smtpUser: "",
      smtpPassword: "",
      fromEmail: "",
      fromName: "",
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: EmailSettings) => {
      return await apiRequest("POST", "/api/settings/email", data);
    },
    onSuccess: () => {
      toast({
        title: "Settings saved",
        description: "Your email settings have been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => saveMutation.mutate(data))} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>SMTP Configuration</CardTitle>
            <CardDescription>Configure your email sending settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="smtpHost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SMTP Host</FormLabel>
                    <FormControl>
                      <Input placeholder="smtp.gmail.com" {...field} data-testid="input-smtp-host" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="smtpPort"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SMTP Port</FormLabel>
                    <FormControl>
                      <Input placeholder="587" {...field} data-testid="input-smtp-port" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="smtpUser"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SMTP Username</FormLabel>
                    <FormControl>
                      <Input placeholder="your@email.com" {...field} data-testid="input-smtp-user" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="smtpPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SMTP Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} data-testid="input-smtp-password" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="fromEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>From Email</FormLabel>
                    <FormControl>
                      <Input placeholder="noreply@mystore.com" {...field} data-testid="input-from-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="fromName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>From Name</FormLabel>
                    <FormControl>
                      <Input placeholder="My Store" {...field} data-testid="input-from-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" data-testid="button-test-email">
            Send Test Email
          </Button>
          <Button type="submit" disabled={saveMutation.isPending} data-testid="button-save-email">
            {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </form>
    </Form>
  );
}

function DomainSettingsForm() {
  const { toast } = useToast();
  const form = useForm<DomainSettings>({
    resolver: zodResolver(domainSettingsSchema),
    defaultValues: {
      customDomain: "",
      sslEnabled: true,
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: DomainSettings) => {
      return await apiRequest("POST", "/api/settings/domain", data);
    },
    onSuccess: () => {
      toast({
        title: "Settings saved",
        description: "Your domain settings have been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => saveMutation.mutate(data))} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Custom Domain</CardTitle>
            <CardDescription>Use your own domain for checkout pages</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="customDomain"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Domain Name</FormLabel>
                  <FormControl>
                    <Input placeholder="checkout.yourdomain.com" {...field} data-testid="input-custom-domain" />
                  </FormControl>
                  <FormDescription>
                    Point your domain's DNS to our servers
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="p-4 bg-muted/50 rounded-lg space-y-3">
              <h4 className="font-medium">DNS Configuration</h4>
              <div className="space-y-2 font-mono text-sm">
                <div className="flex items-center justify-between p-2 bg-background rounded">
                  <span>Type: CNAME</span>
                  <span>Target: checkout.example.repl.co</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Add this CNAME record to your domain's DNS settings
              </p>
            </div>
            <FormField
              control={form.control}
              name="sslEnabled"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      SSL Certificate
                    </FormLabel>
                    <FormDescription>
                      Automatically provision and renew SSL certificates
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="switch-ssl"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
        <div className="flex justify-end">
          <Button type="submit" disabled={saveMutation.isPending} data-testid="button-save-domain">
            {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </form>
    </Form>
  );
}

export default function Settings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-page-title">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Configure your store settings and integrations
        </p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-flex">
          <TabsTrigger value="general" data-testid="tab-general">
            <Palette className="h-4 w-4 mr-2" />
            General
          </TabsTrigger>
          <TabsTrigger value="payment" data-testid="tab-payment">
            <CreditCard className="h-4 w-4 mr-2" />
            Payment
          </TabsTrigger>
          <TabsTrigger value="tracking" data-testid="tab-tracking">
            <BarChart3 className="h-4 w-4 mr-2" />
            Tracking
          </TabsTrigger>
          <TabsTrigger value="email" data-testid="tab-email">
            <Mail className="h-4 w-4 mr-2" />
            Email
          </TabsTrigger>
          <TabsTrigger value="domain" data-testid="tab-domain">
            <Globe className="h-4 w-4 mr-2" />
            Domain
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <GeneralSettingsForm />
        </TabsContent>

        <TabsContent value="payment">
          <PaymentSettingsForm />
        </TabsContent>

        <TabsContent value="tracking">
          <TrackingSettingsForm />
        </TabsContent>

        <TabsContent value="email">
          <EmailSettingsForm />
        </TabsContent>

        <TabsContent value="domain">
          <DomainSettingsForm />
        </TabsContent>
      </Tabs>
    </div>
  );
}
