import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Search,
  Download,
  Eye,
  MoreVertical,
  Users,
  Mail,
  ShoppingCart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Customer, Order } from "@shared/schema";

interface CustomerWithOrders extends Customer {
  orders?: Order[];
  totalSpent?: number;
  orderCount?: number;
}

function CustomerDetailsDialog({
  customer,
  open,
  onOpenChange,
}: {
  customer: CustomerWithOrders | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!customer) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {customer.firstName} {customer.lastName}
          </DialogTitle>
          <DialogDescription>{customer.email}</DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  ${(customer.totalSpent || 0).toFixed(2)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Orders</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{customer.orderCount || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Customer Since</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">
                  {customer.createdAt && format(new Date(customer.createdAt), "MMM d, yyyy")}
                </p>
              </CardContent>
            </Card>
          </div>

          <div>
            <h4 className="font-medium mb-3">Contact Information</h4>
            <div className="space-y-2">
              <div className="flex justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-muted-foreground">Email</span>
                <span>{customer.email}</span>
              </div>
              {customer.phone && (
                <div className="flex justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-muted-foreground">Phone</span>
                  <span>{customer.phone}</span>
                </div>
              )}
              {customer.country && (
                <div className="flex justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-muted-foreground">Country</span>
                  <span>{customer.country}</span>
                </div>
              )}
            </div>
          </div>

          {customer.orders && customer.orders.length > 0 && (
            <div>
              <h4 className="font-medium mb-3">Recent Orders</h4>
              <div className="space-y-2">
                {customer.orders.slice(0, 5).map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium">#{order.id.slice(0, 8)}</p>
                      <p className="text-sm text-muted-foreground">
                        {order.createdAt && format(new Date(order.createdAt), "MMM d, yyyy")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">${Number(order.total).toFixed(2)}</p>
                      <Badge variant="outline" className="text-xs">
                        {order.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-4 p-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-6">
        <Users className="h-10 w-10 text-muted-foreground" />
      </div>
      <h3 className="text-xl font-semibold mb-2">No customers yet</h3>
      <p className="text-muted-foreground mb-6 max-w-sm">
        When customers make their first purchase, they'll appear here.
      </p>
    </div>
  );
}

export default function Customers() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithOrders | null>(null);

  const { data: customers, isLoading } = useQuery<CustomerWithOrders[]>({
    queryKey: ["/api/customers"],
  });

  const filteredCustomers = customers?.filter((customer) =>
    customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    `${customer.firstName} ${customer.lastName}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    return `${firstName?.charAt(0) || ""}${lastName?.charAt(0) || ""}`.toUpperCase() || "?";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Customers</h1>
          <p className="text-muted-foreground mt-1">
            View and manage your customer base
          </p>
        </div>
        <Button variant="outline" data-testid="button-export">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search customers..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
          data-testid="input-search-customers"
        />
      </div>

      {isLoading ? (
        <TableSkeleton />
      ) : !customers || customers.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Orders</TableHead>
                <TableHead>Total Spent</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers?.map((customer) => (
                <TableRow key={customer.id} data-testid={`customer-row-${customer.id}`}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>
                          {getInitials(customer.firstName, customer.lastName)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">
                        {customer.firstName} {customer.lastName}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {customer.email}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {customer.orderCount || 0} orders
                    </Badge>
                  </TableCell>
                  <TableCell className="font-semibold">
                    ${(customer.totalSpent || 0).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {customer.createdAt && format(new Date(customer.createdAt), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" data-testid={`button-customer-menu-${customer.id}`}>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setSelectedCustomer(customer)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Mail className="h-4 w-4 mr-2" />
                          Send Email
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <ShoppingCart className="h-4 w-4 mr-2" />
                          View Orders
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <CustomerDetailsDialog
        customer={selectedCustomer}
        open={!!selectedCustomer}
        onOpenChange={(open) => !open && setSelectedCustomer(null)}
      />
    </div>
  );
}
