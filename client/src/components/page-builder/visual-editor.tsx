import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Plus, Trash2, MoveUp, MoveDown, Copy, Eye, EyeOff, Smartphone, Tablet, Monitor,
  Type, Image, ImageIcon, Video, ListOrdered, Quote, Star, CheckCircle, Timer,
  Users, ShoppingBag, Shield, Award, HelpCircle, BarChart3, Mail, Phone, MapPin,
  Link2, Box, Rows3, Columns3, Minus, MousePointer, Play, FileText, Gift, Zap,
  Loader2, Wand2, Save, Settings2, ChevronLeft, ChevronRight, Palette, Layout,
  RotateCcw, Check, X, Grip, GripVertical
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

type BlockType = 
  | 'header' | 'subheader' | 'paragraph' | 'list' | 'quote'
  | 'image' | 'video' | 'gallery' | 'hero' | 'banner'
  | 'cta' | 'button' | 'product-card' | 'pricing' | 'pricing-table'
  | 'features' | 'benefits' | 'testimonials' | 'reviews' | 'social-proof'
  | 'trust-badges' | 'countdown' | 'progress' | 'stats' | 'achievements'
  | 'faq' | 'contact' | 'newsletter' | 'author' | 'about'
  | 'spacer' | 'divider' | 'columns' | 'section' | 'container';

type ResponsiveStyle = {
  desktop?: Record<string, string>;
  tablet?: Record<string, string>;
  mobile?: Record<string, string>;
};

type PageBlock = {
  id: string;
  type: BlockType;
  content: Record<string, any>;
  styles: ResponsiveStyle;
  visible: boolean;
  order: number;
};

type BlockCategory = {
  name: string;
  icon: any;
  blocks: { type: BlockType; label: string; icon: any; description: string }[];
};

const blockCategories: BlockCategory[] = [
  {
    name: "Text & Content",
    icon: Type,
    blocks: [
      { type: "header", label: "Header", icon: Type, description: "Main headline text" },
      { type: "subheader", label: "Subheader", icon: Type, description: "Secondary headline" },
      { type: "paragraph", label: "Paragraph", icon: FileText, description: "Body text content" },
      { type: "list", label: "List", icon: ListOrdered, description: "Bullet or numbered list" },
      { type: "quote", label: "Quote", icon: Quote, description: "Blockquote or testimonial" },
    ],
  },
  {
    name: "Media",
    icon: ImageIcon,
    blocks: [
      { type: "image", label: "Image", icon: Image, description: "Single image" },
      { type: "video", label: "Video", icon: Video, description: "Video embed" },
      { type: "gallery", label: "Gallery", icon: Rows3, description: "Image gallery" },
      { type: "hero", label: "Hero Section", icon: Layout, description: "Full-width hero" },
      { type: "banner", label: "Banner", icon: ImageIcon, description: "Promotional banner" },
    ],
  },
  {
    name: "Conversion",
    icon: MousePointer,
    blocks: [
      { type: "cta", label: "Call to Action", icon: MousePointer, description: "Action prompt" },
      { type: "button", label: "Button", icon: Play, description: "Clickable button" },
      { type: "product-card", label: "Product Card", icon: ShoppingBag, description: "Product showcase" },
      { type: "pricing", label: "Pricing Box", icon: Gift, description: "Single price option" },
      { type: "pricing-table", label: "Pricing Table", icon: Columns3, description: "Multiple prices" },
    ],
  },
  {
    name: "Features & Benefits",
    icon: CheckCircle,
    blocks: [
      { type: "features", label: "Features List", icon: Zap, description: "Feature highlights" },
      { type: "benefits", label: "Benefits Grid", icon: CheckCircle, description: "Benefit cards" },
      { type: "stats", label: "Statistics", icon: BarChart3, description: "Number showcase" },
      { type: "achievements", label: "Achievements", icon: Award, description: "Awards and badges" },
    ],
  },
  {
    name: "Social Proof",
    icon: Star,
    blocks: [
      { type: "testimonials", label: "Testimonials", icon: Quote, description: "Customer quotes" },
      { type: "reviews", label: "Reviews", icon: Star, description: "Star ratings" },
      { type: "social-proof", label: "Social Proof", icon: Users, description: "Customer count" },
      { type: "trust-badges", label: "Trust Badges", icon: Shield, description: "Security icons" },
    ],
  },
  {
    name: "Interactive",
    icon: Timer,
    blocks: [
      { type: "countdown", label: "Countdown", icon: Timer, description: "Timer widget" },
      { type: "progress", label: "Progress Bar", icon: BarChart3, description: "Progress indicator" },
      { type: "faq", label: "FAQ", icon: HelpCircle, description: "Q&A section" },
    ],
  },
  {
    name: "Contact & Info",
    icon: Mail,
    blocks: [
      { type: "contact", label: "Contact Form", icon: Mail, description: "Contact details" },
      { type: "newsletter", label: "Newsletter", icon: Mail, description: "Email signup" },
      { type: "author", label: "Author Bio", icon: Users, description: "Creator info" },
      { type: "about", label: "About Section", icon: FileText, description: "About content" },
    ],
  },
  {
    name: "Layout",
    icon: Box,
    blocks: [
      { type: "spacer", label: "Spacer", icon: Minus, description: "Vertical space" },
      { type: "divider", label: "Divider", icon: Minus, description: "Horizontal line" },
      { type: "columns", label: "Columns", icon: Columns3, description: "Multi-column layout" },
      { type: "section", label: "Section", icon: Box, description: "Content section" },
      { type: "container", label: "Container", icon: Box, description: "Content wrapper" },
    ],
  },
];

const deviceModes = [
  { id: 'desktop', label: 'Desktop', icon: Monitor, width: '100%' },
  { id: 'tablet', label: 'Tablet', icon: Tablet, width: '768px' },
  { id: 'mobile', label: 'Mobile', icon: Smartphone, width: '375px' },
];

type VisualEditorProps = {
  initialBlocks?: PageBlock[];
  productName?: string;
  productDescription?: string;
  onSave?: (blocks: PageBlock[]) => void;
};

export function VisualEditor({ initialBlocks = [], productName = "", productDescription = "", onSave }: VisualEditorProps) {
  const { toast } = useToast();
  const [blocks, setBlocks] = useState<PageBlock[]>(initialBlocks);
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  const [deviceMode, setDeviceMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [showBlockPanel, setShowBlockPanel] = useState(true);
  const [showPropertiesPanel, setShowPropertiesPanel] = useState(true);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [customInstructions, setCustomInstructions] = useState("");
  const [contentInput, setContentInput] = useState(productDescription);
  const [selectedTemplate, setSelectedTemplate] = useState("sales");

  const { data: modelsData } = useQuery<{ models: { gemini: string[]; openrouter: string[] }; configured: { gemini: boolean; openrouter: boolean } }>({
    queryKey: ["/api/ai-builder/models"],
  });

  const generateMutation = useMutation({
    mutationFn: async (request: any) => {
      const response = await apiRequest("POST", "/api/ai-builder/generate", request);
      return response.json();
    },
    onSuccess: (data) => {
      const generatedBlocks = data.blocks || data.page?.blocks || [];
      if (generatedBlocks.length > 0) {
        const blocksWithIds = generatedBlocks.map((block: any, index: number) => ({
          ...block,
          id: block.id || `block-${Date.now()}-${index}`,
          visible: true,
          order: index,
        }));
        setBlocks(blocksWithIds);
        toast({ title: "Page generated", description: "AI has created your page structure." });
        setAiDialogOpen(false);
      } else {
        toast({ title: "No blocks generated", description: "AI did not return any blocks.", variant: "destructive" });
      }
    },
    onError: () => {
      toast({ title: "Generation failed", description: "Could not generate page. Check AI configuration.", variant: "destructive" });
    },
  });

  const addBlock = useCallback((type: BlockType) => {
    const newBlock: PageBlock = {
      id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      content: getDefaultContent(type),
      styles: getDefaultStyles(type),
      visible: true,
      order: blocks.length,
    };
    setBlocks([...blocks, newBlock]);
    setSelectedBlock(newBlock.id);
  }, [blocks]);

  const removeBlock = useCallback((id: string) => {
    setBlocks(blocks.filter((b) => b.id !== id));
    if (selectedBlock === id) setSelectedBlock(null);
  }, [blocks, selectedBlock]);

  const duplicateBlock = useCallback((id: string) => {
    const block = blocks.find((b) => b.id === id);
    if (block) {
      const newBlock = {
        ...block,
        id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        order: blocks.length,
      };
      setBlocks([...blocks, newBlock]);
    }
  }, [blocks]);

  const moveBlock = useCallback((id: string, direction: 'up' | 'down') => {
    const index = blocks.findIndex((b) => b.id === id);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === blocks.length - 1) return;
    
    const newBlocks = [...blocks];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newBlocks[index], newBlocks[targetIndex]] = [newBlocks[targetIndex], newBlocks[index]];
    setBlocks(newBlocks);
  }, [blocks]);

  const toggleVisibility = useCallback((id: string) => {
    setBlocks(blocks.map((b) => b.id === id ? { ...b, visible: !b.visible } : b));
  }, [blocks]);

  const updateBlockContent = useCallback((id: string, content: Record<string, any>) => {
    setBlocks(blocks.map((b) => b.id === id ? { ...b, content: { ...b.content, ...content } } : b));
  }, [blocks]);

  const updateBlockStyles = useCallback((id: string, styles: ResponsiveStyle) => {
    setBlocks(blocks.map((b) => b.id === id ? { ...b, styles: { ...b.styles, ...styles } } : b));
  }, [blocks]);

  const handleAIGenerate = () => {
    generateMutation.mutate({
      pageType: selectedTemplate,
      productName: productName || "Digital Product",
      productDescription: contentInput || productDescription,
      providedContent: contentInput || productDescription,
      customInstructions: customInstructions,
      style: 'modern',
      provider: modelsData?.configured.gemini ? 'gemini' : 'openrouter',
      model: modelsData?.configured.gemini ? 'gemini-2.5-flash' : 'meta-llama/llama-3.1-8b-instruct:free',
    });
  };

  const handleSave = () => {
    if (onSave) {
      onSave(blocks);
    }
    toast({ title: "Saved", description: "Your page changes have been saved." });
  };

  const selectedBlockData = blocks.find((b) => b.id === selectedBlock);

  return (
    <div className="flex h-full" data-testid="visual-editor">
      {showBlockPanel && (
        <div className="w-72 border-r bg-muted/30 flex flex-col">
          <div className="p-3 border-b flex items-center justify-between gap-2">
            <h3 className="font-semibold text-sm">Blocks</h3>
            <Button size="icon" variant="ghost" onClick={() => setShowBlockPanel(false)} data-testid="button-close-blocks">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-4">
              <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full" data-testid="button-ai-generate">
                    <Wand2 className="h-4 w-4 mr-2" />
                    Generate with AI
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>AI Page Generator</DialogTitle>
                    <DialogDescription>
                      Let AI create a page structure for you based on your content
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label>Template Type</Label>
                      <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                        <SelectTrigger data-testid="select-template">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sales">Sales Page</SelectItem>
                          <SelectItem value="landing">Landing Page</SelectItem>
                          <SelectItem value="checkout">Checkout Page</SelectItem>
                          <SelectItem value="thankyou">Thank You Page</SelectItem>
                          <SelectItem value="product">Product Page</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Your Content</Label>
                      <Textarea
                        placeholder="Describe your product, its benefits, and key selling points..."
                        value={contentInput}
                        onChange={(e) => setContentInput(e.target.value)}
                        rows={4}
                        data-testid="input-ai-content"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Custom Instructions (Optional)</Label>
                      <Textarea
                        placeholder="E.g., 'Focus on urgency', 'Include money-back guarantee', 'Use professional tone'..."
                        value={customInstructions}
                        onChange={(e) => setCustomInstructions(e.target.value)}
                        rows={3}
                        data-testid="input-ai-instructions"
                      />
                    </div>
                    {!modelsData?.configured.gemini && !modelsData?.configured.openrouter && (
                      <p className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-950 p-2 rounded">
                        AI is not configured. Contact your admin to set up AI providers.
                      </p>
                    )}
                    <Button
                      className="w-full"
                      onClick={handleAIGenerate}
                      disabled={generateMutation.isPending || (!modelsData?.configured.gemini && !modelsData?.configured.openrouter)}
                      data-testid="button-generate-page"
                    >
                      {generateMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Wand2 className="h-4 w-4 mr-2" />
                          Generate Page
                        </>
                      )}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Separator />

              {blockCategories.map((category) => (
                <div key={category.name} className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <category.icon className="h-3 w-3" />
                    {category.name}
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {category.blocks.map((block) => (
                      <button
                        key={block.type}
                        onClick={() => addBlock(block.type)}
                        className="flex flex-col items-center gap-1 p-2 rounded-md border bg-background hover-elevate text-xs"
                        title={block.description}
                        data-testid={`button-add-block-${block.type}`}
                      >
                        <block.icon className="h-4 w-4" />
                        <span className="truncate w-full text-center">{block.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {!showBlockPanel && (
        <Button
          size="icon"
          variant="ghost"
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10"
          onClick={() => setShowBlockPanel(true)}
          data-testid="button-open-blocks"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}

      <div className="flex-1 flex flex-col bg-muted/10">
        <div className="p-2 border-b flex items-center justify-between gap-2 flex-wrap bg-background">
          <div className="flex items-center gap-2">
            <div className="flex items-center border rounded-md">
              {deviceModes.map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => setDeviceMode(mode.id as any)}
                  className={`p-2 ${deviceMode === mode.id ? 'bg-primary text-primary-foreground' : 'hover-elevate'}`}
                  title={mode.label}
                  data-testid={`button-device-${mode.id}`}
                >
                  <mode.icon className="h-4 w-4" />
                </button>
              ))}
            </div>
            <Badge variant="outline" className="text-xs">
              {blocks.length} blocks
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setBlocks([])} data-testid="button-clear-all">
              <RotateCcw className="h-4 w-4 mr-1" />
              Clear
            </Button>
            <Button size="sm" onClick={handleSave} data-testid="button-save-page">
              <Save className="h-4 w-4 mr-1" />
              Save
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1 p-4">
          <div
            className="mx-auto bg-background border rounded-lg shadow-sm min-h-[600px] transition-all"
            style={{ maxWidth: deviceModes.find((m) => m.id === deviceMode)?.width }}
          >
            {blocks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-96 text-center p-8">
                <Layout className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-semibold text-lg mb-2">Start Building</h3>
                <p className="text-muted-foreground mb-4">
                  Add blocks from the panel or generate with AI
                </p>
                <Button onClick={() => setAiDialogOpen(true)} data-testid="button-start-ai">
                  <Wand2 className="h-4 w-4 mr-2" />
                  Generate with AI
                </Button>
              </div>
            ) : (
              <div className="p-4 space-y-2">
                {blocks.map((block, index) => (
                  <div
                    key={block.id}
                    className={`relative group border rounded-md p-4 transition-all ${
                      selectedBlock === block.id ? 'ring-2 ring-primary border-primary' : 'hover:border-primary/50'
                    } ${!block.visible ? 'opacity-40' : ''}`}
                    onClick={() => setSelectedBlock(block.id)}
                    data-testid={`block-${block.id}`}
                  >
                    <div className="absolute -left-10 top-1/2 -translate-y-1/2 flex flex-col gap-1 invisible group-hover:visible">
                      <button
                        onClick={(e) => { e.stopPropagation(); moveBlock(block.id, 'up'); }}
                        className="p-1 rounded hover:bg-muted"
                        disabled={index === 0}
                      >
                        <MoveUp className="h-3 w-3" />
                      </button>
                      <GripVertical className="h-3 w-3 mx-auto text-muted-foreground" />
                      <button
                        onClick={(e) => { e.stopPropagation(); moveBlock(block.id, 'down'); }}
                        className="p-1 rounded hover:bg-muted"
                        disabled={index === blocks.length - 1}
                      >
                        <MoveDown className="h-3 w-3" />
                      </button>
                    </div>

                    <div className="absolute -right-10 top-0 flex flex-col gap-1 invisible group-hover:visible">
                      <button
                        onClick={(e) => { e.stopPropagation(); duplicateBlock(block.id); }}
                        className="p-1 rounded hover:bg-muted"
                        title="Duplicate"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleVisibility(block.id); }}
                        className="p-1 rounded hover:bg-muted"
                        title="Toggle visibility"
                      >
                        {block.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeBlock(block.id); }}
                        className="p-1 rounded hover:bg-destructive/10 text-destructive"
                        title="Delete"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>

                    <BlockPreview block={block} deviceMode={deviceMode} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {showPropertiesPanel && selectedBlockData && (
        <div className="w-80 border-l bg-muted/30 flex flex-col">
          <div className="p-3 border-b flex items-center justify-between gap-2">
            <h3 className="font-semibold text-sm capitalize">{selectedBlockData.type.replace('-', ' ')} Settings</h3>
            <Button size="icon" variant="ghost" onClick={() => setShowPropertiesPanel(false)} data-testid="button-close-properties">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <ScrollArea className="flex-1">
            <BlockEditor
              block={selectedBlockData}
              deviceMode={deviceMode}
              onContentChange={(content) => updateBlockContent(selectedBlockData.id, content)}
              onStyleChange={(styles) => updateBlockStyles(selectedBlockData.id, styles)}
            />
          </ScrollArea>
        </div>
      )}

      {!showPropertiesPanel && selectedBlockData && (
        <Button
          size="icon"
          variant="ghost"
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10"
          onClick={() => setShowPropertiesPanel(true)}
          data-testid="button-open-properties"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

function BlockPreview({ block, deviceMode }: { block: PageBlock; deviceMode: string }) {
  const styles = block.styles[deviceMode as keyof ResponsiveStyle] || block.styles.desktop || {};

  switch (block.type) {
    case 'header':
      return <h2 style={styles} className="text-2xl font-bold">{block.content.text || 'Header Text'}</h2>;
    case 'subheader':
      return <h3 style={styles} className="text-xl font-semibold text-muted-foreground">{block.content.text || 'Subheader Text'}</h3>;
    case 'paragraph':
      return <p style={styles} className="text-base">{block.content.text || 'Paragraph text goes here...'}</p>;
    case 'button':
      return (
        <div className="flex justify-center">
          <Button style={styles}>{block.content.text || 'Click Here'}</Button>
        </div>
      );
    case 'cta':
      return (
        <div style={styles} className="text-center p-6 bg-primary/10 rounded-lg">
          <h3 className="text-xl font-bold mb-2">{block.content.headline || 'Take Action Now'}</h3>
          <p className="mb-4 text-muted-foreground">{block.content.subtext || 'Limited time offer'}</p>
          <Button size="lg">{block.content.buttonText || 'Get Started'}</Button>
        </div>
      );
    case 'image':
      return (
        <div className="flex justify-center">
          {block.content.src ? (
            <img src={block.content.src} alt={block.content.alt || ''} style={styles} className="max-w-full rounded" />
          ) : (
            <div style={styles} className="w-full h-48 bg-muted rounded flex items-center justify-center">
              <Image className="h-12 w-12 text-muted-foreground" />
            </div>
          )}
        </div>
      );
    case 'spacer':
      return <div style={{ height: block.content.height || '40px', ...styles }} />;
    case 'divider':
      return <hr style={styles} className="border-t" />;
    case 'list':
      return (
        <ul style={styles} className="list-disc list-inside space-y-1">
          {(block.content.items || ['Item 1', 'Item 2', 'Item 3']).map((item: string, i: number) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      );
    case 'features':
      return (
        <div style={styles} className="grid gap-4 md:grid-cols-3">
          {(block.content.features || [
            { title: 'Feature 1', description: 'Description' },
            { title: 'Feature 2', description: 'Description' },
            { title: 'Feature 3', description: 'Description' },
          ]).map((f: any, i: number) => (
            <div key={i} className="p-4 border rounded-md text-center">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 text-primary" />
              <h4 className="font-semibold">{f.title}</h4>
              <p className="text-sm text-muted-foreground">{f.description}</p>
            </div>
          ))}
        </div>
      );
    case 'testimonials':
      return (
        <div style={styles} className="p-6 bg-muted/50 rounded-lg text-center">
          <Quote className="h-8 w-8 mx-auto mb-4 text-primary" />
          <p className="text-lg italic mb-4">"{block.content.quote || 'This product changed my life!'}"</p>
          <p className="font-semibold">{block.content.author || 'John Doe'}</p>
          <p className="text-sm text-muted-foreground">{block.content.role || 'Happy Customer'}</p>
        </div>
      );
    case 'pricing':
      return (
        <div style={styles} className="p-6 border rounded-lg text-center max-w-sm mx-auto">
          <h4 className="text-lg font-semibold mb-2">{block.content.title || 'Premium Plan'}</h4>
          <div className="text-4xl font-bold mb-4">{block.content.price || '$49'}</div>
          <ul className="text-sm space-y-2 mb-4">
            {(block.content.features || ['Feature 1', 'Feature 2']).map((f: string, i: number) => (
              <li key={i} className="flex items-center gap-2 justify-center">
                <CheckCircle className="h-4 w-4 text-green-500" />
                {f}
              </li>
            ))}
          </ul>
          <Button className="w-full">{block.content.buttonText || 'Buy Now'}</Button>
        </div>
      );
    case 'countdown':
      return (
        <div style={styles} className="text-center p-4 bg-destructive/10 rounded-lg">
          <p className="text-sm mb-2">{block.content.label || 'Offer ends in:'}</p>
          <div className="flex justify-center gap-4 text-2xl font-bold">
            <div><span className="text-destructive">23</span> <span className="text-xs">hrs</span></div>
            <div><span className="text-destructive">59</span> <span className="text-xs">min</span></div>
            <div><span className="text-destructive">59</span> <span className="text-xs">sec</span></div>
          </div>
        </div>
      );
    case 'faq':
      return (
        <div style={styles} className="space-y-2">
          {(block.content.items || [
            { question: 'Question 1?', answer: 'Answer 1' },
            { question: 'Question 2?', answer: 'Answer 2' },
          ]).map((item: any, i: number) => (
            <div key={i} className="border rounded-md p-3">
              <h4 className="font-semibold flex items-center gap-2">
                <HelpCircle className="h-4 w-4" />
                {item.question}
              </h4>
              <p className="text-sm text-muted-foreground mt-1">{item.answer}</p>
            </div>
          ))}
        </div>
      );
    case 'hero':
      return (
        <div style={styles} className="relative h-64 bg-gradient-to-r from-primary/20 to-primary/5 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-2">{block.content.headline || 'Hero Headline'}</h1>
            <p className="text-lg text-muted-foreground mb-4">{block.content.subheadline || 'Supporting text'}</p>
            <Button size="lg">{block.content.buttonText || 'Learn More'}</Button>
          </div>
        </div>
      );
    case 'trust-badges':
      return (
        <div style={styles} className="flex justify-center gap-4 flex-wrap py-4">
          {['Secure Checkout', 'Money Back', '24/7 Support'].map((badge, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <Shield className="h-5 w-5 text-green-500" />
              {badge}
            </div>
          ))}
        </div>
      );
    default:
      return (
        <div style={styles} className="p-4 border-2 border-dashed rounded text-center text-muted-foreground">
          <span className="capitalize">{block.type.replace('-', ' ')}</span> Block
        </div>
      );
  }
}

function BlockEditor({
  block,
  deviceMode,
  onContentChange,
  onStyleChange,
}: {
  block: PageBlock;
  deviceMode: string;
  onContentChange: (content: Record<string, any>) => void;
  onStyleChange: (styles: ResponsiveStyle) => void;
}) {
  const currentStyles = block.styles[deviceMode as keyof ResponsiveStyle] || block.styles.desktop || {};

  const updateStyle = (key: string, value: string) => {
    onStyleChange({
      [deviceMode]: { ...currentStyles, [key]: value },
    });
  };

  return (
    <div className="p-4 space-y-6">
      <Tabs defaultValue="content">
        <TabsList className="w-full">
          <TabsTrigger value="content" className="flex-1">Content</TabsTrigger>
          <TabsTrigger value="style" className="flex-1">Style</TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="space-y-4 mt-4">
          {renderContentFields(block, onContentChange)}
        </TabsContent>

        <TabsContent value="style" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>Text Color</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={currentStyles.color || '#000000'}
                onChange={(e) => updateStyle('color', e.target.value)}
                className="w-12 h-9 p-1"
                data-testid="input-text-color"
              />
              <Input
                value={currentStyles.color || ''}
                onChange={(e) => updateStyle('color', e.target.value)}
                placeholder="#000000"
                className="flex-1"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Background Color</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={currentStyles.backgroundColor || '#ffffff'}
                onChange={(e) => updateStyle('backgroundColor', e.target.value)}
                className="w-12 h-9 p-1"
                data-testid="input-bg-color"
              />
              <Input
                value={currentStyles.backgroundColor || ''}
                onChange={(e) => updateStyle('backgroundColor', e.target.value)}
                placeholder="#ffffff"
                className="flex-1"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Font Size</Label>
            <Select
              value={currentStyles.fontSize || 'inherit'}
              onValueChange={(v) => updateStyle('fontSize', v)}
            >
              <SelectTrigger data-testid="select-font-size">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="inherit">Default</SelectItem>
                <SelectItem value="12px">12px</SelectItem>
                <SelectItem value="14px">14px</SelectItem>
                <SelectItem value="16px">16px</SelectItem>
                <SelectItem value="18px">18px</SelectItem>
                <SelectItem value="20px">20px</SelectItem>
                <SelectItem value="24px">24px</SelectItem>
                <SelectItem value="28px">28px</SelectItem>
                <SelectItem value="32px">32px</SelectItem>
                <SelectItem value="36px">36px</SelectItem>
                <SelectItem value="48px">48px</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Font Weight</Label>
            <Select
              value={currentStyles.fontWeight || 'normal'}
              onValueChange={(v) => updateStyle('fontWeight', v)}
            >
              <SelectTrigger data-testid="select-font-weight">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="500">Medium</SelectItem>
                <SelectItem value="600">Semibold</SelectItem>
                <SelectItem value="700">Bold</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Text Align</Label>
            <Select
              value={currentStyles.textAlign || 'left'}
              onValueChange={(v) => updateStyle('textAlign', v)}
            >
              <SelectTrigger data-testid="select-text-align">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="left">Left</SelectItem>
                <SelectItem value="center">Center</SelectItem>
                <SelectItem value="right">Right</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Padding</Label>
            <Input
              value={currentStyles.padding || ''}
              onChange={(e) => updateStyle('padding', e.target.value)}
              placeholder="e.g., 16px or 16px 24px"
              data-testid="input-padding"
            />
          </div>

          <div className="space-y-2">
            <Label>Margin</Label>
            <Input
              value={currentStyles.margin || ''}
              onChange={(e) => updateStyle('margin', e.target.value)}
              placeholder="e.g., 16px or 16px 0"
              data-testid="input-margin"
            />
          </div>

          <div className="space-y-2">
            <Label>Border Radius</Label>
            <Input
              value={currentStyles.borderRadius || ''}
              onChange={(e) => updateStyle('borderRadius', e.target.value)}
              placeholder="e.g., 8px"
              data-testid="input-border-radius"
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function renderContentFields(block: PageBlock, onChange: (content: Record<string, any>) => void) {
  switch (block.type) {
    case 'header':
    case 'subheader':
    case 'paragraph':
      return (
        <div className="space-y-2">
          <Label>Text</Label>
          <Textarea
            value={block.content.text || ''}
            onChange={(e) => onChange({ text: e.target.value })}
            placeholder="Enter text..."
            rows={3}
            data-testid="input-block-text"
          />
        </div>
      );
    case 'button':
      return (
        <>
          <div className="space-y-2">
            <Label>Button Text</Label>
            <Input
              value={block.content.text || ''}
              onChange={(e) => onChange({ text: e.target.value })}
              placeholder="Click Here"
              data-testid="input-button-text"
            />
          </div>
          <div className="space-y-2">
            <Label>Link URL</Label>
            <Input
              value={block.content.url || ''}
              onChange={(e) => onChange({ url: e.target.value })}
              placeholder="https://..."
              data-testid="input-button-url"
            />
          </div>
        </>
      );
    case 'cta':
      return (
        <>
          <div className="space-y-2">
            <Label>Headline</Label>
            <Input
              value={block.content.headline || ''}
              onChange={(e) => onChange({ headline: e.target.value })}
              placeholder="Call to Action"
              data-testid="input-cta-headline"
            />
          </div>
          <div className="space-y-2">
            <Label>Subtext</Label>
            <Textarea
              value={block.content.subtext || ''}
              onChange={(e) => onChange({ subtext: e.target.value })}
              placeholder="Supporting text..."
              data-testid="input-cta-subtext"
            />
          </div>
          <div className="space-y-2">
            <Label>Button Text</Label>
            <Input
              value={block.content.buttonText || ''}
              onChange={(e) => onChange({ buttonText: e.target.value })}
              placeholder="Get Started"
              data-testid="input-cta-button"
            />
          </div>
        </>
      );
    case 'image':
      return (
        <>
          <div className="space-y-2">
            <Label>Image URL</Label>
            <Input
              value={block.content.src || ''}
              onChange={(e) => onChange({ src: e.target.value })}
              placeholder="https://..."
              data-testid="input-image-src"
            />
          </div>
          <div className="space-y-2">
            <Label>Alt Text</Label>
            <Input
              value={block.content.alt || ''}
              onChange={(e) => onChange({ alt: e.target.value })}
              placeholder="Image description"
              data-testid="input-image-alt"
            />
          </div>
        </>
      );
    case 'spacer':
      return (
        <div className="space-y-2">
          <Label>Height</Label>
          <Input
            value={block.content.height || '40px'}
            onChange={(e) => onChange({ height: e.target.value })}
            placeholder="40px"
            data-testid="input-spacer-height"
          />
        </div>
      );
    case 'hero':
      return (
        <>
          <div className="space-y-2">
            <Label>Headline</Label>
            <Input
              value={block.content.headline || ''}
              onChange={(e) => onChange({ headline: e.target.value })}
              placeholder="Hero Headline"
              data-testid="input-hero-headline"
            />
          </div>
          <div className="space-y-2">
            <Label>Subheadline</Label>
            <Textarea
              value={block.content.subheadline || ''}
              onChange={(e) => onChange({ subheadline: e.target.value })}
              placeholder="Supporting text..."
              data-testid="input-hero-subheadline"
            />
          </div>
          <div className="space-y-2">
            <Label>Button Text</Label>
            <Input
              value={block.content.buttonText || ''}
              onChange={(e) => onChange({ buttonText: e.target.value })}
              placeholder="Learn More"
              data-testid="input-hero-button"
            />
          </div>
          <div className="space-y-2">
            <Label>Background Image URL</Label>
            <Input
              value={block.content.backgroundImage || ''}
              onChange={(e) => onChange({ backgroundImage: e.target.value })}
              placeholder="https://..."
              data-testid="input-hero-bg"
            />
          </div>
        </>
      );
    case 'testimonials':
      return (
        <>
          <div className="space-y-2">
            <Label>Quote</Label>
            <Textarea
              value={block.content.quote || ''}
              onChange={(e) => onChange({ quote: e.target.value })}
              placeholder="Customer testimonial..."
              data-testid="input-testimonial-quote"
            />
          </div>
          <div className="space-y-2">
            <Label>Author Name</Label>
            <Input
              value={block.content.author || ''}
              onChange={(e) => onChange({ author: e.target.value })}
              placeholder="John Doe"
              data-testid="input-testimonial-author"
            />
          </div>
          <div className="space-y-2">
            <Label>Author Role/Title</Label>
            <Input
              value={block.content.role || ''}
              onChange={(e) => onChange({ role: e.target.value })}
              placeholder="CEO, Company"
              data-testid="input-testimonial-role"
            />
          </div>
        </>
      );
    case 'pricing':
      return (
        <>
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              value={block.content.title || ''}
              onChange={(e) => onChange({ title: e.target.value })}
              placeholder="Premium Plan"
              data-testid="input-pricing-title"
            />
          </div>
          <div className="space-y-2">
            <Label>Price</Label>
            <Input
              value={block.content.price || ''}
              onChange={(e) => onChange({ price: e.target.value })}
              placeholder="$49"
              data-testid="input-pricing-price"
            />
          </div>
          <div className="space-y-2">
            <Label>Button Text</Label>
            <Input
              value={block.content.buttonText || ''}
              onChange={(e) => onChange({ buttonText: e.target.value })}
              placeholder="Buy Now"
              data-testid="input-pricing-button"
            />
          </div>
        </>
      );
    case 'countdown':
      return (
        <>
          <div className="space-y-2">
            <Label>Label</Label>
            <Input
              value={block.content.label || ''}
              onChange={(e) => onChange({ label: e.target.value })}
              placeholder="Offer ends in:"
              data-testid="input-countdown-label"
            />
          </div>
          <div className="space-y-2">
            <Label>End Date</Label>
            <Input
              type="datetime-local"
              value={block.content.endDate || ''}
              onChange={(e) => onChange({ endDate: e.target.value })}
              data-testid="input-countdown-date"
            />
          </div>
        </>
      );
    default:
      return (
        <p className="text-sm text-muted-foreground">
          Content editing for this block type is coming soon.
        </p>
      );
  }
}

function getDefaultContent(type: BlockType): Record<string, any> {
  const defaults: Record<string, Record<string, any>> = {
    header: { text: 'Your Headline Here' },
    subheader: { text: 'Supporting subheadline text' },
    paragraph: { text: 'Your paragraph content goes here. Add compelling copy that engages your readers.' },
    button: { text: 'Click Here', url: '#' },
    cta: { headline: 'Take Action Now', subtext: 'Limited time offer - don\'t miss out!', buttonText: 'Get Started' },
    image: { src: '', alt: 'Image' },
    spacer: { height: '40px' },
    divider: {},
    hero: { headline: 'Transform Your Life Today', subheadline: 'Discover the secret to success', buttonText: 'Learn More' },
    list: { items: ['Benefit 1', 'Benefit 2', 'Benefit 3'] },
    features: { features: [{ title: 'Feature 1', description: 'Description' }, { title: 'Feature 2', description: 'Description' }, { title: 'Feature 3', description: 'Description' }] },
    testimonials: { quote: 'This product is amazing!', author: 'Happy Customer', role: 'Verified Buyer' },
    pricing: { title: 'Premium', price: '$49', features: ['Feature 1', 'Feature 2'], buttonText: 'Buy Now' },
    countdown: { label: 'Offer ends in:', endDate: '' },
    faq: { items: [{ question: 'What is this?', answer: 'This is our product.' }] },
    'trust-badges': { badges: ['Secure', 'Money Back', '24/7 Support'] },
  };
  return defaults[type] || {};
}

function getDefaultStyles(type: BlockType): ResponsiveStyle {
  return {
    desktop: {},
    tablet: {},
    mobile: {},
  };
}

export default VisualEditor;
