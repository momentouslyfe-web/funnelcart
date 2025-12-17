import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { 
  ArrowLeft, Plus, Wand2, Save, Eye, Settings, Trash2, 
  FileText, ShoppingCart, Gift, ThumbsUp, ChevronDown, ChevronUp,
  Sparkles, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Funnel, FunnelPage, Product } from "@shared/schema";

const PAGE_TYPES = [
  { value: "landing", label: "Landing Page", icon: FileText, description: "Capture leads and introduce your product" },
  { value: "checkout", label: "Checkout Page", icon: ShoppingCart, description: "Complete the purchase" },
  { value: "upsell", label: "Upsell Page", icon: Gift, description: "Offer additional products" },
  { value: "downsell", label: "Downsell Page", icon: Gift, description: "Alternative lower-priced offer" },
  { value: "thank_you", label: "Thank You Page", icon: ThumbsUp, description: "Confirm purchase and deliver" },
];

export default function FunnelEditorPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const [isAddPageOpen, setIsAddPageOpen] = useState(false);
  const [isAIGenerateOpen, setIsAIGenerateOpen] = useState(false);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [newPage, setNewPage] = useState({ name: "", slug: "", pageType: "landing" });
  const [aiConfig, setAiConfig] = useState({
    instructions: "",
    productInfo: "",
    audience: "",
    tone: "professional",
  });

  const { data: funnel, isLoading } = useQuery<Funnel & { pages?: FunnelPage[]; product?: Product }>({
    queryKey: ["/api/funnels", id],
  });

  const createPageMutation = useMutation({
    mutationFn: async (data: { name: string; slug: string; pageType: string; sortOrder: number }) => {
      return apiRequest("POST", `/api/funnels/${id}/pages`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/funnels", id] });
      setIsAddPageOpen(false);
      setNewPage({ name: "", slug: "", pageType: "landing" });
      toast({ title: "Page added successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create page", variant: "destructive" });
    },
  });

  const deletePageMutation = useMutation({
    mutationFn: async (pageId: string) => {
      return apiRequest("DELETE", `/api/funnel-pages/${pageId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/funnels", id] });
      toast({ title: "Page deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete page", variant: "destructive" });
    },
  });

  const generatePageMutation = useMutation({
    mutationFn: async (pageId: string) => {
      return apiRequest("POST", `/api/funnel-pages/${pageId}/generate`, {
        instructions: aiConfig.instructions,
        productInfo: aiConfig.productInfo || funnel?.product?.name,
        audience: aiConfig.audience,
        tone: aiConfig.tone,
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/funnels", id] });
      setIsAIGenerateOpen(false);
      toast({ title: "Page content generated with AI" });
    },
    onError: () => {
      toast({ title: "Failed to generate page content", variant: "destructive" });
    },
  });

  const updateFunnelMutation = useMutation({
    mutationFn: async (data: Partial<Funnel>) => {
      return apiRequest("PATCH", `/api/funnels/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/funnels", id] });
      toast({ title: "Funnel updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update funnel", variant: "destructive" });
    },
  });

  const handleAddPage = () => {
    if (!newPage.name.trim()) {
      toast({ title: "Please enter a page name", variant: "destructive" });
      return;
    }
    const slug = newPage.slug || newPage.name.toLowerCase().replace(/\s+/g, "-");
    createPageMutation.mutate({
      name: newPage.name,
      slug,
      pageType: newPage.pageType,
      sortOrder: (funnel?.pages?.length || 0),
    });
  };

  const handleAIGenerate = () => {
    if (!selectedPageId) return;
    generatePageMutation.mutate(selectedPageId);
  };

  const openAIModal = (pageId: string) => {
    setSelectedPageId(pageId);
    // Pre-populate with funnel's product context and AI settings
    const productDetails = funnel?.product 
      ? `${funnel.product.name} - ${funnel.product.description || ''} - Price: $${Number(funnel.product.price).toFixed(2)}`
      : "";
    setAiConfig({
      instructions: funnel?.customInstructions || "",
      productInfo: productDetails,
      audience: funnel?.targetAudience || "",
      tone: funnel?.tone || "professional",
    });
    setIsAIGenerateOpen(true);
  };

  const movePageOrder = async (pageId: string, direction: "up" | "down") => {
    const pages = funnel?.pages || [];
    const currentIndex = pages.findIndex(p => p.id === pageId);
    if (currentIndex === -1) return;
    
    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= pages.length) return;

    await apiRequest("PATCH", `/api/funnel-pages/${pageId}`, { sortOrder: newIndex });
    await apiRequest("PATCH", `/api/funnel-pages/${pages[newIndex].id}`, { sortOrder: currentIndex });
    queryClient.invalidateQueries({ queryKey: ["/api/funnels", id] });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!funnel) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Funnel not found</p>
            <Button onClick={() => navigate("/funnels")} className="mt-4">
              Back to Funnels
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const sortedPages = [...(funnel.pages || [])].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <Button variant="ghost" onClick={() => navigate("/funnels")} data-testid="button-back">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold" data-testid="text-funnel-name">{funnel.name}</h1>
          <p className="text-muted-foreground">{funnel.description || "No description"}</p>
        </div>
        <Badge variant={funnel.isPublished ? "default" : "secondary"}>
          {funnel.isPublished ? "Published" : "Draft"}
        </Badge>
        <Button
          variant="outline"
          onClick={() => updateFunnelMutation.mutate({ isPublished: !funnel.isPublished })}
          data-testid="button-toggle-status"
        >
          {funnel.isPublished ? "Unpublish" : "Publish"}
        </Button>
      </div>

      <Tabs defaultValue="pages" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pages" data-testid="tab-pages">Pages</TabsTrigger>
          <TabsTrigger value="offers" data-testid="tab-offers">Offers</TabsTrigger>
          <TabsTrigger value="settings" data-testid="tab-settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="pages" className="space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <h2 className="text-lg font-semibold">Funnel Pages</h2>
            <Button onClick={() => setIsAddPageOpen(true)} data-testid="button-add-page">
              <Plus className="w-4 h-4 mr-2" />
              Add Page
            </Button>
          </div>

          {sortedPages.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No pages yet</h3>
                <p className="text-muted-foreground mb-4">
                  Add pages to your funnel to build your sales flow
                </p>
                <Button onClick={() => setIsAddPageOpen(true)} data-testid="button-add-first-page">
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Page
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {sortedPages.map((page, index) => {
                const pageTypeInfo = PAGE_TYPES.find(t => t.value === page.pageType);
                const PageIcon = pageTypeInfo?.icon || FileText;
                const hasContent = Array.isArray(page.blocks) && page.blocks.length > 0;
                
                return (
                  <Card key={page.id} data-testid={`card-page-${page.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex flex-col items-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            disabled={index === 0}
                            onClick={() => movePageOrder(page.id, "up")}
                            data-testid={`button-move-up-${page.id}`}
                          >
                            <ChevronUp className="w-4 h-4" />
                          </Button>
                          <span className="text-sm text-muted-foreground">{index + 1}</span>
                          <Button
                            size="icon"
                            variant="ghost"
                            disabled={index === sortedPages.length - 1}
                            onClick={() => movePageOrder(page.id, "down")}
                            data-testid={`button-move-down-${page.id}`}
                          >
                            <ChevronDown className="w-4 h-4" />
                          </Button>
                        </div>
                        
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="p-2 rounded-md bg-muted">
                            <PageIcon className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium truncate">{page.name}</h3>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className="text-xs">
                                {pageTypeInfo?.label || page.pageType}
                              </Badge>
                              <span className="text-xs text-muted-foreground">/{page.slug}</span>
                              {hasContent && (
                                <Badge variant="secondary" className="text-xs">
                                  {(page.blocks as any[]).length} blocks
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openAIModal(page.id)}
                            data-testid={`button-ai-generate-${page.id}`}
                          >
                            <Wand2 className="w-4 h-4 mr-2" />
                            AI Generate
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/funnels/${id}/pages/${page.id}/edit`)}
                            data-testid={`button-edit-page-${page.id}`}
                          >
                            <Settings className="w-4 h-4 mr-2" />
                            Edit
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => deletePageMutation.mutate(page.id)}
                            data-testid={`button-delete-page-${page.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="offers" className="space-y-6" data-testid="tab-content-offers">
          {/* Upsells Section */}
          <Card data-testid="card-upsells">
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Gift className="w-5 h-5" />
                    Upsells
                  </CardTitle>
                  <CardDescription>Offer additional products after initial purchase</CardDescription>
                </div>
                <Badge variant={funnel.upsellsEnabled ? "default" : "secondary"} data-testid="badge-upsells-status">
                  {funnel.upsellsEnabled ? "Enabled" : "Disabled"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {funnel.upsellsEnabled ? (
                <>
                  {Array.isArray(funnel.upsells) && funnel.upsells.length > 0 ? (
                    <div className="space-y-3" data-testid="list-upsells">
                      {(funnel.upsells as any[]).map((upsell, index) => (
                        <div key={upsell.id || index} className="flex items-center gap-4 p-4 border rounded-md" data-testid={`upsell-item-${index}`}>
                          <div className="flex-1">
                            <p className="font-medium" data-testid={`text-upsell-headline-${index}`}>{upsell.headline || `Upsell ${index + 1}`}</p>
                            <p className="text-sm text-muted-foreground" data-testid={`text-upsell-details-${index}`}>
                              Product: {upsell.productId ? "Assigned" : "Not assigned"}
                              {upsell.discountType && ` | ${upsell.discountValue}${upsell.discountType === 'percentage' ? '%' : ''} off`}
                            </p>
                          </div>
                          <Button size="sm" variant="outline" data-testid={`button-edit-upsell-${index}`}>
                            <Settings className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" data-testid={`button-delete-upsell-${index}`}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground" data-testid="text-no-upsells">No upsells configured. Add upsell offers to increase average order value.</p>
                  )}
                  <Button variant="outline" className="w-full" data-testid="button-add-upsell">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Upsell Offer
                  </Button>
                </>
              ) : (
                <p className="text-sm text-muted-foreground" data-testid="text-upsells-disabled">Enable upsells to configure offers.</p>
              )}
            </CardContent>
          </Card>

          {/* Downsells Section */}
          <Card data-testid="card-downsells">
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Gift className="w-5 h-5" />
                    Downsells
                  </CardTitle>
                  <CardDescription>Alternative offers when customers decline upsells</CardDescription>
                </div>
                <Badge variant={funnel.downsellsEnabled ? "default" : "secondary"} data-testid="badge-downsells-status">
                  {funnel.downsellsEnabled ? "Enabled" : "Disabled"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {funnel.downsellsEnabled ? (
                <>
                  {Array.isArray(funnel.downsells) && funnel.downsells.length > 0 ? (
                    <div className="space-y-3" data-testid="list-downsells">
                      {(funnel.downsells as any[]).map((downsell, index) => (
                        <div key={downsell.id || index} className="flex items-center gap-4 p-4 border rounded-md" data-testid={`downsell-item-${index}`}>
                          <div className="flex-1">
                            <p className="font-medium" data-testid={`text-downsell-headline-${index}`}>{downsell.headline || `Downsell ${index + 1}`}</p>
                            <p className="text-sm text-muted-foreground" data-testid={`text-downsell-details-${index}`}>
                              Product: {downsell.productId ? "Assigned" : "Not assigned"}
                            </p>
                          </div>
                          <Button size="sm" variant="outline" data-testid={`button-edit-downsell-${index}`}>
                            <Settings className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" data-testid={`button-delete-downsell-${index}`}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No downsells configured.</p>
                  )}
                  <Button variant="outline" className="w-full" data-testid="button-add-downsell">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Downsell Offer
                  </Button>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Enable downsells to configure alternative offers.</p>
              )}
            </CardContent>
          </Card>

          {/* Order Bumps Section */}
          <Card data-testid="card-order-bumps">
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5" />
                    Order Bumps
                  </CardTitle>
                  <CardDescription>Additional offers shown on checkout page</CardDescription>
                </div>
                <Badge variant={funnel.orderBumpsEnabled ? "default" : "secondary"} data-testid="badge-order-bumps-status">
                  {funnel.orderBumpsEnabled ? "Enabled" : "Disabled"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {funnel.orderBumpsEnabled ? (
                <>
                  {Array.isArray(funnel.orderBumps) && funnel.orderBumps.length > 0 ? (
                    <div className="space-y-3" data-testid="list-order-bumps">
                      {(funnel.orderBumps as any[]).map((bump, index) => (
                        <div key={bump.id || index} className="flex items-center gap-4 p-4 border rounded-md" data-testid={`order-bump-item-${index}`}>
                          <div className="flex-1">
                            <p className="font-medium" data-testid={`text-bump-headline-${index}`}>{bump.headline || `Order Bump ${index + 1}`}</p>
                            <p className="text-sm text-muted-foreground" data-testid={`text-bump-details-${index}`}>
                              Product: {bump.productId ? "Assigned" : "Not assigned"}
                            </p>
                          </div>
                          <Button size="sm" variant="outline" data-testid={`button-edit-bump-${index}`}>
                            <Settings className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" data-testid={`button-delete-bump-${index}`}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground" data-testid="text-no-order-bumps">No order bumps configured.</p>
                  )}
                  <Button variant="outline" className="w-full" data-testid="button-add-order-bump">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Order Bump
                  </Button>
                </>
              ) : (
                <p className="text-sm text-muted-foreground" data-testid="text-order-bumps-disabled">Enable order bumps to configure checkout add-ons.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Funnel Settings</CardTitle>
              <CardDescription>Configure your funnel settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Funnel Name</Label>
                <Input defaultValue={funnel.name} data-testid="input-settings-name" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea defaultValue={funnel.description || ""} data-testid="input-settings-description" />
              </div>
              <div className="space-y-2">
                <Label>Associated Product</Label>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{funnel.product?.name || "No product"}</Badge>
                  {funnel.product && (
                    <Badge variant="secondary">${Number(funnel.product.price).toFixed(2)}</Badge>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label>AI Settings</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-muted-foreground">Target Audience</span>
                    <p className="text-sm">{funnel.targetAudience || "Not specified"}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Tone</span>
                    <p className="text-sm capitalize">{funnel.tone || "Professional"}</p>
                  </div>
                </div>
                {funnel.customInstructions && (
                  <div>
                    <span className="text-xs text-muted-foreground">Custom Instructions</span>
                    <p className="text-sm">{funnel.customInstructions}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isAddPageOpen} onOpenChange={setIsAddPageOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Page</DialogTitle>
            <DialogDescription>
              Add a new page to your funnel
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="page-name">Page Name</Label>
              <Input
                id="page-name"
                placeholder="e.g., Sales Page"
                value={newPage.name}
                onChange={(e) => setNewPage({ ...newPage, name: e.target.value })}
                data-testid="input-page-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="page-slug">URL Slug</Label>
              <Input
                id="page-slug"
                placeholder="e.g., sales-page"
                value={newPage.slug}
                onChange={(e) => setNewPage({ ...newPage, slug: e.target.value })}
                data-testid="input-page-slug"
              />
            </div>
            <div className="space-y-2">
              <Label>Page Type</Label>
              <div className="grid grid-cols-1 gap-2">
                {PAGE_TYPES.map((type) => (
                  <div
                    key={type.value}
                    className={`flex items-center gap-3 p-3 rounded-md border cursor-pointer hover-elevate ${
                      newPage.pageType === type.value ? "border-primary bg-primary/5" : ""
                    }`}
                    onClick={() => setNewPage({ ...newPage, pageType: type.value })}
                    data-testid={`option-page-type-${type.value}`}
                  >
                    <type.icon className="w-5 h-5" />
                    <div>
                      <p className="font-medium">{type.label}</p>
                      <p className="text-xs text-muted-foreground">{type.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddPageOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddPage} disabled={createPageMutation.isPending} data-testid="button-confirm-add-page">
              {createPageMutation.isPending ? "Adding..." : "Add Page"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAIGenerateOpen} onOpenChange={setIsAIGenerateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              AI Page Generation
            </DialogTitle>
            <DialogDescription>
              Use AI to generate content for your page. You can provide custom instructions and content.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ai-product">Product Information</Label>
              <Input
                id="ai-product"
                placeholder="Your product name and key details"
                value={aiConfig.productInfo}
                onChange={(e) => setAiConfig({ ...aiConfig, productInfo: e.target.value })}
                data-testid="input-ai-product"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ai-audience">Target Audience</Label>
              <Input
                id="ai-audience"
                placeholder="e.g., Small business owners, beginners in marketing"
                value={aiConfig.audience}
                onChange={(e) => setAiConfig({ ...aiConfig, audience: e.target.value })}
                data-testid="input-ai-audience"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ai-tone">Tone</Label>
              <Select
                value={aiConfig.tone}
                onValueChange={(value) => setAiConfig({ ...aiConfig, tone: value })}
              >
                <SelectTrigger data-testid="select-ai-tone">
                  <SelectValue placeholder="Select tone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="casual">Casual & Friendly</SelectItem>
                  <SelectItem value="urgent">Urgent & Persuasive</SelectItem>
                  <SelectItem value="luxury">Luxury & Premium</SelectItem>
                  <SelectItem value="friendly">Warm & Approachable</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ai-instructions">Custom Instructions</Label>
              <Textarea
                id="ai-instructions"
                placeholder="Add any specific requirements, content you want included, or style preferences..."
                value={aiConfig.instructions}
                onChange={(e) => setAiConfig({ ...aiConfig, instructions: e.target.value })}
                rows={4}
                data-testid="input-ai-instructions"
              />
              <p className="text-xs text-muted-foreground">
                Tip: Include specific headlines, benefits, or testimonials you want the AI to use.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAIGenerateOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAIGenerate} 
              disabled={generatePageMutation.isPending}
              data-testid="button-confirm-ai-generate"
            >
              {generatePageMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 mr-2" />
                  Generate Content
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
