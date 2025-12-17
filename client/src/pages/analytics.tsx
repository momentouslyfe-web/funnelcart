import { useQuery } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import {
  DollarSign,
  ShoppingCart,
  Users,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Activity,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from "recharts";

interface AnalyticsData {
  revenue: {
    total: number;
    change: number;
    byDay: { date: string; amount: number }[];
  };
  orders: {
    total: number;
    change: number;
    byDay: { date: string; count: number }[];
    byStatus: { status: string; count: number }[];
  };
  customers: {
    total: number;
    change: number;
    newByDay: { date: string; count: number }[];
  };
  conversions: {
    rate: number;
    change: number;
    pageViews: number;
    checkouts: number;
    purchases: number;
  };
  topProducts: { name: string; sales: number; revenue: number }[];
  topPages: { name: string; views: number; conversions: number }[];
}

const COLORS = ["hsl(var(--primary))", "hsl(var(--secondary))", "hsl(var(--accent))", "hsl(var(--muted))"];

function StatCard({
  title,
  value,
  change,
  icon: Icon,
  prefix = "",
  suffix = "",
  isLoading = false,
}: {
  title: string;
  value: number | string;
  change: number;
  icon: React.ComponentType<{ className?: string }>;
  prefix?: string;
  suffix?: string;
  isLoading?: boolean;
}) {
  const isPositive = change >= 0;

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-4 w-20" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold" data-testid={`stat-${title.toLowerCase().replace(/\s+/g, "-")}`}>
          {prefix}{typeof value === "number" ? value.toLocaleString() : value}{suffix}
        </div>
        <div className="flex items-center gap-1 mt-1">
          {isPositive ? (
            <ArrowUpRight className="h-4 w-4 text-green-600" />
          ) : (
            <ArrowDownRight className="h-4 w-4 text-red-600" />
          )}
          <span className={`text-sm ${isPositive ? "text-green-600" : "text-red-600"}`}>
            {isPositive ? "+" : ""}{change}%
          </span>
          <span className="text-sm text-muted-foreground">vs last period</span>
        </div>
      </CardContent>
    </Card>
  );
}

function RevenueChart({ data, isLoading }: { data: { date: string; amount: number }[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <Card className="col-span-full lg:col-span-2">
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-full lg:col-span-2">
      <CardHeader>
        <CardTitle>Revenue Trend</CardTitle>
        <CardDescription>Daily revenue over the last 30 days</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" opacity={0.3} />
              <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
                formatter={(value: number) => [`$${value.toLocaleString()}`, "Revenue"]}
              />
              <Area
                type="monotone"
                dataKey="amount"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorRevenue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function OrdersChart({ data, isLoading }: { data: { date: string; count: number }[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Orders</CardTitle>
        <CardDescription>Daily order volume</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" opacity={0.3} />
              <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function ConversionFunnel({ data, isLoading }: { data: { pageViews: number; checkouts: number; purchases: number }; isLoading: boolean }) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const funnelData = [
    { stage: "Page Views", value: data.pageViews, percentage: 100 },
    { stage: "Checkouts Started", value: data.checkouts, percentage: data.pageViews > 0 ? Math.round((data.checkouts / data.pageViews) * 100) : 0 },
    { stage: "Purchases", value: data.purchases, percentage: data.pageViews > 0 ? Math.round((data.purchases / data.pageViews) * 100) : 0 },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Conversion Funnel</CardTitle>
        <CardDescription>Customer journey stages</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {funnelData.map((stage, i) => (
            <div key={stage.stage}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{stage.stage}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{stage.value.toLocaleString()}</span>
                  <Badge variant="outline">{stage.percentage}%</Badge>
                </div>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${stage.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function TopProductsTable({ data, isLoading }: { data: { name: string; sales: number; revenue: number }[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Products</CardTitle>
        <CardDescription>Best performing products</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No product data yet</p>
        ) : (
          <div className="space-y-4">
            {data.map((product, i) => (
              <div key={product.name} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-medium">
                    {i + 1}
                  </span>
                  <span className="font-medium">{product.name}</span>
                </div>
                <div className="text-right">
                  <p className="font-semibold">${product.revenue.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">{product.sales} sales</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TopPagesTable({ data, isLoading }: { data: { name: string; views: number; conversions: number }[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Checkout Pages</CardTitle>
        <CardDescription>Highest converting pages</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No page data yet</p>
        ) : (
          <div className="space-y-4">
            {data.map((page, i) => (
              <div key={page.name} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-medium">
                    {i + 1}
                  </span>
                  <span className="font-medium">{page.name}</span>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{page.views.toLocaleString()} views</p>
                  <p className="text-sm text-muted-foreground">{page.conversions} conversions</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Analytics() {
  const { data, isLoading } = useQuery<AnalyticsData>({
    queryKey: ["/api/analytics/detailed"],
  });

  const defaultData: AnalyticsData = {
    revenue: { total: 0, change: 0, byDay: [] },
    orders: { total: 0, change: 0, byDay: [], byStatus: [] },
    customers: { total: 0, change: 0, newByDay: [] },
    conversions: { rate: 0, change: 0, pageViews: 0, checkouts: 0, purchases: 0 },
    topProducts: [],
    topPages: [],
  };

  const analytics = data || defaultData;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Detailed insights into your store performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" data-testid="button-7-days">Last 7 Days</Button>
          <Button variant="outline" size="sm" data-testid="button-30-days">Last 30 Days</Button>
          <Button variant="outline" size="sm" data-testid="button-90-days">Last 90 Days</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Revenue"
          value={analytics.revenue.total.toFixed(2)}
          change={analytics.revenue.change}
          icon={DollarSign}
          prefix="$"
          isLoading={isLoading}
        />
        <StatCard
          title="Orders"
          value={analytics.orders.total}
          change={analytics.orders.change}
          icon={ShoppingCart}
          isLoading={isLoading}
        />
        <StatCard
          title="Customers"
          value={analytics.customers.total}
          change={analytics.customers.change}
          icon={Users}
          isLoading={isLoading}
        />
        <StatCard
          title="Conversion Rate"
          value={analytics.conversions.rate.toFixed(1)}
          change={analytics.conversions.change}
          icon={TrendingUp}
          suffix="%"
          isLoading={isLoading}
        />
      </div>

      <Tabs defaultValue="revenue" className="space-y-4">
        <TabsList>
          <TabsTrigger value="revenue" data-testid="tab-revenue">Revenue</TabsTrigger>
          <TabsTrigger value="orders" data-testid="tab-orders">Orders</TabsTrigger>
          <TabsTrigger value="conversions" data-testid="tab-conversions">Conversions</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <RevenueChart data={analytics.revenue.byDay} isLoading={isLoading} />
            <TopProductsTable data={analytics.topProducts} isLoading={isLoading} />
          </div>
        </TabsContent>

        <TabsContent value="orders" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <OrdersChart data={analytics.orders.byDay} isLoading={isLoading} />
            <TopPagesTable data={analytics.topPages} isLoading={isLoading} />
          </div>
        </TabsContent>

        <TabsContent value="conversions" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <ConversionFunnel data={analytics.conversions} isLoading={isLoading} />
            <Card>
              <CardHeader>
                <CardTitle>Facebook Pixel Events</CardTitle>
                <CardDescription>Conversion tracking performance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium">PageView</p>
                      <p className="text-sm text-muted-foreground">Fired on page load</p>
                    </div>
                    <Badge variant="secondary">Active</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium">InitiateCheckout</p>
                      <p className="text-sm text-muted-foreground">When checkout form is shown</p>
                    </div>
                    <Badge variant="secondary">Active</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium">Purchase</p>
                      <p className="text-sm text-muted-foreground">On successful payment</p>
                    </div>
                    <Badge variant="secondary">Active</Badge>
                  </div>
                  <div className="text-center pt-4">
                    <p className="text-sm text-muted-foreground">
                      Configure Facebook Pixel in Settings to enable tracking
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
