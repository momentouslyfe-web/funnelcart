import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import {
  ArrowLeft,
  Save,
  Eye,
  Undo,
  Redo,
  Monitor,
  Tablet,
  Smartphone,
  Settings2,
  Loader2,
  GripVertical,
  Plus,
  Trash2,
  Type,
  Image,
  MousePointer2,
  Star,
  Clock,
  Minus,
  ArrowUpDown,
  CreditCard,
  Shield,
  LayoutTemplate,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { CheckoutPage, Product, Block } from "@shared/schema";

interface CheckoutPageWithProduct extends CheckoutPage {
  product?: Product;
}

const blockTypes = [
  { type: "heading", icon: Type, label: "Heading" },
  { type: "text", icon: Type, label: "Text" },
  { type: "image", icon: Image, label: "Image" },
  { type: "button", icon: MousePointer2, label: "Button" },
  { type: "pricing", icon: CreditCard, label: "Pricing" },
  { type: "testimonial", icon: Star, label: "Testimonial" },
  { type: "countdown", icon: Clock, label: "Countdown" },
  { type: "divider", icon: Minus, label: "Divider" },
  { type: "spacer", icon: ArrowUpDown, label: "Spacer" },
  { type: "features", icon: LayoutTemplate, label: "Features" },
  { type: "guarantee", icon: Shield, label: "Guarantee" },
  { type: "orderBump", icon: Plus, label: "Order Bump" },
  { type: "paymentForm", icon: CreditCard, label: "Payment Form" },
];

function BlockComponent({
  block,
  isSelected,
  onSelect,
  onDelete,
  onUpdate,
}: {
  block: Block;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onUpdate: (content: Record<string, any>) => void;
}) {
  const renderBlockContent = () => {
    switch (block.type) {
      case "hero":
        return (
          <div className="p-8 text-center bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg">
            <h1 className="text-3xl font-bold mb-2">{block.content.title || "Hero Title"}</h1>
            <p className="text-muted-foreground">{block.content.subtitle || "Subtitle goes here"}</p>
          </div>
        );
      case "heading":
        return (
          <h2 className="text-2xl font-bold">{block.content.text || "Heading"}</h2>
        );
      case "text":
        return (
          <p className="text-base">{block.content.text || "Add your text content here..."}</p>
        );
      case "image":
        return (
          <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
            {block.content.url ? (
              <img src={block.content.url} alt="" className="w-full h-full object-cover rounded-lg" />
            ) : (
              <Image className="h-12 w-12 text-muted-foreground/50" />
            )}
          </div>
        );
      case "button":
        return (
          <Button className="w-full">{block.content.text || "Click Here"}</Button>
        );
      case "pricing":
        return (
          <div className="p-6 text-center border rounded-lg">
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="text-4xl font-bold">$29.99</span>
              <span className="text-lg text-muted-foreground line-through">$49.99</span>
            </div>
            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
              Save 40%
            </Badge>
          </div>
        );
      case "testimonial":
        return (
          <div className="p-6 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-1 mb-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              ))}
            </div>
            <p className="italic mb-4">"{block.content.quote || "This product changed my life!"}"</p>
            <p className="font-semibold">{block.content.author || "Happy Customer"}</p>
          </div>
        );
      case "countdown":
        return (
          <div className="p-4 bg-destructive/10 rounded-lg text-center">
            <p className="text-sm font-medium mb-2">Offer Ends In:</p>
            <div className="flex items-center justify-center gap-2">
              {["23", "59", "59"].map((val, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="bg-background px-3 py-2 rounded font-mono text-xl font-bold">
                    {val}
                  </div>
                  {i < 2 && <span className="text-xl font-bold">:</span>}
                </div>
              ))}
            </div>
          </div>
        );
      case "divider":
        return <Separator />;
      case "spacer":
        return <div className="h-8" />;
      case "features":
        return (
          <div className="space-y-3">
            <h3 className="font-semibold">{block.content.title || "What's Included"}</h3>
            <ul className="space-y-2">
              {(block.content.items || ["Feature 1", "Feature 2", "Feature 3"]).map((item: string, i: number) => (
                <li key={i} className="flex items-center gap-2">
                  <div className="h-5 w-5 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                    <span className="text-green-600 dark:text-green-400 text-xs">✓</span>
                  </div>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        );
      case "guarantee":
        return (
          <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg">
            <Shield className="h-8 w-8 text-green-600 flex-shrink-0" />
            <div>
              <h4 className="font-semibold">{block.content.title || "Money-Back Guarantee"}</h4>
              <p className="text-sm text-muted-foreground">{block.content.description || "Full refund within 30 days"}</p>
            </div>
          </div>
        );
      case "orderBump":
        return (
          <div className="p-4 border-2 border-dashed border-primary/50 rounded-lg bg-primary/5">
            <div className="flex items-center gap-3">
              <input type="checkbox" className="h-5 w-5" />
              <div>
                <p className="font-semibold">{block.content.headline || "Add this to your order!"}</p>
                <p className="text-sm text-muted-foreground">{block.content.description || "Special offer for you"}</p>
              </div>
            </div>
          </div>
        );
      case "paymentForm":
        return (
          <div className="p-6 border rounded-lg space-y-4">
            <h3 className="font-semibold">Payment Details</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Email</label>
                <Input placeholder="email@example.com" disabled />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Full Name</label>
                <Input placeholder="John Doe" disabled />
              </div>
              <Button className="w-full" disabled>Complete Purchase</Button>
            </div>
          </div>
        );
      default:
        return <div className="p-4 bg-muted rounded">Unknown block type</div>;
    }
  };

  return (
    <div
      className={`relative group cursor-pointer transition-all ${
        isSelected ? "ring-2 ring-primary" : "hover:ring-2 hover:ring-primary/50"
      }`}
      onClick={onSelect}
      data-testid={`block-${block.id}`}
    >
      <div className="absolute left-0 top-0 bottom-0 w-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-muted/50 rounded-l">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="pl-8 pr-4 py-2">
        {renderBlockContent()}
      </div>
      {isSelected && (
        <Button
          variant="destructive"
          size="icon"
          className="absolute -right-2 -top-2 h-6 w-6"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          data-testid={`delete-block-${block.id}`}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

function BlockPropertiesPanel({
  block,
  onUpdate,
}: {
  block: Block | null;
  onUpdate: (content: Record<string, any>) => void;
}) {
  if (!block) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        <Settings2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>Select a block to edit its properties</p>
      </div>
    );
  }

  const renderFields = () => {
    switch (block.type) {
      case "hero":
        return (
          <>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={block.content.title || ""}
                onChange={(e) => onUpdate({ ...block.content, title: e.target.value })}
                data-testid="input-hero-title"
              />
            </div>
            <div className="space-y-2">
              <Label>Subtitle</Label>
              <Textarea
                value={block.content.subtitle || ""}
                onChange={(e) => onUpdate({ ...block.content, subtitle: e.target.value })}
                data-testid="input-hero-subtitle"
              />
            </div>
          </>
        );
      case "heading":
      case "text":
        return (
          <div className="space-y-2">
            <Label>Text</Label>
            <Textarea
              value={block.content.text || ""}
              onChange={(e) => onUpdate({ ...block.content, text: e.target.value })}
              data-testid="input-text-content"
            />
          </div>
        );
      case "image":
        return (
          <div className="space-y-2">
            <Label>Image URL</Label>
            <Input
              value={block.content.url || ""}
              onChange={(e) => onUpdate({ ...block.content, url: e.target.value })}
              placeholder="https://..."
              data-testid="input-image-url"
            />
          </div>
        );
      case "button":
        return (
          <>
            <div className="space-y-2">
              <Label>Button Text</Label>
              <Input
                value={block.content.text || ""}
                onChange={(e) => onUpdate({ ...block.content, text: e.target.value })}
                data-testid="input-button-text"
              />
            </div>
            <div className="space-y-2">
              <Label>Link URL</Label>
              <Input
                value={block.content.url || ""}
                onChange={(e) => onUpdate({ ...block.content, url: e.target.value })}
                placeholder="#"
                data-testid="input-button-url"
              />
            </div>
          </>
        );
      case "testimonial":
        return (
          <>
            <div className="space-y-2">
              <Label>Quote</Label>
              <Textarea
                value={block.content.quote || ""}
                onChange={(e) => onUpdate({ ...block.content, quote: e.target.value })}
                data-testid="input-testimonial-quote"
              />
            </div>
            <div className="space-y-2">
              <Label>Author</Label>
              <Input
                value={block.content.author || ""}
                onChange={(e) => onUpdate({ ...block.content, author: e.target.value })}
                data-testid="input-testimonial-author"
              />
            </div>
          </>
        );
      case "features":
        return (
          <>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={block.content.title || ""}
                onChange={(e) => onUpdate({ ...block.content, title: e.target.value })}
                data-testid="input-features-title"
              />
            </div>
            <div className="space-y-2">
              <Label>Items (one per line)</Label>
              <Textarea
                value={(block.content.items || []).join("\n")}
                onChange={(e) => onUpdate({ ...block.content, items: e.target.value.split("\n").filter(Boolean) })}
                className="min-h-[100px]"
                data-testid="input-features-items"
              />
            </div>
          </>
        );
      case "guarantee":
        return (
          <>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={block.content.title || ""}
                onChange={(e) => onUpdate({ ...block.content, title: e.target.value })}
                data-testid="input-guarantee-title"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={block.content.description || ""}
                onChange={(e) => onUpdate({ ...block.content, description: e.target.value })}
                data-testid="input-guarantee-description"
              />
            </div>
          </>
        );
      case "orderBump":
        return (
          <>
            <div className="space-y-2">
              <Label>Headline</Label>
              <Input
                value={block.content.headline || ""}
                onChange={(e) => onUpdate({ ...block.content, headline: e.target.value })}
                data-testid="input-bump-headline"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={block.content.description || ""}
                onChange={(e) => onUpdate({ ...block.content, description: e.target.value })}
                data-testid="input-bump-description"
              />
            </div>
          </>
        );
      default:
        return <p className="text-sm text-muted-foreground">No editable properties</p>;
    }
  };

  return (
    <div className="space-y-4 p-4">
      <div>
        <h4 className="font-semibold capitalize">{block.type} Settings</h4>
        <p className="text-sm text-muted-foreground">Customize this block</p>
      </div>
      <Separator />
      {renderFields()}
    </div>
  );
}

export default function PageEditor() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [isPublished, setIsPublished] = useState(false);

  const { data: page, isLoading } = useQuery<CheckoutPageWithProduct>({
    queryKey: ["/api/checkout-pages", params.id],
    enabled: !!params.id,
  });

  useEffect(() => {
    if (page) {
      setBlocks((page.blocks as Block[]) || []);
      setIsPublished(page.isPublished || false);
    }
  }, [page]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("PATCH", `/api/checkout-pages/${params.id}`, {
        blocks,
        isPublished,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/checkout-pages"] });
      toast({
        title: "Changes saved",
        description: "Your checkout page has been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save changes. Please try again.",
        variant: "destructive",
      });
    },
  });

  const addBlock = (type: string) => {
    const newBlock: Block = {
      id: `${type}-${Date.now()}`,
      type: type as Block["type"],
      content: {},
      position: blocks.length,
    };
    setBlocks([...blocks, newBlock]);
    setSelectedBlockId(newBlock.id);
  };

  const deleteBlock = (id: string) => {
    setBlocks(blocks.filter((b) => b.id !== id));
    if (selectedBlockId === id) {
      setSelectedBlockId(null);
    }
  };

  const updateBlock = (id: string, content: Record<string, any>) => {
    setBlocks(blocks.map((b) => (b.id === id ? { ...b, content } : b)));
  };

  const selectedBlock = blocks.find((b) => b.id === selectedBlockId) || null;

  const viewModeWidths = {
    desktop: "w-full",
    tablet: "w-[768px]",
    mobile: "w-[375px]",
  };

  if (isLoading) {
    return (
      <div className="h-screen flex">
        <div className="w-64 border-r p-4">
          <Skeleton className="h-8 w-full mb-4" />
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </div>
        <div className="flex-1 p-4">
          <Skeleton className="h-full w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Top Bar */}
      <div className="border-b bg-background px-4 py-2 flex items-center justify-between gap-4 z-10">
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
            <h1 className="font-semibold">{page?.name}</h1>
            <p className="text-xs text-muted-foreground">/{page?.slug}</p>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          <Button
            variant={viewMode === "desktop" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("desktop")}
            data-testid="button-view-desktop"
          >
            <Monitor className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "tablet" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("tablet")}
            data-testid="button-view-tablet"
          >
            <Tablet className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "mobile" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("mobile")}
            data-testid="button-view-mobile"
          >
            <Smartphone className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="published" className="text-sm">Published</Label>
            <Switch
              id="published"
              checked={isPublished}
              onCheckedChange={setIsPublished}
              data-testid="switch-publish"
            />
          </div>
          <Button
            variant="outline"
            asChild
          >
            <a href={`/c/${page?.slug}`} target="_blank" rel="noopener noreferrer" data-testid="button-preview">
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </a>
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            data-testid="button-save"
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save
          </Button>
        </div>
      </div>

      {/* Main Editor Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Block Palette */}
        <div className="w-64 border-r bg-background overflow-y-auto">
          <div className="p-4">
            <h3 className="font-semibold mb-4">Add Blocks</h3>
            <div className="grid grid-cols-2 gap-2">
              {blockTypes.map((block) => (
                <Button
                  key={block.type}
                  variant="outline"
                  className="h-auto flex-col py-3 gap-1"
                  onClick={() => addBlock(block.type)}
                  data-testid={`add-block-${block.type}`}
                >
                  <block.icon className="h-5 w-5" />
                  <span className="text-xs">{block.label}</span>
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 bg-muted/30 overflow-auto p-8">
          <div className={`mx-auto ${viewModeWidths[viewMode]} transition-all duration-300`}>
            <Card className="min-h-[600px]">
              <CardContent className="p-6">
                {blocks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <LayoutTemplate className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <h3 className="font-semibold mb-2">Start Building</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Add blocks from the left panel to build your checkout page
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {blocks.map((block) => (
                      <BlockComponent
                        key={block.id}
                        block={block}
                        isSelected={selectedBlockId === block.id}
                        onSelect={() => setSelectedBlockId(block.id)}
                        onDelete={() => deleteBlock(block.id)}
                        onUpdate={(content) => updateBlock(block.id, content)}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Sidebar - Properties Panel */}
        <div className="w-80 border-l bg-background overflow-y-auto">
          <BlockPropertiesPanel
            block={selectedBlock}
            onUpdate={(content) => {
              if (selectedBlockId) {
                updateBlock(selectedBlockId, content);
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
