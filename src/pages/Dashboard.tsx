import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StatCard } from "@/components/StatCard";
import { Package, ShoppingCart, DollarSign, AlertTriangle, Users, ClipboardList, Calendar, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { format, addDays } from "date-fns";

export default function Dashboard() {
  const navigate = useNavigate();

  const { data: products } = useQuery({
    queryKey: ["products-count"],
    queryFn: async () => {
      const { count } = await supabase.from("products").select("*", { count: "exact", head: true });
      return count || 0;
    },
  });

  const { data: lowStock } = useQuery({
    queryKey: ["low-stock-count"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("id, name, stock_quantity, min_stock_level")
        .filter("stock_quantity", "lte", 10).eq("is_active", true);
      return data || [];
    },
  });

  const { data: orders } = useQuery({
    queryKey: ["orders-count"],
    queryFn: async () => {
      const { count } = await supabase.from("orders").select("*", { count: "exact", head: true });
      return count || 0;
    },
  });

  const { data: customers } = useQuery({
    queryKey: ["customers-count"],
    queryFn: async () => {
      const { count } = await supabase.from("customers").select("*", { count: "exact", head: true });
      return count || 0;
    },
  });

  const { data: todaySales } = useQuery({
    queryKey: ["today-sales"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("orders")
        .select("total")
        .eq("order_type", "sale")
        .eq("status", "completed")
        .gte("created_at", today);
      return data?.reduce((sum, o) => sum + Number(o.total), 0) || 0;
    },
  });

  const { data: monthSales } = useQuery({
    queryKey: ["month-sales"],
    queryFn: async () => {
      const firstDay = new Date();
      firstDay.setDate(1);
      const { data } = await supabase
        .from("orders")
        .select("total")
        .eq("order_type", "sale")
        .eq("status", "completed")
        .gte("created_at", firstDay.toISOString().split("T")[0]);
      return data?.reduce((sum, o) => sum + Number(o.total), 0) || 0;
    },
  });

  const { data: expiringProducts } = useQuery({
    queryKey: ["expiring-products"],
    queryFn: async () => {
      const thirtyDaysLater = addDays(new Date(), 30).toISOString().split("T")[0];
      const { data } = await supabase
        .from("products")
        .select("id, name, expiry_date, stock_quantity, batch_number")
        .eq("is_active", true)
        .lte("expiry_date", thirtyDaysLater)
        .gt("stock_quantity", 0)
        .order("expiry_date")
        .limit(10);
      return data || [];
    },
  });

  const { data: recentOrders } = useQuery({
    queryKey: ["recent-orders"],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("*, customers(name)")
        .order("created_at", { ascending: false })
        .limit(5);
      return data || [];
    },
  });

  const lowStockCount = lowStock?.length || 0;
  const expiredCount = expiringProducts?.filter(p => new Date(p.expiry_date!) < new Date()).length || 0;
  const expiringSoonCount = (expiringProducts?.length || 0) - expiredCount;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">ড্যাশবোর্ড (Dashboard)</h1>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="মোট পণ্য" value={products ?? 0} icon={Package} description="সক্রিয় ঔষধ" />
        <StatCard title="আজকের বিক্রয়" value={`৳${todaySales?.toFixed(0) ?? "0"}`} icon={DollarSign} description="আজকের আয়" />
        <StatCard title="মাসিক বিক্রয়" value={`৳${monthSales?.toFixed(0) ?? "0"}`} icon={TrendingUp} description="এই মাসের আয়" />
        <StatCard title="মোট অর্ডার" value={orders ?? 0} icon={ClipboardList} description="সর্বমোট" />
        <StatCard title="গ্রাহক" value={customers ?? 0} icon={Users} description="নিবন্ধিত" />
        <StatCard title="কম স্টক" value={lowStockCount} icon={AlertTriangle} description="ন্যূনতম মাত্রার নিচে" className={lowStockCount > 0 ? "border-destructive/30" : ""} />
        <StatCard title="মেয়াদ উত্তীর্ণ" value={expiredCount} icon={Calendar} description="মেয়াদ শেষ" className={expiredCount > 0 ? "border-destructive/50 bg-destructive/5" : ""} />
        <div className="stat-card cursor-pointer hover:border-primary/50" onClick={() => navigate("/pos")}>
          <div className="flex items-center gap-2 mb-2"><ShoppingCart className="h-5 w-5 text-primary" /><span className="text-sm text-muted-foreground">দ্রুত কার্যকলাপ</span></div>
          <p className="text-lg font-bold text-primary">POS → বিক্রয় শুরু</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expiring Medicines Alert */}
        {expiringProducts && expiringProducts.length > 0 && (
          <div className="bg-card rounded-xl border border-warning/30 p-5">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-warning" /> মেয়াদ উত্তীর্ণ হতে যাচ্ছে (Expiring Soon)
            </h2>
            <div className="space-y-2">
              {expiringProducts.map((p: any) => {
                const isExpired = new Date(p.expiry_date) < new Date();
                return (
                  <div key={p.id} className="flex items-center justify-between text-sm">
                    <div>
                      <span className="font-medium">{p.name}</span>
                      {p.batch_number && <span className="text-xs text-muted-foreground ml-2">ব্যাচ: {p.batch_number}</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">স্টক: {p.stock_quantity}</span>
                      <Badge variant={isExpired ? "destructive" : "secondary"}>
                        {isExpired ? "মেয়াদ শেষ" : format(new Date(p.expiry_date), "dd/MM/yyyy")}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Low Stock Alert */}
        {lowStock && lowStock.length > 0 && (
          <div className="bg-card rounded-xl border border-destructive/20 p-5">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" /> কম স্টক সতর্কতা (Low Stock)
            </h2>
            <div className="space-y-2">
              {lowStock.slice(0, 8).map((p: any) => (
                <div key={p.id} className="flex items-center justify-between text-sm">
                  <span className="font-medium">{p.name}</span>
                  <Badge variant="destructive">{p.stock_quantity} / {p.min_stock_level}</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Orders */}
        <div className="bg-card rounded-xl border p-5 lg:col-span-2">
          <h2 className="font-semibold mb-4">সাম্প্রতিক অর্ডার (Recent Orders)</h2>
          {recentOrders && recentOrders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-2 font-medium">অর্ডার #</th>
                    <th className="text-left py-2 font-medium">গ্রাহক</th>
                    <th className="text-left py-2 font-medium">স্ট্যাটাস</th>
                    <th className="text-left py-2 font-medium hidden sm:table-cell">পেমেন্ট</th>
                    <th className="text-right py-2 font-medium">মোট</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order: any) => (
                    <tr key={order.id} className="border-b last:border-0">
                      <td className="py-2 font-mono text-xs">{order.order_number}</td>
                      <td className="py-2">{order.customers?.name || "Walk-in"}</td>
                      <td className="py-2">
                        <Badge variant={order.status === "completed" ? "default" : order.status === "cancelled" ? "destructive" : "secondary"}>
                          {order.status}
                        </Badge>
                      </td>
                      <td className="py-2 hidden sm:table-cell capitalize">{order.payment_method}</td>
                      <td className="py-2 text-right font-medium">৳{Number(order.total).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">কোন অর্ডার নেই। POS থেকে বিক্রয় শুরু করুন।</p>
          )}
        </div>
      </div>
    </div>
  );
}
