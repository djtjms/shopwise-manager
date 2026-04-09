import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StatCard } from "@/components/StatCard";
import { Package, ShoppingCart, DollarSign, AlertTriangle, Users, ClipboardList } from "lucide-react";

export default function Dashboard() {
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
      const { data } = await supabase.from("products").select("id").filter("stock_quantity", "lte", 10);
      return data?.length || 0;
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

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatCard title="Total Products" value={products ?? 0} icon={Package} description="Active medicines" />
        <StatCard title="Today's Sales" value={`৳${todaySales?.toFixed(2) ?? "0.00"}`} icon={DollarSign} description="Revenue today" />
        <StatCard title="Total Orders" value={orders ?? 0} icon={ClipboardList} description="All time" />
        <StatCard title="Customers" value={customers ?? 0} icon={Users} description="Registered" />
        <StatCard title="Low Stock" value={lowStock ?? 0} icon={AlertTriangle} description="Below minimum level" className={lowStock && lowStock > 0 ? "border-destructive/30" : ""} />
        <StatCard title="Quick Actions" value="→" icon={ShoppingCart} description="Go to POS to start selling" />
      </div>

      <div className="bg-card rounded-xl border p-5">
        <h2 className="font-semibold mb-4">Recent Orders</h2>
        {recentOrders && recentOrders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-left py-2 font-medium">Order #</th>
                  <th className="text-left py-2 font-medium">Customer</th>
                  <th className="text-left py-2 font-medium">Status</th>
                  <th className="text-right py-2 font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order: any) => (
                  <tr key={order.id} className="border-b last:border-0">
                    <td className="py-2 font-mono text-xs">{order.order_number}</td>
                    <td className="py-2">{order.customers?.name || "Walk-in"}</td>
                    <td className="py-2">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        order.status === "completed" ? "bg-primary/10 text-primary" :
                        order.status === "cancelled" ? "bg-destructive/10 text-destructive" :
                        "bg-warning/10 text-warning"
                      }`}>{order.status}</span>
                    </td>
                    <td className="py-2 text-right font-medium">৳{Number(order.total).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">No orders yet. Start selling from the POS.</p>
        )}
      </div>
    </div>
  );
}
