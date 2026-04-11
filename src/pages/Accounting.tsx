import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { StatCard } from "@/components/StatCard";
import { DollarSign, TrendingUp, TrendingDown, ArrowUpDown, Download } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function Accounting() {
  const [open, setOpen] = useState(false);
  const [filterType, setFilterType] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [form, setForm] = useState({ type: "income", category: "", amount: 0, description: "", payment_method: "cash", transaction_date: new Date().toISOString().split("T")[0] });
  const queryClient = useQueryClient();

  const { data: transactions } = useQuery({
    queryKey: ["transactions", filterType, dateFrom, dateTo],
    queryFn: async () => {
      let q = supabase.from("transactions").select("*").order("transaction_date", { ascending: false });
      if (filterType !== "all") q = q.eq("type", filterType);
      if (dateFrom) q = q.gte("transaction_date", dateFrom);
      if (dateTo) q = q.lte("transaction_date", dateTo);
      const { data } = await q;
      return data || [];
    },
  });

  const totalIncome = transactions?.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0) || 0;
  const totalExpense = transactions?.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0) || 0;

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("transactions").insert(form);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("লেনদেন যোগ হয়েছে");
      setOpen(false);
      setForm({ type: "income", category: "", amount: 0, description: "", payment_method: "cash", transaction_date: new Date().toISOString().split("T")[0] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
    onError: (e) => toast.error(e.message),
  });

  const categories = {
    income: ["Sales", "Returns", "Other Income"],
    expense: ["Purchase", "Rent", "Utilities", "Salary", "Transport", "Other Expense"],
  };

  return (
    <div>
      <PageHeader title="হিসাব (Accounting)" description="আয় ও ব্যয় ট্র্যাক করুন" actionLabel="লেনদেন যোগ করুন" onAction={() => setOpen(true)} />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard title="মোট আয়" value={`৳${totalIncome.toFixed(2)}`} icon={TrendingUp} />
        <StatCard title="মোট ব্যয়" value={`৳${totalExpense.toFixed(2)}`} icon={TrendingDown} />
        <StatCard title="নিট মুনাফা" value={`৳${(totalIncome - totalExpense).toFixed(2)}`} icon={DollarSign} className={(totalIncome - totalExpense) < 0 ? "border-destructive/30" : "border-primary/30"} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">সব</SelectItem>
            <SelectItem value="income">আয়</SelectItem>
            <SelectItem value="expense">ব্যয়</SelectItem>
          </SelectContent>
        </Select>
        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" placeholder="From" />
        <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" placeholder="To" />
      </div>

      {transactions && transactions.length > 0 ? (
        <div className="bg-card rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">তারিখ</th>
                  <th className="text-left p-3 font-medium">ধরন</th>
                  <th className="text-left p-3 font-medium">ক্যাটাগরি</th>
                  <th className="text-left p-3 font-medium hidden sm:table-cell">বিবরণ</th>
                  <th className="text-left p-3 font-medium hidden md:table-cell">পেমেন্ট</th>
                  <th className="text-right p-3 font-medium">পরিমাণ</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="p-3">{new Date(t.transaction_date).toLocaleDateString("bn-BD")}</td>
                    <td className="p-3"><Badge variant={t.type === "income" ? "default" : "destructive"}>{t.type === "income" ? "আয়" : "ব্যয়"}</Badge></td>
                    <td className="p-3">{t.category}</td>
                    <td className="p-3 hidden sm:table-cell text-muted-foreground">{t.description || "—"}</td>
                    <td className="p-3 hidden md:table-cell capitalize">{t.payment_method}</td>
                    <td className={`p-3 text-right font-medium ${t.type === "income" ? "text-primary" : "text-destructive"}`}>
                      {t.type === "income" ? "+" : "-"}৳{Number(t.amount).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState icon={ArrowUpDown} title="কোন লেনদেন নেই" description="লেনদেন যোগ করুন অথবা POS থেকে বিক্রয় করলে স্বয়ংক্রিয়ভাবে তৈরি হবে।" />
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>লেনদেন যোগ করুন</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div>
              <Label>ধরন (Type)</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v, category: "" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">আয় (Income)</SelectItem>
                  <SelectItem value="expense">ব্যয় (Expense)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>ক্যাটাগরি *</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue placeholder="নির্বাচন করুন" /></SelectTrigger>
                <SelectContent>
                  {categories[form.type as "income" | "expense"].map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>পরিমাণ (৳) *</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} /></div>
            <div><Label>বিবরণ</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div><Label>তারিখ</Label><Input type="date" value={form.transaction_date} onChange={(e) => setForm({ ...form, transaction_date: e.target.value })} /></div>
            <div>
              <Label>পেমেন্ট পদ্ধতি</Label>
              <Select value={form.payment_method} onValueChange={(v) => setForm({ ...form, payment_method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">নগদ</SelectItem>
                  <SelectItem value="card">কার্ড</SelectItem>
                  <SelectItem value="bkash">বিকাশ</SelectItem>
                  <SelectItem value="nagad">নগদ (Nagad)</SelectItem>
                  <SelectItem value="rocket">রকেট</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => saveMutation.mutate()} disabled={!form.category || !form.amount || saveMutation.isPending}>
              {saveMutation.isPending ? "সংরক্ষণ হচ্ছে..." : "লেনদেন যোগ করুন"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
