import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
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
import { Link } from "wouter";
import { ArrowLeft, Save, Globe, Mail, Shield, Palette, CreditCard, Trash2, Plus, Check } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const generalSettingsSchema = z.object({
  platformName: z.string().min(1),
  platformUrl: z.string().url().optional().or(z.literal("")),
  supportEmail: z.string().email().optional().or(z.literal("")),
  maintenanceMode: z.boolean().optional(),
  allowSignups: z.boolean().optional(),
});

const emailSettingsSchema = z.object({
  sendgridApiKey: z.string().optional(),
  fromEmail: z.string().email().optional().or(z.literal("")),
  fromName: z.string().optional(),
});

const paymentGatewaySchema = z.object({
  provider: z.string().min(1),
  displayName: z.string().optional(),
  apiKey: z.string().min(1),
  apiUrl: z.string().url(),
  webhookSecret: z.string().optional(),
  isTestMode: z.boolean().default(true),
  isActive: z.boolean().default(true),
  isPrimary: z.boolean().default(false),
});

type GeneralSettings = z.infer<typeof generalSettingsSchema>;
type EmailSettings = z.infer<typeof emailSettingsSchema>;
type PaymentGatewayFormData = z.infer<typeof paymentGatewaySchema>;

interface PaymentGateway {
  id: string;
  provider: string;
  displayName?: string;
  apiKey?: string;
  apiUrl?: string;
  webhookSecret?: string;
  isTestMode?: boolean;
  isActive?: boolean;
  isPrimary?: boolean;
  supportedCurrencies?: string[];
  createdAt?: string;
}

export default function AdminSettings() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("general");
  const [showAddGateway, setShowAddGateway] = useState(false);
  const [editingGateway, setEditingGateway] = useState<PaymentGateway | null>(null);

  const { data: settings, isLoading } = useQuery<Record<string, any>>({
    queryKey: ["/api/admin/settings"],
  });

  const { data: paymentGateways = [], isLoading: isLoadingGateways } = useQuery<PaymentGateway[]>({
    queryKey: ["/api/admin/payment-gateways"],
  });

  const gatewayForm = useForm<PaymentGatewayFormData>({
    resolver: zodResolver(paymentGatewaySchema),
    defaultValues: {
      provider: "uddoktapay",
      displayName: "",
      apiKey: "",
      apiUrl: "https://sandbox.uddoktapay.com",
      webhookSecret: "",
      isTestMode: true,
      isActive: true,
      isPrimary: false,
    },
  });

  const createGatewayMutation = useMutation({
    mutationFn: async (values: PaymentGatewayFormData) => {
      return apiRequest("POST", "/api/admin/payment-gateways", values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payment-gateways"] });
      setShowAddGateway(false);
      gatewayForm.reset();
      toast({ title: "Payment gateway added successfully" });
    },
    onError: () => {
      toast({ title: "Failed to add payment gateway", variant: "destructive" });
    },
  });

  const updateGatewayMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<PaymentGateway> }) => {
      return apiRequest("PATCH", `/api/admin/payment-gateways/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payment-gateways"] });
      setEditingGateway(null);
      toast({ title: "Payment gateway updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update payment gateway", variant: "destructive" });
    },
  });

  const deleteGatewayMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/admin/payment-gateways/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payment-gateways"] });
      toast({ title: "Payment gateway deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete payment gateway", variant: "destructive" });
    },
  });

  const generalForm = useForm<GeneralSettings>({
    resolver: zodResolver(generalSettingsSchema),
    defaultValues: {
      platformName: settings?.platformName || "DigitalCart",
      platformUrl: settings?.platformUrl || "",
      supportEmail: settings?.supportEmail || "",
      maintenanceMode: settings?.maintenanceMode || false,
      allowSignups: settings?.allowSignups !== false,
    },
  });

  const emailForm = useForm<EmailSettings>({
    resolver: zodResolver(emailSettingsSchema),
    defaultValues: {
      sendgridApiKey: "",
      fromEmail: settings?.fromEmail || "",
      fromName: settings?.fromName || "DigitalCart",
    },
  });

  const saveSettingsMutation = useMutation({
    mutationFn: async (values: Record<string, any>) => {
      return apiRequest("POST", "/api/admin/settings", values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      toast({ title: "Settings saved successfully" });
    },
    onError: () => {
      toast({ title: "Failed to save settings", variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin">
          <Button variant="ghost" size="icon" data-testid="button-back-admin">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-settings-title">Platform Settings</h1>
          <p className="text-muted-foreground">Configure global platform settings</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="general" className="gap-2">
            <Globe className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="email" className="gap-2">
            <Mail className="h-4 w-4" />
            Email
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="branding" className="gap-2">
            <Palette className="h-4 w-4" />
            Branding
          </TabsTrigger>
          <TabsTrigger value="payment" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Payment
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>Basic platform configuration</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...generalForm}>
                <form
                  onSubmit={generalForm.handleSubmit((v) => saveSettingsMutation.mutate(v))}
                  className="space-y-6"
                >
                  <FormField
                    control={generalForm.control}
                    name="platformName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Platform Name</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-platform-name" />
                        </FormControl>
                        <FormDescription>The name displayed throughout the platform</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={generalForm.control}
                    name="platformUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Platform URL</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="https://yourplatform.com" />
                        </FormControl>
                        <FormDescription>The main URL for your platform</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={generalForm.control}
                    name="supportEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Support Email</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" placeholder="support@yourplatform.com" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-4">
                    <FormField
                      control={generalForm.control}
                      name="allowSignups"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-4">
                          <div>
                            <FormLabel>Allow New Signups</FormLabel>
                            <FormDescription>Allow new users to register</FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={generalForm.control}
                      name="maintenanceMode"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-4">
                          <div>
                            <FormLabel>Maintenance Mode</FormLabel>
                            <FormDescription>Show maintenance page to non-admins</FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <Button type="submit" disabled={saveSettingsMutation.isPending} data-testid="button-save-general">
                    <Save className="h-4 w-4 mr-2" />
                    {saveSettingsMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Email Settings</CardTitle>
              <CardDescription>Configure email delivery settings</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...emailForm}>
                <form
                  onSubmit={emailForm.handleSubmit((v) => saveSettingsMutation.mutate(v))}
                  className="space-y-6"
                >
                  <FormField
                    control={emailForm.control}
                    name="sendgridApiKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SendGrid API Key</FormLabel>
                        <FormControl>
                          <Input {...field} type="password" placeholder="SG.xxxx" />
                        </FormControl>
                        <FormDescription>Your SendGrid API key for sending emails</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={emailForm.control}
                      name="fromEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>From Email</FormLabel>
                          <FormControl>
                            <Input {...field} type="email" placeholder="noreply@yourplatform.com" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={emailForm.control}
                      name="fromName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>From Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="DigitalCart" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Button type="submit" disabled={saveSettingsMutation.isPending}>
                    <Save className="h-4 w-4 mr-2" />
                    {saveSettingsMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>Configure platform security options</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <h4 className="font-medium">Two-Factor Authentication</h4>
                  <p className="text-sm text-muted-foreground">Require 2FA for admin accounts</p>
                </div>
                <Switch />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <h4 className="font-medium">Session Timeout</h4>
                  <p className="text-sm text-muted-foreground">Auto-logout after inactivity</p>
                </div>
                <Input type="number" className="w-24" defaultValue={60} />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <h4 className="font-medium">Rate Limiting</h4>
                  <p className="text-sm text-muted-foreground">Limit API requests per minute</p>
                </div>
                <Switch defaultChecked />
              </div>

              <Button data-testid="button-save-security">
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branding" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Branding Settings</CardTitle>
              <CardDescription>Customize platform appearance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Logo</label>
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-lg border-2 border-dashed flex items-center justify-center">
                    <Palette className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <Button variant="outline">Upload Logo</Button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Primary Color</label>
                <div className="flex items-center gap-2">
                  <Input type="color" className="w-16 h-10" defaultValue="#3b82f6" />
                  <Input defaultValue="#3b82f6" className="w-32" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Custom CSS</label>
                <Textarea
                  placeholder="/* Custom CSS overrides */"
                  className="font-mono text-sm"
                  rows={6}
                />
              </div>

              <Button data-testid="button-save-branding">
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payment" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle>Payment Gateways</CardTitle>
                <CardDescription>Configure payment gateways for collecting subscription payments from sellers</CardDescription>
              </div>
              <Dialog open={showAddGateway} onOpenChange={setShowAddGateway}>
                <DialogTrigger asChild>
                  <Button data-testid="button-add-gateway">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Gateway
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add Payment Gateway</DialogTitle>
                    <DialogDescription>Configure a new payment gateway for subscription payments</DialogDescription>
                  </DialogHeader>
                  <Form {...gatewayForm}>
                    <form onSubmit={gatewayForm.handleSubmit((v) => createGatewayMutation.mutate(v))} className="space-y-4">
                      <FormField
                        control={gatewayForm.control}
                        name="provider"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Provider</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-provider">
                                  <SelectValue placeholder="Select provider" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="uddoktapay">UddoktaPay</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={gatewayForm.control}
                        name="displayName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Display Name (Optional)</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="My UddoktaPay" data-testid="input-gateway-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={gatewayForm.control}
                        name="apiKey"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>API Key</FormLabel>
                            <FormControl>
                              <Input {...field} type="password" placeholder="Your API key" data-testid="input-api-key" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={gatewayForm.control}
                        name="apiUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>API URL</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="https://sandbox.uddoktapay.com" data-testid="input-api-url" />
                            </FormControl>
                            <FormDescription>Use sandbox URL for testing</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex items-center justify-between rounded-lg border p-4">
                        <div>
                          <h4 className="font-medium text-sm">Test Mode</h4>
                          <p className="text-xs text-muted-foreground">Enable for sandbox testing</p>
                        </div>
                        <Switch
                          checked={gatewayForm.watch("isTestMode")}
                          onCheckedChange={(v) => gatewayForm.setValue("isTestMode", v)}
                        />
                      </div>
                      <div className="flex items-center justify-between rounded-lg border p-4">
                        <div>
                          <h4 className="font-medium text-sm">Set as Primary</h4>
                          <p className="text-xs text-muted-foreground">Use this gateway by default</p>
                        </div>
                        <Switch
                          checked={gatewayForm.watch("isPrimary")}
                          onCheckedChange={(v) => gatewayForm.setValue("isPrimary", v)}
                        />
                      </div>
                      <DialogFooter>
                        <Button type="submit" disabled={createGatewayMutation.isPending} data-testid="button-save-gateway">
                          {createGatewayMutation.isPending ? "Adding..." : "Add Gateway"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {isLoadingGateways ? (
                <div className="space-y-4">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : paymentGateways.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No payment gateways configured</p>
                  <p className="text-sm">Add a gateway to start collecting subscription payments</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {paymentGateways.map((gateway) => (
                    <div
                      key={gateway.id}
                      className="flex items-center justify-between p-4 rounded-lg border"
                      data-testid={`gateway-card-${gateway.id}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <CreditCard className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{gateway.displayName || gateway.provider}</h4>
                            {gateway.isPrimary && (
                              <Badge variant="secondary" className="text-xs">
                                <Check className="h-3 w-3 mr-1" />
                                Primary
                              </Badge>
                            )}
                            {gateway.isTestMode && (
                              <Badge variant="outline" className="text-xs">Test Mode</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {gateway.provider} - {gateway.isActive ? "Active" : "Inactive"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!gateway.isPrimary && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateGatewayMutation.mutate({ id: gateway.id, data: { isPrimary: true } })}
                            disabled={updateGatewayMutation.isPending}
                            data-testid={`button-set-primary-${gateway.id}`}
                          >
                            Set Primary
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm("Are you sure you want to delete this gateway?")) {
                              deleteGatewayMutation.mutate(gateway.id);
                            }
                          }}
                          disabled={deleteGatewayMutation.isPending}
                          data-testid={`button-delete-gateway-${gateway.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
