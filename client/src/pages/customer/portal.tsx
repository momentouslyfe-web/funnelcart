import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, Download, Clock, CheckCircle, XCircle } from "lucide-react";
import type { Order, OrderItem, Product } from "@shared/schema";
import { Link } from "wouter";

interface OrderWithItems extends Order {
  items: (OrderItem & { product: Product })[];
}

export default function CustomerPortal() {
  const { data: orders, isLoading } = useQuery<OrderWithItems[]>({
    queryKey: ["/api/customer/orders"],
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  const completedOrders = orders?.filter(o => o.status === "completed") || [];
  const pendingOrders = orders?.filter(o => o.status === "pending") || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-portal-title">My Purchases</h1>
        <p className="text-muted-foreground">View your orders and download your digital products</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card data-testid="card-stat-total-orders">
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <Package className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orders?.length || 0}</div>
          </CardContent>
        </Card>

        <Card data-testid="card-stat-completed">
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedOrders.length}</div>
          </CardContent>
        </Card>

        <Card data-testid="card-stat-downloads">
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
            <CardTitle className="text-sm font-medium">Downloads Available</CardTitle>
            <Download className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {completedOrders.reduce((acc, o) => acc + (o.items?.length || 0), 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-orders-list">
        <CardHeader>
          <CardTitle>Order History</CardTitle>
          <CardDescription>Your recent purchases and digital products</CardDescription>
        </CardHeader>
        <CardContent>
          {orders && orders.length > 0 ? (
            <div className="space-y-4">
              {orders.map((order, index) => (
                <div 
                  key={order.id} 
                  className="flex items-center justify-between gap-4 p-4 border rounded-md"
                  data-testid={`order-item-${index}`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium" data-testid={`text-order-id-${index}`}>
                        Order #{order.invoiceId || order.id.slice(0, 8)}
                      </span>
                      <Badge 
                        variant={order.status === "completed" ? "default" : order.status === "pending" ? "secondary" : "destructive"}
                        data-testid={`badge-order-status-${index}`}
                      >
                        {order.status === "completed" && <CheckCircle className="w-3 h-3 mr-1" />}
                        {order.status === "pending" && <Clock className="w-3 h-3 mr-1" />}
                        {order.status === "failed" && <XCircle className="w-3 h-3 mr-1" />}
                        {order.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground" data-testid={`text-order-date-${index}`}>
                      {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : "N/A"}
                    </p>
                    <p className="text-sm font-medium mt-1" data-testid={`text-order-total-${index}`}>
                      ${Number(order.total).toFixed(2)}
                    </p>
                  </div>
                  {order.status === "completed" && (
                    <Link href={`/account/orders/${order.id}`}>
                      <Button variant="outline" size="sm" data-testid={`button-view-order-${index}`}>
                        <Download className="w-4 h-4 mr-2" />
                        View Downloads
                      </Button>
                    </Link>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground" data-testid="text-no-orders">No orders yet</p>
              <p className="text-sm text-muted-foreground">Your purchases will appear here</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
