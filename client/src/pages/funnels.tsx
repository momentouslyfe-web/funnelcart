import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Plus, MoreVertical, Trash2, Edit, Eye, Layers, ShoppingCart, ArrowUpRight, ArrowDownRight, Package } from "lucide-react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Funnel, Product, FunnelOffer } from "@shared/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

type FunnelFormData = {
  name: string;
  description: string;
  productId: string;
  upsellsEnabled: boolean;
  downsellsEnabled: boolean;
  orderBumpsEnabled: boolean;
  upsells: FunnelOffer[];
  downsells: FunnelOffer[];
  orderBumps: FunnelOffer[];
  customInstructions: string;
  targetAudience: string;
  tone: string;
  additionalContent: string;
};

const defaultFormData: FunnelFormData = {
  name: "",
  description: "",
  productId: "",
  upsellsEnabled: false,
  downsellsEnabled: false,
  orderBumpsEnabled: false,
  upsells: [],
  downsells: [],
  orderBumps: [],
  customInstructions: "",
  targetAudience: "",
  tone: "professional",
  additionalContent: "",
};

function OfferManager({ 
  type, 
  offers, 
  products, 
  onAdd, 
  onRemove, 
  onUpdate 
}: { 
  type: 'upsells' | 'downsells' | 'orderBumps';
  offers: FunnelOffer[];
  products: Product[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, field: keyof FunnelOffer, value: any) => void;
}) {
  const typeLabel = type === 'upsells' ? 'Upsell' : type === 'downsells' ? 'Downsell' : 'Order Bump';
  
  return (
    <div className="space-y-3">
      {offers.map((offer, index) => (
        <Card key={offer.id} className="p-3">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium">{typeLabel} {index + 1}</span>
              <Button 
                size="icon" 
                variant="ghost" 
                onClick={() => onRemove(offer.id)}
                data-testid={`button-remove-${type}-${index}`}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
            <Select
              value={offer.productId}
              onValueChange={(value) => {
                const product = products.find(p => p.id === value);
                onUpdate(offer.id, 'productId', value);
                if (product) {
                  onUpdate(offer.id, 'productName', product.name);
                }
              }}
            >
              <SelectTrigger data-testid={`select-${type}-product-${index}`}>
                <SelectValue placeholder="Select product" />
              </SelectTrigger>
              <SelectContent>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name} - ${product.price}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Headline (e.g., Special One-Time Offer!)"
              value={offer.headline || ""}
              onChange={(e) => onUpdate(offer.id, 'headline', e.target.value)}
              data-testid={`input-${type}-headline-${index}`}
            />
            <div className="flex gap-2">
              <Select
                value={offer.discountType || 'percentage'}
                onValueChange={(value) => onUpdate(offer.id, 'discountType', value)}
              >
                <SelectTrigger className="w-32" data-testid={`select-${type}-discount-type-${index}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">% Off</SelectItem>
                  <SelectItem value="fixed">$ Off</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="number"
                placeholder="Discount"
                value={offer.discountValue || ""}
                onChange={(e) => onUpdate(offer.id, 'discountValue', parseFloat(e.target.value) || 0)}
                data-testid={`input-${type}-discount-${index}`}
              />
            </div>
          </div>
        </Card>
      ))}
      <Button 
        variant="outline" 
        size="sm" 
        onClick={onAdd}
        className="w-full"
        data-testid={`button-add-${type}`}
      >
        <Plus className="w-4 h-4 mr-2" />
        Add {typeLabel}
      </Button>
    </div>
  );
}

export default function FunnelsPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState<FunnelFormData>(defaultFormData);

  const { data: funnels = [], isLoading } = useQuery<(Funnel & { pages?: any[]; product?: Product })[]>({
    queryKey: ["/api/funnels"],
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: FunnelFormData) => {
      return apiRequest("POST", "/api/funnels", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/funnels"] });
      setIsCreateOpen(false);
      setFormData(defaultFormData);
      toast({ title: "Funnel created successfully" });
    },
    onError: (error: any) => {
      toast({ title: error.message || "Failed to create funnel", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/funnels/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/funnels"] });
      toast({ title: "Funnel deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete funnel", variant: "destructive" });
    },
  });

  const handleCreate = () => {
    if (!formData.name.trim()) {
      toast({ title: "Please enter a funnel name", variant: "destructive" });
      return;
    }
    if (!formData.productId) {
      toast({ title: "Please select a product (required)", variant: "destructive" });
      return;
    }
    createMutation.mutate(formData);
  };

  const addOffer = (type: 'upsells' | 'downsells' | 'orderBumps') => {
    const newOffer: FunnelOffer = {
      id: crypto.randomUUID(),
      productId: "",
      headline: "",
      discountType: "percentage",
      discountValue: 0,
      sortOrder: formData[type].length,
    };
    setFormData({ ...formData, [type]: [...formData[type], newOffer] });
  };

  const removeOffer = (type: 'upsells' | 'downsells' | 'orderBumps', id: string) => {
    setFormData({ ...formData, [type]: formData[type].filter(o => o.id !== id) });
  };

  const updateOffer = (type: 'upsells' | 'downsells' | 'orderBumps', id: string, field: keyof FunnelOffer, value: any) => {
    setFormData({
      ...formData,
      [type]: formData[type].map(o => o.id === id ? { ...o, [field]: value } : o),
    });
  };

  const selectedProduct = products.find(p => p.id === formData.productId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Sales Funnels</h1>
          <p className="text-muted-foreground">Create and manage your sales funnels with AI-powered page builder</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-funnel">
              <Plus className="w-4 h-4 mr-2" />
              Create Funnel
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Create New Sales Funnel</DialogTitle>
              <DialogDescription>
                Set up a complete sales funnel with checkout, upsells, downsells, and order bumps
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh] pr-4">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-4">
                  <TabsTrigger value="basic">Basic Info</TabsTrigger>
                  <TabsTrigger value="offers">Offers</TabsTrigger>
                  <TabsTrigger value="ai">AI Settings</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="funnel-name">Funnel Name *</Label>
                    <Input
                      id="funnel-name"
                      placeholder="e.g., Ebook Launch Funnel"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      data-testid="input-funnel-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="funnel-description">Description</Label>
                    <Textarea
                      id="funnel-description"
                      placeholder="Describe your funnel..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      data-testid="input-funnel-description"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="funnel-product">Main Product * (Required)</Label>
                    {products.length === 0 ? (
                      <div className="p-4 border rounded-md bg-muted">
                        <p className="text-sm text-muted-foreground">No products available. Please create a product first.</p>
                        <Button variant="ghost" className="p-0 h-auto text-primary" onClick={() => navigate("/products")}>
                          Go to Products
                        </Button>
                      </div>
                    ) : (
                      <Select
                        value={formData.productId}
                        onValueChange={(value) => setFormData({ ...formData, productId: value })}
                      >
                        <SelectTrigger data-testid="select-funnel-product">
                          <SelectValue placeholder="Select main product" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((product) => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.name} - ${product.price}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {selectedProduct && (
                      <div className="p-3 bg-muted rounded-md mt-2">
                        <p className="font-medium">{selectedProduct.name}</p>
                        <p className="text-sm text-muted-foreground">{selectedProduct.description}</p>
                        <p className="text-sm font-medium mt-1">${selectedProduct.price}</p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="offers" className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4" />
                        <Label>Order Bumps</Label>
                      </div>
                      <Switch
                        checked={formData.orderBumpsEnabled}
                        onCheckedChange={(checked) => setFormData({ ...formData, orderBumpsEnabled: checked })}
                        data-testid="switch-order-bumps"
                      />
                    </div>
                    {formData.orderBumpsEnabled && (
                      <OfferManager
                        type="orderBumps"
                        offers={formData.orderBumps}
                        products={products}
                        onAdd={() => addOffer('orderBumps')}
                        onRemove={(id) => removeOffer('orderBumps', id)}
                        onUpdate={(id, field, value) => updateOffer('orderBumps', id, field, value)}
                      />
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <ArrowUpRight className="w-4 h-4" />
                        <Label>One-Click Upsells</Label>
                      </div>
                      <Switch
                        checked={formData.upsellsEnabled}
                        onCheckedChange={(checked) => setFormData({ ...formData, upsellsEnabled: checked })}
                        data-testid="switch-upsells"
                      />
                    </div>
                    {formData.upsellsEnabled && (
                      <OfferManager
                        type="upsells"
                        offers={formData.upsells}
                        products={products}
                        onAdd={() => addOffer('upsells')}
                        onRemove={(id) => removeOffer('upsells', id)}
                        onUpdate={(id, field, value) => updateOffer('upsells', id, field, value)}
                      />
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <ArrowDownRight className="w-4 h-4" />
                        <Label>Downsells</Label>
                      </div>
                      <Switch
                        checked={formData.downsellsEnabled}
                        onCheckedChange={(checked) => setFormData({ ...formData, downsellsEnabled: checked })}
                        data-testid="switch-downsells"
                      />
                    </div>
                    {formData.downsellsEnabled && (
                      <OfferManager
                        type="downsells"
                        offers={formData.downsells}
                        products={products}
                        onAdd={() => addOffer('downsells')}
                        onRemove={(id) => removeOffer('downsells', id)}
                        onUpdate={(id, field, value) => updateOffer('downsells', id, field, value)}
                      />
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="ai" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="target-audience">Target Audience</Label>
                    <Input
                      id="target-audience"
                      placeholder="e.g., Small business owners, entrepreneurs"
                      value={formData.targetAudience}
                      onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                      data-testid="input-target-audience"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tone">Tone</Label>
                    <Select
                      value={formData.tone}
                      onValueChange={(value) => setFormData({ ...formData, tone: value })}
                    >
                      <SelectTrigger data-testid="select-tone">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="professional">Professional</SelectItem>
                        <SelectItem value="casual">Casual & Friendly</SelectItem>
                        <SelectItem value="urgent">Urgent & Persuasive</SelectItem>
                        <SelectItem value="inspirational">Inspirational</SelectItem>
                        <SelectItem value="educational">Educational</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="custom-instructions">Custom Instructions for AI</Label>
                    <Textarea
                      id="custom-instructions"
                      placeholder="Add specific instructions for AI page generation..."
                      value={formData.customInstructions}
                      onChange={(e) => setFormData({ ...formData, customInstructions: e.target.value })}
                      rows={3}
                      data-testid="input-custom-instructions"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="additional-content">Additional Content/Copy</Label>
                    <Textarea
                      id="additional-content"
                      placeholder="Add testimonials, unique selling points, or specific content to include..."
                      value={formData.additionalContent}
                      onChange={(e) => setFormData({ ...formData, additionalContent: e.target.value })}
                      rows={4}
                      data-testid="input-additional-content"
                    />
                  </div>
                  <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-md">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      AI will use your product title, description, and pricing along with these settings to generate optimized funnel pages.
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </ScrollArea>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreate} 
                disabled={createMutation.isPending || !formData.productId} 
                data-testid="button-confirm-create"
              >
                {createMutation.isPending ? "Creating..." : "Create Funnel"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {funnels.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Layers className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2" data-testid="text-empty-state">No funnels yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first sales funnel to start selling your digital products
            </p>
            <Button onClick={() => setIsCreateOpen(true)} data-testid="button-create-first">
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Funnel
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {funnels.map((funnel) => (
            <Card key={funnel.id} className="hover-elevate" data-testid={`card-funnel-${funnel.id}`}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">{funnel.name}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {funnel.description || "No description"}
                    </CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost" data-testid={`button-menu-${funnel.id}`}>
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => navigate(`/funnels/${funnel.id}`)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Eye className="w-4 h-4 mr-2" />
                        Preview
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-destructive"
                        onClick={() => deleteMutation.mutate(funnel.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {funnel.product && (
                    <div className="flex items-center gap-2 text-sm">
                      <ShoppingCart className="w-4 h-4 text-muted-foreground" />
                      <span className="truncate">{funnel.product.name}</span>
                      <Badge variant="secondary" className="ml-auto">${funnel.product.price}</Badge>
                    </div>
                  )}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={funnel.isPublished ? "default" : "secondary"}>
                      {funnel.isPublished ? "Published" : "Draft"}
                    </Badge>
                    {funnel.upsellsEnabled && (
                      <Badge variant="outline">
                        <ArrowUpRight className="w-3 h-3 mr-1" />
                        Upsells
                      </Badge>
                    )}
                    {funnel.downsellsEnabled && (
                      <Badge variant="outline">
                        <ArrowDownRight className="w-3 h-3 mr-1" />
                        Downsells
                      </Badge>
                    )}
                    {funnel.orderBumpsEnabled && (
                      <Badge variant="outline">
                        <Package className="w-3 h-3 mr-1" />
                        Bumps
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Layers className="w-4 h-4" />
                    <span>{funnel.pages?.length || 0} pages</span>
                  </div>
                </div>
                <Button 
                  className="w-full mt-4" 
                  variant="outline"
                  onClick={() => navigate(`/funnels/${funnel.id}`)}
                  data-testid={`button-edit-${funnel.id}`}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Funnel
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
