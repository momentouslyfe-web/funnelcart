import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Plus,
  Search,
  MoreVertical,
  Pencil,
  Trash2,
  Copy,
  Eye,
  FileEdit,
  ExternalLink,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { CheckoutPage, Product } from "@shared/schema";

interface CheckoutPageWithProduct extends CheckoutPage {
  product?: Product;
}

const templateLabels: Record<string, string> = {
  publisher: "Publisher",
  author: "Author",
  clean: "Clean",
  minimalist: "Minimalist",
};

function CheckoutPageCard({
  page,
  onDelete,
}: {
  page: CheckoutPageWithProduct;
  onDelete: (id: string) => void;
}) {
  const templateColors: Record<string, string> = {
    publisher: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    author: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    clean: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
    minimalist: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  };

  return (
    <Card className="group" data-testid={`card-checkout-page-${page.id}`}>
      <CardContent className="p-0">
        <div className="relative aspect-[16/9] bg-gradient-to-br from-muted to-muted/50 rounded-t-lg overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <FileEdit className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
              <span className="text-xs text-muted-foreground">
                {templateLabels[page.template || "publisher"]} Template
              </span>
            </div>
          </div>
          <div className="absolute top-3 right-3 flex gap-2">
            <Badge
              variant={page.isPublished ? "default" : "secondary"}
              className="text-xs"
            >
              {page.isPublished ? "Published" : "Draft"}
            </Badge>
          </div>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold truncate" data-testid={`text-page-name-${page.id}`}>
                {page.name}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                /{page.slug}
              </p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" data-testid={`button-page-menu-${page.id}`}>
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/checkout-pages/${page.id}/editor`}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit Page
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href={`/c/${page.slug}`} target="_blank" rel="noopener noreferrer">
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Copy Link
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => onDelete(page.id)}
                  data-testid={`button-delete-page-${page.id}`}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {page.product && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Product:</span>
              <span className="font-medium truncate">{page.product.name}</span>
              <span className="text-muted-foreground">
                ${Number(page.product.price).toFixed(2)}
              </span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={`text-xs ${templateColors[page.template || "publisher"]}`}
            >
              {templateLabels[page.template || "publisher"]}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CheckoutPageCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-0">
        <Skeleton className="aspect-[16/9] rounded-t-lg" />
        <div className="p-4 space-y-3">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-6 w-24" />
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-6">
        <FileEdit className="h-10 w-10 text-muted-foreground" />
      </div>
      <h3 className="text-xl font-semibold mb-2">No checkout pages yet</h3>
      <p className="text-muted-foreground mb-6 max-w-sm">
        Create a checkout page to start selling your products. Use our drag-and-drop
        editor to customize every detail.
      </p>
      <Button asChild data-testid="button-create-first-page">
        <Link href="/checkout-pages/new">
          <Plus className="h-4 w-4 mr-2" />
          Create Your First Checkout Page
        </Link>
      </Button>
    </div>
  );
}

export default function CheckoutPages() {
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: pages, isLoading } = useQuery<CheckoutPageWithProduct[]>({
    queryKey: ["/api/checkout-pages"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/checkout-pages/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/checkout-pages"] });
      toast({
        title: "Checkout page deleted",
        description: "The checkout page has been permanently deleted.",
      });
      setDeleteId(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete the checkout page. Please try again.",
        variant: "destructive",
      });
    },
  });

  const filteredPages = pages?.filter((page) =>
    page.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Checkout Pages</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage your conversion-optimized checkout pages
          </p>
        </div>
        <Button asChild data-testid="button-create-page">
          <Link href="/checkout-pages/new">
            <Plus className="h-4 w-4 mr-2" />
            Create Page
          </Link>
        </Button>
      </div>

      {!isLoading && pages && pages.length > 0 && (
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search checkout pages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-pages"
          />
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <CheckoutPageCardSkeleton key={i} />
          ))}
        </div>
      ) : !pages || pages.length === 0 ? (
        <EmptyState />
      ) : filteredPages && filteredPages.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No pages found matching "{searchQuery}"</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPages?.map((page) => (
            <CheckoutPageCard
              key={page.id}
              page={page}
              onDelete={setDeleteId}
            />
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Checkout Page</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this checkout page? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
