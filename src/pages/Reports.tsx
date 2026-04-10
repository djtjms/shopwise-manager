import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { format, subDays, startOfDay, startOfWeek, startOfMonth } from "date-fns";

const COLORS = ["hsl(152,60%,36%)", "hsl(200,60%,50%)", "hsl(340,60%,50%)", "hsl(40,80%,50%)", "hsl(270,50%,55%)"];

export default function Reports() {
  const [range, setRange] = useState("7");

  const startDate = (() => {
    const days = Number(range);
    return subDays(new Date(), days).toISOString();
  })();

  const { data: salesByDay } = useQuery({
    queryKey: ["sales-by-day", range],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("created_at, total")
        .eq("order_type", "sale")
        .eq("status", "completed")
        .gte("created_at", startDate)
        .order("created_at");

      const grouped: Record<string, number> = {};
      data?.forEach((o) => {
        const day = format(new Date(o.created_at), "MMM dd");
        grouped[day] = (grouped[day] || 0) + Number(o.total);
      });
      return Object.entries(grouped).map(([date, total]) => ({ date, total }));
    },
  });

  const { data: topProducts } = useQuery({
    queryKey: ["top-products", range],
    queryFn: async () => {
      const { data: orderIds } = await supabase
        .from("orders")
        .select("id")
        .eq("order_type", "sale")
        .eq("status", "completed")
        .gte("created_at", startDate);

      if (!orderIds?.length) return [];

      const { data: items } = await supabase
        .from("order_items")
        .select("product_id, quantity, total_price, products(name)")
        .in("order_id", orderIds.map((o) => o.id));

      const grouped: Record<string, { name: string; quantity: number; revenue: number }> = {};
      items?.forEach((i: any) => {
        const pid = i.product_id;
        if (!grouped[pid]) grouped[pid] = { name: i.products?.name || "Unknown", quantity: 0, revenue: 0 };
        grouped[pid].quantity += i.quantity;
        grouped[pid].revenue += Number(i.total_price);
      });

      return Object.values(grouped)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);
    },
  });

  const { data: revenueVsExpense } = useQuery({
    queryKey: ["revenue-expense", range],
    queryFn: async () => {
      const { data } = await supabase
        .from("transactions")
        .select("type, amount, transaction_date")
        .gte("transaction_date", startDate.split("T")[0])
        .order("transaction_date");

      const grouped: Record<string, { date: string; income: number; expense: number }> = {};
      data?.forEach((t) => {
        const day = format(new Date(t.transaction_date), "MMM dd");
        if (!grouped[day]) grouped[day] = { date: day, income: 0, expense: 0 };
        if (t.type === "income") grouped[day].income += Number(t.amount);
        else grouped[day].expense += Number(t.amount);
      });
      return Object.values(grouped);
    },
  });

  const totalRevenue = salesByDay?.reduce((s, d) => s + d.total, 0) || 0;
  const totalExpense = revenueVsExpense?.reduce((s, d) => s + d.expense, 0) || 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Reports & Analytics</h1>
        <Select value={range} onValueChange={setRange}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 Days</SelectItem>
            <SelectItem value="30">Last 30 Days</SelectItem>
            <SelectItem value="90">Last 90 Days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Revenue</p>
          <p className="text-2xl font-bold text-primary">৳{totalRevenue.toFixed(2)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Expenses</p>
          <p className="text-2xl font-bold text-destructive">৳{totalExpense.toFixed(2)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Net Profit</p>
          <p className="text-2xl font-bold">৳{(totalRevenue - totalExpense).toFixed(2)}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Trend */}
        <Card className="p-4">
          <h3 className="font-semibold mb-4">Sales Trend</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={salesByDay || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip formatter={(v: number) => `৳${v.toFixed(2)}`} />
              <Bar dataKey="total" fill="hsl(152,60%,36%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Top Products */}
        <Card className="p-4">
          <h3 className="font-semibold mb-4">Top Selling Products</h3>
          {topProducts && topProducts.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={topProducts} dataKey="revenue" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {topProducts.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => `৳${v.toFixed(2)}`} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted-foreground text-sm text-center py-12">No sales data for this period</p>
          )}
        </Card>

        {/* Revenue vs Expense */}
        <Card className="p-4 lg:col-span-2">
          <h3 className="font-semibold mb-4">Revenue vs Expenses</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={revenueVsExpense || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip formatter={(v: number) => `৳${v.toFixed(2)}`} />
              <Line type="monotone" dataKey="income" stroke="hsl(152,60%,36%)" strokeWidth={2} name="Income" />
              <Line type="monotone" dataKey="expense" stroke="hsl(0,70%,50%)" strokeWidth={2} name="Expense" />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}
