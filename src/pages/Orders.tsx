import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { ClipboardList, Printer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { printReceipt, useReceiptData } from "@/components/ReceiptPrint";

export default function Orders() {
  const queryClient = useQueryClient();
  const [printingOrderId, setPrintingOrderId] = useState<string | null>(null);

  const { data: orders, isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("*, customers(name)")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("orders").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Status updated"); queryClient.invalidateQueries({ queryKey: ["orders"] }); },
    onError: (e) => toast.error(e.message),
  });

  const handlePrint = async (orderId: string) => {
    const { data: order } = await supabase.from("orders").select("*, customers(name, phone)").eq("id", orderId).single();
    const { data: items } = await supabase.from("order_items").select("*, products(name)").eq("order_id", orderId);
    const { data: settings } = await supabase.from("store_settings").select("key, value");
    const store: Record<string, string> = {};
    settings?.forEach((s: any) => { store[s.key] = s.value || ""; });
    if (order) printReceipt(order, items || [], store);
  };

  return (
    <div>
      <PageHeader title="Orders" description="View and manage all orders" />
      {isLoading ? <p className="text-muted-foreground">Loading...</p> : orders && orders.length > 0 ? (
        <div className="bg-card rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">Order #</th>
                  <th className="text-left p-3 font-medium hidden sm:table-cell">Customer</th>
                  <th className="text-left p-3 font-medium">Type</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-right p-3 font-medium">Total</th>
                  <th className="text-left p-3 font-medium hidden md:table-cell">Payment</th>
                  <th className="text-left p-3 font-medium hidden lg:table-cell">Date</th>
                  <th className="text-right p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o: any) => (
                  <tr key={o.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="p-3 font-mono text-xs">{o.order_number}</td>
                    <td className="p-3 hidden sm:table-cell">{o.customers?.name || "Walk-in"}</td>
                    <td className="p-3"><Badge variant={o.order_type === "sale" ? "default" : "secondary"}>{o.order_type}</Badge></td>
                    <td className="p-3">
                      <Badge variant={o.status === "completed" ? "default" : o.status === "cancelled" ? "destructive" : "secondary"}>{o.status}</Badge>
                    </td>
                    <td className="p-3 text-right font-medium">৳{Number(o.total).toFixed(2)}</td>
                    <td className="p-3 hidden md:table-cell capitalize">{o.payment_method}</td>
                    <td className="p-3 hidden lg:table-cell text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</td>
                    <td className="p-3 text-right flex items-center justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => handlePrint(o.id)} title="Print Receipt">
                        <Printer className="h-4 w-4" />
                      </Button>
                      <Select value={o.status} onValueChange={(v) => updateStatus.mutate({ id: o.id, status: v })}>
                        <SelectTrigger className="w-28 h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState icon={ClipboardList} title="No orders yet" description="Orders will appear here when you make sales from the POS." />
      )}
    </div>
  );
}
