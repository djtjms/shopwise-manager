import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  ClipboardList,
  DollarSign,
  Users,
  Truck,
  Tags,
  Settings,
  Pill,
  LogOut,
  UserCog,
  PackagePlus,
  BarChart3,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
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
  useSidebar,
} from "@/components/ui/sidebar";

const mainItems = [
  { title: "ড্যাশবোর্ড", url: "/", icon: LayoutDashboard },
  { title: "POS বিক্রয়", url: "/pos", icon: ShoppingCart },
  { title: "ইনভেন্টরি", url: "/inventory", icon: Package },
  { title: "অর্ডার", url: "/orders", icon: ClipboardList },
  { title: "ক্রয় আদেশ", url: "/purchase-orders", icon: PackagePlus },
  { title: "রিপোর্ট", url: "/reports", icon: BarChart3 },
  { title: "হিসাব", url: "/accounting", icon: DollarSign },
];

const managementItems = [
  { title: "গ্রাহক", url: "/customers", icon: Users },
  { title: "সরবরাহকারী", url: "/suppliers", icon: Truck },
  { title: "ক্যাটাগরি", url: "/categories", icon: Tags },
  { title: "সেটিংস", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { user, role, isSuperAdmin, signOut } = useAuth();

  const { data: storeName } = useQuery({
    queryKey: ["store-name"],
    queryFn: async () => {
      const { data } = await supabase.from("store_settings").select("value").eq("key", "store_name").maybeSingle();
      return data?.value || "MediShop";
    },
  });

  const isActive = (path: string) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  const adminItems = isSuperAdmin
    ? [{ title: "ব্যবহারকারী", url: "/users", icon: UserCog }]
    : [];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <Pill className="h-7 w-7 text-sidebar-primary shrink-0" />
          {!collapsed && (
            <span className="font-bold text-lg text-sidebar-primary-foreground truncate">
              {storeName || "MediShop"}
            </span>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>প্রধান মেনু</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink to={item.url} end={item.url === "/"}>
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>ব্যবস্থাপনা</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {[...managementItems, ...adminItems].map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink to={item.url}>
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-3 border-t border-sidebar-border">
        {!collapsed && user && (
          <div className="mb-2 px-1">
            <p className="text-xs text-sidebar-foreground truncate">{user.email}</p>
            <p className="text-xs text-sidebar-foreground/60 capitalize">
              {role === "super_admin" ? "সুপার অ্যাডমিন" : role === "admin" ? "অ্যাডমিন" : "স্টাফ"}
            </p>
          </div>
        )}
        <Button
          variant="ghost"
          size={collapsed ? "icon" : "sm"}
          className="w-full text-sidebar-foreground hover:text-sidebar-primary-foreground hover:bg-sidebar-accent"
          onClick={signOut}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span className="ml-2">লগ আউট</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
