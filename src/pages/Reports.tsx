import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area } from "recharts";
import { format, subDays } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

const COLORS = ["hsl(152,60%,36%)", "hsl(200,60%,50%)", "hsl(340,60%,50%)", "hsl(40,80%,50%)", "hsl(270,50%,55%)", "hsl(20,80%,50%)"];

export default function Reports() {
  const [range, setRange] = useState("7");

  const startDate = subDays(new Date(), Number(range)).toISOString();

  const { data: salesByDay } = useQuery({
    queryKey: ["sales-by-day", range],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("created_at, total, discount")
        .eq("order_type", "sale")
        .eq("status", "completed")
        .gte("created_at", startDate)
        .order("created_at");

      const grouped: Record<string, { total: number; count: number; discount: number }> = {};
      data?.forEach((o) => {
        const day = format(new Date(o.created_at), "dd/MM");
        if (!grouped[day]) grouped[day] = { total: 0, count: 0, discount: 0 };
        grouped[day].total += Number(o.total);
        grouped[day].count += 1;
        grouped[day].discount += Number(o.discount);
      });
      return Object.entries(grouped).map(([date, d]) => ({ date, total: d.total, count: d.count, discount: d.discount }));
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

      return Object.values(grouped).sort((a, b) => b.revenue - a.revenue).slice(0, 6);
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
        const day = format(new Date(t.transaction_date), "dd/MM");
        if (!grouped[day]) grouped[day] = { date: day, income: 0, expense: 0 };
        if (t.type === "income") grouped[day].income += Number(t.amount);
        else grouped[day].expense += Number(t.amount);
      });
      return Object.values(grouped);
    },
  });

  const { data: paymentBreakdown } = useQuery({
    queryKey: ["payment-breakdown", range],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("payment_method, total")
        .eq("order_type", "sale")
        .eq("status", "completed")
        .gte("created_at", startDate);

      const grouped: Record<string, number> = {};
      data?.forEach((o) => {
        const method = o.payment_method || "cash";
        grouped[method] = (grouped[method] || 0) + Number(o.total);
      });
      return Object.entries(grouped).map(([name, value]) => ({ name, value }));
    },
  });

  const totalRevenue = salesByDay?.reduce((s, d) => s + d.total, 0) || 0;
  const totalOrders = salesByDay?.reduce((s, d) => s + d.count, 0) || 0;
  const totalExpense = revenueVsExpense?.reduce((s, d) => s + d.expense, 0) || 0;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">রিপোর্ট ও বিশ্লেষণ (Reports)</h1>
        <Select value={range} onValueChange={setRange}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">গত ৭ দিন</SelectItem>
            <SelectItem value="30">গত ৩০ দিন</SelectItem>
            <SelectItem value="90">গত ৯০ দিন</SelectItem>
            <SelectItem value="365">গত ১ বছর</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">মোট রেভিনিউ</p>
          <p className="text-2xl font-bold text-primary">৳{totalRevenue.toFixed(0)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">মোট ব্যয়</p>
          <p className="text-2xl font-bold text-destructive">৳{totalExpense.toFixed(0)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">নিট মুনাফা</p>
          <p className="text-2xl font-bold">৳{(totalRevenue - totalExpense).toFixed(0)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">গড় অর্ডার মূল্য</p>
          <p className="text-2xl font-bold">৳{avgOrderValue.toFixed(0)}</p>
          <p className="text-xs text-muted-foreground">{totalOrders} টি অর্ডার</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Trend */}
        <Card className="p-4">
          <h3 className="font-semibold mb-4">বিক্রয় প্রবণতা (Sales Trend)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={salesByDay || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip formatter={(v: number) => `৳${v.toFixed(2)}`} />
              <Area type="monotone" dataKey="total" fill="hsl(152,60%,36%)" fillOpacity={0.2} stroke="hsl(152,60%,36%)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Top Products */}
        <Card className="p-4">
          <h3 className="font-semibold mb-4">শীর্ষ বিক্রিত পণ্য (Top Products)</h3>
          {topProducts && topProducts.length > 0 ? (
            <div>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={topProducts} dataKey="revenue" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name.substring(0, 10)} ${(percent * 100).toFixed(0)}%`}>
                    {topProducts.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => `৳${v.toFixed(2)}`} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 space-y-1">
                {topProducts.slice(0, 5).map((p, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="truncate max-w-[120px]">{p.name}</span>
                    </div>
                    <span className="font-medium">৳{p.revenue.toFixed(0)} ({p.quantity} টি)</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm text-center py-12">এই সময়ে কোন বিক্রয় তথ্য নেই</p>
          )}
        </Card>

        {/* Revenue vs Expense */}
        <Card className="p-4">
          <h3 className="font-semibold mb-4">আয় বনাম ব্যয় (Revenue vs Expenses)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={revenueVsExpense || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip formatter={(v: number) => `৳${v.toFixed(2)}`} />
              <Legend />
              <Line type="monotone" dataKey="income" stroke="hsl(152,60%,36%)" strokeWidth={2} name="আয়" />
              <Line type="monotone" dataKey="expense" stroke="hsl(0,70%,50%)" strokeWidth={2} name="ব্যয়" />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Payment Methods */}
        <Card className="p-4">
          <h3 className="font-semibold mb-4">পেমেন্ট পদ্ধতি (Payment Methods)</h3>
          {paymentBreakdown && paymentBreakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={paymentBreakdown} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" fontSize={12} />
                <YAxis dataKey="name" type="category" fontSize={12} width={60} />
                <Tooltip formatter={(v: number) => `৳${v.toFixed(2)}`} />
                <Bar dataKey="value" fill="hsl(200,60%,50%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted-foreground text-sm text-center py-12">তথ্য নেই</p>
          )}
        </Card>
      </div>
    </div>
  );
}
