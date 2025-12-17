import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { ShoppingBag, Download, User, LogOut, Package } from "lucide-react";
import { Button } from "@/components/ui/button";

const menuItems = [
  { title: "My Purchases", url: "/account", icon: Package },
  { title: "Downloads", url: "/account/downloads", icon: Download },
  { title: "Account Settings", url: "/account/settings", icon: User },
];

export function CustomerSidebar() {
  const [location] = useLocation();

  const handleLogout = () => {
    window.location.href = "/api/customer/logout";
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
            <ShoppingBag className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <p className="font-semibold" data-testid="text-customer-portal-title">Customer Portal</p>
            <p className="text-xs text-muted-foreground">Manage your purchases</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Account</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = location === item.url || 
                  (item.url !== "/account" && location.startsWith(item.url));
                
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive}
                      data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      <Link href={item.url}>
                        <item.icon className="w-4 h-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <Button 
          variant="outline" 
          className="w-full" 
          onClick={handleLogout}
          data-testid="button-customer-logout"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Log Out
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
