import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, FileText, Clock, AlertCircle } from "lucide-react";
import type { OrderItem, Product } from "@shared/schema";

interface DownloadableItem {
  id: string;
  token: string;
  product: Product & { 
    files?: { id: string; name: string; fileName: string; fileUrl: string; fileSize: number }[] 
  };
  order: { id: string; createdAt: string };
  downloadsRemaining: number | null;
  expiresAt: string;
  downloadCount?: number;
}

export default function CustomerDownloads() {
  const { data: downloads, isLoading } = useQuery<DownloadableItem[]>({
    queryKey: ["/api/customer/downloads"],
  });

  const handleDownload = async (token: string, fileId?: string) => {
    const url = fileId && fileId !== "main" 
      ? `/api/downloads/${token}/${fileId}`
      : `/api/downloads/${token}`;
    window.open(url, "_blank");
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-downloads-title">My Downloads</h1>
        <p className="text-muted-foreground">Access and download your digital products</p>
      </div>

      {downloads && downloads.length > 0 ? (
        <div className="grid gap-4">
          {downloads.map((item, index) => {
            const downloadsRemaining = item.downloadsRemaining;
            const isExpired = item.expiresAt && new Date(item.expiresAt) < new Date();
            const hasDownloadsLeft = downloadsRemaining === null || downloadsRemaining > 0;
            const canDownload = hasDownloadsLeft && !isExpired;

            return (
              <Card key={item.id} data-testid={`card-download-${index}`}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="flex items-center gap-2 flex-wrap" data-testid={`text-product-name-${index}`}>
                        {item.product.name}
                        <Badge variant={canDownload ? "default" : "secondary"} data-testid={`badge-download-status-${index}`}>
                          {canDownload ? "Available" : isExpired ? "Expired" : "Limit Reached"}
                        </Badge>
                      </CardTitle>
                      <CardDescription data-testid={`text-purchase-date-${index}`}>
                        Purchased on {new Date(item.order.createdAt).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Download className="w-3 h-3" />
                        <span data-testid={`text-downloads-remaining-${index}`}>
                          {downloadsRemaining === null ? "Unlimited" : `${downloadsRemaining} downloads left`}
                        </span>
                      </div>
                      {item.expiresAt && (
                        <div className="flex items-center gap-1 mt-1">
                          <Clock className="w-3 h-3" />
                          <span data-testid={`text-expires-${index}`}>
                            Expires: {new Date(item.expiresAt).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {canDownload ? (
                    <div className="space-y-2">
                      {item.product.files && item.product.files.length > 0 ? (
                        item.product.files.map((file, fileIndex) => (
                          <div 
                            key={file.id}
                            className="flex items-center justify-between gap-4 p-3 bg-muted/50 rounded-md"
                            data-testid={`file-item-${index}-${fileIndex}`}
                          >
                            <div className="flex items-center gap-3">
                              <FileText className="w-5 h-5 text-muted-foreground" />
                              <div>
                                <p className="font-medium" data-testid={`text-file-name-${index}-${fileIndex}`}>
                                  {file.name || file.fileName}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {file.fileSize ? `${(file.fileSize / 1024 / 1024).toFixed(2)} MB` : "Unknown size"}
                                </p>
                              </div>
                            </div>
                            <Button 
                              size="sm"
                              onClick={() => handleDownload(item.token, file.id)}
                              data-testid={`button-download-file-${index}-${fileIndex}`}
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Download
                            </Button>
                          </div>
                        ))
                      ) : (
                        <Button 
                          onClick={() => handleDownload(item.token)}
                          data-testid={`button-download-main-${index}`}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download Product
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md text-muted-foreground">
                      <AlertCircle className="w-5 h-5" />
                      <span>
                        {isExpired 
                          ? "This download has expired. Please contact support for assistance." 
                          : "You have reached the download limit for this product."}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <Download className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground" data-testid="text-no-downloads">No downloads available</p>
            <p className="text-sm text-muted-foreground">Completed orders with digital products will appear here</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
