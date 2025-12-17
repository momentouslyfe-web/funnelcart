import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  CheckCircle2, Download, FileText, ShoppingCart, 
  Clock, AlertCircle, Mail, ExternalLink 
} from "lucide-react";

interface OrderDetails {
  order: {
    id: string;
    orderNumber: string;
    totalAmount: string;
    status: string;
    createdAt: string;
  };
  customer: {
    email: string;
    firstName: string;
    lastName: string;
  };
  items: {
    id: string;
    productId: string;
    productName: string;
    quantity: number;
    price: string;
    downloadToken: string;
    files: {
      id: string;
      name: string;
      fileName: string;
      fileSize: number;
    }[];
  }[];
  seller: {
    businessName: string;
    logoUrl?: string;
  };
}

export default function ThankYou() {
  const [, params] = useRoute("/thank-you/:token");
  const token = params?.token;

  const { data: orderDetails, isLoading, error } = useQuery<OrderDetails>({
    queryKey: ["/api/order-confirmation", token],
    enabled: !!token,
  });

  const handleDownload = (downloadToken: string, fileId?: string) => {
    const url = fileId 
      ? `/api/downloads/${downloadToken}/${fileId}`
      : `/api/downloads/${downloadToken}`;
    window.open(url, "_blank");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-16 max-w-3xl">
          <div className="text-center mb-8">
            <Skeleton className="w-16 h-16 rounded-full mx-auto mb-4" />
            <Skeleton className="h-8 w-48 mx-auto mb-2" />
            <Skeleton className="h-4 w-64 mx-auto" />
          </div>
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !orderDetails) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Order Not Found</h2>
            <p className="text-muted-foreground mb-4">
              This order link may have expired or is invalid. Please check your email for the correct link.
            </p>
            <Link href="/">
              <Button variant="outline">Go to Homepage</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            {orderDetails.seller.logoUrl ? (
              <img 
                src={orderDetails.seller.logoUrl} 
                alt={orderDetails.seller.businessName}
                className="h-8 w-auto"
              />
            ) : (
              <ShoppingCart className="h-6 w-6 text-primary" />
            )}
            <span className="font-semibold">{orderDetails.seller.businessName}</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        {/* Success Message */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-3xl font-bold mb-2" data-testid="text-thank-you-title">
            Thank You for Your Purchase!
          </h1>
          <p className="text-muted-foreground">
            Your order has been confirmed. Download your files below.
          </p>
        </div>

        {/* Order Summary */}
        <Card className="mb-6" data-testid="card-order-summary">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Order #{orderDetails.order.orderNumber}</CardTitle>
                <CardDescription>
                  {new Date(orderDetails.order.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                  })}
                </CardDescription>
              </div>
              <Badge variant="secondary">
                {orderDetails.order.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total Amount</span>
              <span className="font-semibold text-lg">
                ${Number(orderDetails.order.totalAmount).toFixed(2)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Download Section */}
        <Card data-testid="card-downloads">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="w-5 h-5" />
              Your Downloads
            </CardTitle>
            <CardDescription>
              Click the buttons below to download your purchased files. No login required.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {orderDetails.items.map((item, itemIndex) => (
              <div 
                key={item.id} 
                className="border rounded-lg p-4"
                data-testid={`download-item-${itemIndex}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold">{item.productName}</h3>
                    <p className="text-sm text-muted-foreground">
                      Quantity: {item.quantity} x ${Number(item.price).toFixed(2)}
                    </p>
                  </div>
                </div>

                {item.files && item.files.length > 0 ? (
                  <div className="space-y-2">
                    {item.files.map((file, fileIndex) => (
                      <div 
                        key={file.id}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-md"
                        data-testid={`file-${itemIndex}-${fileIndex}`}
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-sm">{file.name || file.fileName}</p>
                            <p className="text-xs text-muted-foreground">
                              {file.fileSize ? `${(file.fileSize / 1024 / 1024).toFixed(2)} MB` : ""}
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleDownload(item.downloadToken, file.id)}
                          data-testid={`button-download-${itemIndex}-${fileIndex}`}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Button
                    onClick={() => handleDownload(item.downloadToken)}
                    className="w-full"
                    data-testid={`button-download-${itemIndex}`}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Product
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Email Confirmation Notice */}
        <div className="mt-6 p-4 bg-muted/50 rounded-lg flex items-start gap-3">
          <Mail className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium">Download links sent to your email</p>
            <p className="text-sm text-muted-foreground">
              We've sent download links to {orderDetails.customer.email}. 
              Check your inbox (and spam folder) for the confirmation email.
            </p>
          </div>
        </div>

        {/* Optional Customer Portal */}
        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground mb-2">
            Want to access your purchases anytime?
          </p>
          <Link href="/account">
            <Button variant="outline" size="sm">
              <ExternalLink className="w-4 h-4 mr-2" />
              Create Customer Account (Optional)
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
