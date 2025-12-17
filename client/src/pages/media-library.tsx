import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Upload,
  Image as ImageIcon,
  FileText,
  Video,
  Music,
  Trash2,
  Search,
  Grid,
  List,
  Plus,
  Loader2,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

type MediaAsset = {
  id: string;
  name: string;
  fileName: string;
  fileType: string;
  mimeType: string | null;
  fileSize: number | null;
  fileUrl: string;
  thumbnailUrl: string | null;
  tags: string[] | null;
  isPublic: boolean | null;
  createdAt: string | null;
};

const fileTypeIcons: Record<string, typeof ImageIcon> = {
  image: ImageIcon,
  video: Video,
  document: FileText,
  audio: Music,
};

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "Unknown";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MediaLibrary() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filterType, setFilterType] = useState<string>("all");
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [deleteAssetId, setDeleteAssetId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [uploadForm, setUploadForm] = useState({
    name: "",
    fileName: "",
    fileUrl: "",
    fileType: "image",
  });

  const { data: assets = [], isLoading } = useQuery<MediaAsset[]>({
    queryKey: ["/api/media"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof uploadForm) => {
      return apiRequest("POST", "/api/media", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/media"] });
      setIsUploadOpen(false);
      setUploadForm({ name: "", fileName: "", fileUrl: "", fileType: "image" });
      toast({
        title: "Asset added",
        description: "Media asset has been added to your library.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add media asset. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/media/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/media"] });
      setDeleteAssetId(null);
      toast({
        title: "Asset deleted",
        description: "Media asset has been removed from your library.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete media asset. Please try again.",
        variant: "destructive",
      });
    },
  });

  const filteredAssets = assets.filter((asset) => {
    const matchesSearch = asset.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === "all" || asset.fileType === filterType;
    return matchesSearch && matchesType;
  });

  const copyToClipboard = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({
      title: "Copied",
      description: "URL copied to clipboard.",
    });
  };

  const handleUpload = () => {
    if (!uploadForm.name || !uploadForm.fileUrl) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    createMutation.mutate(uploadForm);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Media Library</h1>
          <p className="text-muted-foreground">
            Manage your images, videos, and documents
          </p>
        </div>
        <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-upload-media">
              <Plus className="mr-2 h-4 w-4" />
              Add Media
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Media Asset</DialogTitle>
              <DialogDescription>
                Add a media asset by providing a URL. You can also upload files to external storage and paste the URL here.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="My Image"
                  value={uploadForm.name}
                  onChange={(e) => setUploadForm({ ...uploadForm, name: e.target.value })}
                  data-testid="input-media-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fileUrl">File URL</Label>
                <Input
                  id="fileUrl"
                  placeholder="https://example.com/image.jpg"
                  value={uploadForm.fileUrl}
                  onChange={(e) => setUploadForm({ ...uploadForm, fileUrl: e.target.value, fileName: e.target.value.split('/').pop() || '' })}
                  data-testid="input-media-url"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fileType">File Type</Label>
                <select
                  id="fileType"
                  className="w-full rounded-md border border-input bg-background px-3 py-2"
                  value={uploadForm.fileType}
                  onChange={(e) => setUploadForm({ ...uploadForm, fileType: e.target.value })}
                  data-testid="select-media-type"
                >
                  <option value="image">Image</option>
                  <option value="video">Video</option>
                  <option value="document">Document</option>
                  <option value="audio">Audio</option>
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsUploadOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpload} disabled={createMutation.isPending} data-testid="button-save-media">
                {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Asset
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search media..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-media"
          />
        </div>
        <div className="flex items-center gap-4">
          <Tabs value={filterType} onValueChange={setFilterType}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="image">Images</TabsTrigger>
              <TabsTrigger value="video">Videos</TabsTrigger>
              <TabsTrigger value="document">Documents</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex items-center gap-1 border rounded-md p-1">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setViewMode("grid")}
              data-testid="button-grid-view"
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setViewMode("list")}
              data-testid="button-list-view"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredAssets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Upload className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No media assets</h3>
            <p className="text-muted-foreground text-center mb-4">
              {searchQuery ? "No assets match your search." : "Add your first media asset to get started."}
            </p>
            {!searchQuery && (
              <Button onClick={() => setIsUploadOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Media
              </Button>
            )}
          </CardContent>
        </Card>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredAssets.map((asset) => {
            const Icon = fileTypeIcons[asset.fileType] || FileText;
            return (
              <Card key={asset.id} className="group relative overflow-hidden" data-testid={`card-media-${asset.id}`}>
                <CardContent className="p-0">
                  <div className="aspect-square relative bg-muted flex items-center justify-center">
                    {asset.fileType === "image" && asset.fileUrl ? (
                      <img
                        src={asset.fileUrl}
                        alt={asset.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Icon className="h-12 w-12 text-muted-foreground" />
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button
                        size="icon"
                        variant="secondary"
                        onClick={() => copyToClipboard(asset.fileUrl, asset.id)}
                        data-testid={`button-copy-${asset.id}`}
                      >
                        {copiedId === asset.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                      <Button
                        size="icon"
                        variant="destructive"
                        onClick={() => setDeleteAssetId(asset.id)}
                        data-testid={`button-delete-${asset.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="font-medium truncate text-sm">{asset.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {asset.fileType}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatFileSize(asset.fileSize)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredAssets.map((asset) => {
            const Icon = fileTypeIcons[asset.fileType] || FileText;
            return (
              <Card key={asset.id} data-testid={`row-media-${asset.id}`}>
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="h-12 w-12 rounded bg-muted flex items-center justify-center flex-shrink-0">
                    {asset.fileType === "image" && asset.fileUrl ? (
                      <img
                        src={asset.fileUrl}
                        alt={asset.name}
                        className="w-full h-full object-cover rounded"
                      />
                    ) : (
                      <Icon className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{asset.name}</p>
                    <p className="text-sm text-muted-foreground truncate">{asset.fileName}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{asset.fileType}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {formatFileSize(asset.fileSize)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => copyToClipboard(asset.fileUrl, asset.id)}
                    >
                      {copiedId === asset.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setDeleteAssetId(asset.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!deleteAssetId} onOpenChange={() => setDeleteAssetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Media Asset</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this media asset? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteAssetId && deleteMutation.mutate(deleteAssetId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
