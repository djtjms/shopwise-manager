import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { ClipboardList, Plus, Trash2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface POItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_cost: number;
}

export default function PurchaseOrders() {
  const [open, setOpen] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<POItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [qty, setQty] = useState(1);
  const [unitCost, setUnitCost] = useState(0);
  const queryClient = useQueryClient();

  const { data: purchaseOrders, isLoading } = useQuery({
    queryKey: ["purchase-orders"],
    queryFn: async () => {
      const { data } = await supabase
        .from("purchase_orders")
        .select("*, suppliers(name)")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: suppliers } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const { data } = await supabase.from("suppliers").select("*").order("name");
      return data || [];
    },
  });

  const { data: products } = useQuery({
    queryKey: ["products-list"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("id, name, purchase_price").order("name");
      return data || [];
    },
  });

  const addItem = () => {
    const prod = products?.find((p: any) => p.id === selectedProduct);
    if (!prod) return;
    if (items.find((i) => i.product_id === prod.id)) {
      toast.error("Product already added");
      return;
    }
    setItems((prev) => [...prev, { product_id: prod.id, product_name: prod.name, quantity: qty, unit_cost: unitCost || prod.purchase_price }]);
    setSelectedProduct("");
    setQty(1);
    setUnitCost(0);
  };

  const removeItem = (pid: string) => setItems((prev) => prev.filter((i) => i.product_id !== pid));

  const createPO = useMutation({
    mutationFn: async () => {
      const subtotal = items.reduce((s, i) => s + i.quantity * i.unit_cost, 0);
      const poNumber = `PO-${Date.now()}`;
      const { data: po, error } = await supabase
        .from("purchase_orders")
        .insert({ po_number: poNumber, supplier_id: supplierId || null, subtotal, total: subtotal, notes: notes || null })
        .select()
        .single();
      if (error) throw error;

      const poItems = items.map((i) => ({
        purchase_order_id: po.id,
        product_id: i.product_id,
        quantity: i.quantity,
        unit_cost: i.unit_cost,
        total_cost: i.quantity * i.unit_cost,
      }));
      const { error: itemsErr } = await supabase.from("purchase_order_items").insert(poItems);
      if (itemsErr) throw itemsErr;

      // Record expense transaction
      await supabase.from("transactions").insert({
        type: "expense",
        category: "Purchase",
        amount: subtotal,
        description: `Purchase Order ${poNumber}`,
        reference_id: po.id,
      });
    },
    onSuccess: () => {
      toast.success("Purchase order created");
      setOpen(false);
      setItems([]);
      setSupplierId("");
      setNotes("");
      queryClient.invalidateQueries();
    },
    onError: (e) => toast.error(e.message),
  });

  const receivePO = useMutation({
    mutationFn: async (po: any) => {
      // Get PO items
      const { data: poItems } = await supabase
        .from("purchase_order_items")
        .select("*")
        .eq("purchase_order_id", po.id);

      // Update stock for each item
      for (const item of poItems || []) {
        const { data: product } = await supabase
          .from("products")
          .select("stock_quantity")
          .eq("id", item.product_id)
          .single();
        if (product) {
          await supabase
            .from("products")
            .update({ stock_quantity: product.stock_quantity + item.quantity })
            .eq("id", item.product_id);
        }
      }

      // Mark PO as received
      await supabase
        .from("purchase_orders")
        .update({ status: "received", received_at: new Date().toISOString() })
        .eq("id", po.id);
    },
    onSuccess: () => {
      toast.success("Purchase order received — inventory updated!");
      queryClient.invalidateQueries();
    },
    onError: (e) => toast.error(e.message),
  });

  const statusColor = (s: string) =>
    s === "received" ? "bg-primary/10 text-primary" : s === "cancelled" ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning";

  return (
    <div>
      <PageHeader title="Purchase Orders" description="Track medicine purchases from suppliers" actionLabel="New Purchase Order" onAction={() => setOpen(true)} />

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : purchaseOrders && purchaseOrders.length > 0 ? (
        <div className="bg-card rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">PO #</th>
                  <th className="text-left p-3 font-medium hidden sm:table-cell">Supplier</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-right p-3 font-medium">Total</th>
                  <th className="text-right p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {purchaseOrders.map((po: any) => (
                  <tr key={po.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="p-3 font-mono text-xs">{po.po_number}</td>
                    <td className="p-3 hidden sm:table-cell">{po.suppliers?.name || "—"}</td>
                    <td className="p-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(po.status)}`}>
                        {po.status}
                      </span>
                    </td>
                    <td className="p-3 text-right font-medium">৳{Number(po.total).toFixed(2)}</td>
                    <td className="p-3 text-right">
                      {po.status === "pending" && (
                        <Button size="sm" variant="outline" onClick={() => receivePO.mutate(po)} disabled={receivePO.isPending}>
                          <Check className="h-3 w-3 mr-1" /> Receive
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState icon={ClipboardList} title="No purchase orders" description="Create your first purchase order to track supplier purchases." actionLabel="New Purchase Order" onAction={() => setOpen(true)} />
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Purchase Order</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div>
              <Label>Supplier</Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                <SelectContent>{suppliers?.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className="border rounded-lg p-3 space-y-3">
              <Label className="font-medium">Add Items</Label>
              <div className="flex gap-2">
                <Select value={selectedProduct} onValueChange={(v) => {
                  setSelectedProduct(v);
                  const p = products?.find((p: any) => p.id === v);
                  if (p) setUnitCost(p.purchase_price);
                }}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Select product" /></SelectTrigger>
                  <SelectContent>{products?.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
                <Input type="number" value={qty} onChange={(e) => setQty(Number(e.target.value))} className="w-16" placeholder="Qty" />
                <Input type="number" value={unitCost} onChange={(e) => setUnitCost(Number(e.target.value))} className="w-24" placeholder="Cost" />
                <Button size="icon" onClick={addItem} disabled={!selectedProduct}><Plus className="h-4 w-4" /></Button>
              </div>

              {items.length > 0 && (
                <div className="space-y-2">
                  {items.map((item) => (
                    <div key={item.product_id} className="flex items-center justify-between text-sm bg-muted/50 rounded p-2">
                      <span className="truncate flex-1">{item.product_name}</span>
                      <span className="mx-2">{item.quantity} × ৳{item.unit_cost}</span>
                      <span className="font-medium mr-2">৳{(item.quantity * item.unit_cost).toFixed(2)}</span>
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => removeItem(item.product_id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  <div className="text-right font-bold">
                    Total: ৳{items.reduce((s, i) => s + i.quantity * i.unit_cost, 0).toFixed(2)}
                  </div>
                </div>
              )}
            </div>

            <div>
              <Label>Notes</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" />
            </div>

            <Button onClick={() => createPO.mutate()} disabled={items.length === 0 || createPO.isPending}>
              {createPO.isPending ? "Creating..." : "Create Purchase Order"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
