import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { StatCard } from "@/components/StatCard";
import { DollarSign, TrendingUp, TrendingDown, ArrowUpDown } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function Accounting() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ type: "income", category: "", amount: 0, description: "", payment_method: "cash", transaction_date: new Date().toISOString().split("T")[0] });
  const queryClient = useQueryClient();

  const { data: transactions } = useQuery({
    queryKey: ["transactions"],
    queryFn: async () => {
      const { data } = await supabase.from("transactions").select("*").order("transaction_date", { ascending: false });
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
      toast.success("Transaction added");
      setOpen(false);
      setForm({ type: "income", category: "", amount: 0, description: "", payment_method: "cash", transaction_date: new Date().toISOString().split("T")[0] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader title="Accounting" description="Track income and expenses" actionLabel="Add Transaction" onAction={() => setOpen(true)} />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard title="Total Income" value={`৳${totalIncome.toFixed(2)}`} icon={TrendingUp} />
        <StatCard title="Total Expense" value={`৳${totalExpense.toFixed(2)}`} icon={TrendingDown} />
        <StatCard title="Net Profit" value={`৳${(totalIncome - totalExpense).toFixed(2)}`} icon={DollarSign} />
      </div>

      {transactions && transactions.length > 0 ? (
        <div className="bg-card rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">Date</th>
                  <th className="text-left p-3 font-medium">Type</th>
                  <th className="text-left p-3 font-medium">Category</th>
                  <th className="text-left p-3 font-medium hidden sm:table-cell">Description</th>
                  <th className="text-left p-3 font-medium hidden md:table-cell">Payment</th>
                  <th className="text-right p-3 font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="p-3">{new Date(t.transaction_date).toLocaleDateString()}</td>
                    <td className="p-3"><Badge variant={t.type === "income" ? "default" : "destructive"}>{t.type}</Badge></td>
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
        <EmptyState icon={ArrowUpDown} title="No transactions yet" description="Add transactions or they'll be auto-created from POS sales." />
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Transaction</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div>
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Category *</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Sales, Rent, Utilities" /></div>
            <div><Label>Amount *</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} /></div>
            <div><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div><Label>Date</Label><Input type="date" value={form.transaction_date} onChange={(e) => setForm({ ...form, transaction_date: e.target.value })} /></div>
            <div>
              <Label>Payment Method</Label>
              <Select value={form.payment_method} onValueChange={(v) => setForm({ ...form, payment_method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="mobile">Mobile</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => saveMutation.mutate()} disabled={!form.category || !form.amount || saveMutation.isPending}>
              {saveMutation.isPending ? "Saving..." : "Add Transaction"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
