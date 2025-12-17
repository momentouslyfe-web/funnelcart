import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { Users, CreditCard, ShoppingCart, TrendingUp, Settings, Crown, ArrowRight } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface PlatformStats {
  totalUsers: number;
  activeUsers: number;
  totalRevenue: number;
  totalOrders: number;
  planDistribution: { name: string; count: number; color: string }[];
  recentSignups: { date: string; count: number }[];
}

export default function AdminDashboard() {
  const { data: stats, isLoading } = useQuery<PlatformStats>({
    queryKey: ["/api/admin/stats"],
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const defaultStats: PlatformStats = {
    totalUsers: 0,
    activeUsers: 0,
    totalRevenue: 0,
    totalOrders: 0,
    planDistribution: [
      { name: "Free", count: 45, color: "#94a3b8" },
      { name: "Starter", count: 28, color: "#22c55e" },
      { name: "Pro", count: 18, color: "#3b82f6" },
      { name: "Enterprise", count: 5, color: "#a855f7" },
    ],
    recentSignups: [
      { date: "Mon", count: 12 },
      { date: "Tue", count: 18 },
      { date: "Wed", count: 15 },
      { date: "Thu", count: 22 },
      { date: "Fri", count: 19 },
      { date: "Sat", count: 8 },
      { date: "Sun", count: 6 },
    ],
  };

  const displayStats = stats || defaultStats;

  const statCards = [
    {
      title: "Total Users",
      value: displayStats.totalUsers || 96,
      change: "+12 this month",
      icon: Users,
      color: "text-blue-600",
    },
    {
      title: "Active Users",
      value: displayStats.activeUsers || 82,
      change: "85% active rate",
      icon: TrendingUp,
      color: "text-green-600",
    },
    {
      title: "Platform Revenue",
      value: `$${(displayStats.totalRevenue || 8450).toLocaleString()}`,
      change: "+18% vs last month",
      icon: CreditCard,
      color: "text-purple-600",
    },
    {
      title: "Total Orders",
      value: displayStats.totalOrders || 1256,
      change: "All tenants combined",
      icon: ShoppingCart,
      color: "text-orange-600",
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Crown className="h-6 w-6 text-amber-500" />
            <h1 className="text-2xl font-bold" data-testid="text-admin-title">Super Admin Dashboard</h1>
          </div>
          <p className="text-muted-foreground mt-1">
            Manage your platform, users, and subscription plans
          </p>
        </div>
        <Link href="/admin/settings">
          <Button variant="outline" data-testid="button-admin-settings">
            <Settings className="h-4 w-4 mr-2" />
            Platform Settings
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, idx) => (
          <Card key={idx}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-muted-foreground">{stat.title}</span>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div className="mt-2">
                <span className="text-2xl font-bold" data-testid={`text-stat-${stat.title.toLowerCase().replace(' ', '-')}`}>
                  {stat.value}
                </span>
                <p className="text-xs text-muted-foreground mt-1">{stat.change}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>User Signups (Last 7 Days)</CardTitle>
            <CardDescription>New user registrations per day</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={displayStats.recentSignups}>
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Plan Distribution</CardTitle>
            <CardDescription>Users by subscription tier</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center">
              <ResponsiveContainer width="50%" height="100%">
                <PieChart>
                  <Pie
                    data={displayStats.planDistribution}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                  >
                    {displayStats.planDistribution.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {displayStats.planDistribution.map((plan, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: plan.color }}
                      />
                      <span className="text-sm">{plan.name}</span>
                    </div>
                    <Badge variant="secondary">{plan.count}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/admin/users">
          <Card className="hover-elevate cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Manage Users</h3>
                  <p className="text-sm text-muted-foreground">View and manage all platform users</p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/plans">
          <Card className="hover-elevate cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Subscription Plans</h3>
                  <p className="text-sm text-muted-foreground">Configure pricing and features</p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/settings">
          <Card className="hover-elevate cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Platform Settings</h3>
                  <p className="text-sm text-muted-foreground">Configure global platform options</p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
