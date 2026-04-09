import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Search, Plus, Minus, Trash2, ShoppingCart } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CartItem {
  product_id: string;
  name: string;
  selling_price: number;
  quantity: number;
  stock: number;
}

export default function POS() {
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const queryClient = useQueryClient();

  const { data: products } = useQuery({
    queryKey: ["pos-products", search],
    queryFn: async () => {
      let q = supabase.from("products").select("*").eq("is_active", true).gt("stock_quantity", 0);
      if (search) q = q.or(`name.ilike.%${search}%,generic_name.ilike.%${search}%,barcode.eq.${search}`);
      const { data } = await q.order("name").limit(20);
      return data || [];
    },
  });

  const addToCart = (product: any) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product_id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock_quantity) {
          toast.error("Not enough stock");
          return prev;
        }
        return prev.map((i) =>
          i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { product_id: product.id, name: product.name, selling_price: product.selling_price, quantity: 1, stock: product.stock_quantity }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev.map((i) => {
        if (i.product_id !== id) return i;
        const newQty = i.quantity + delta;
        if (newQty <= 0) return i;
        if (newQty > i.stock) { toast.error("Not enough stock"); return i; }
        return { ...i, quantity: newQty };
      })
    );
  };

  const removeItem = (id: string) => setCart((prev) => prev.filter((i) => i.product_id !== id));

  const subtotal = cart.reduce((s, i) => s + i.selling_price * i.quantity, 0);
  const total = subtotal - discount;

  const completeSale = useMutation({
    mutationFn: async () => {
      const orderNumber = `ORD-${Date.now()}`;
      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .insert({ order_number: orderNumber, order_type: "sale", status: "completed", subtotal, discount, tax: 0, total, payment_method: paymentMethod })
        .select()
        .single();
      if (orderErr) throw orderErr;

      const items = cart.map((i) => ({ order_id: order.id, product_id: i.product_id, quantity: i.quantity, unit_price: i.selling_price, total_price: i.selling_price * i.quantity }));
      const { error: itemsErr } = await supabase.from("order_items").insert(items);
      if (itemsErr) throw itemsErr;

      // Update stock
      for (const item of cart) {
        const { error } = await supabase.from("products").update({ stock_quantity: item.stock - item.quantity }).eq("id", item.product_id);
        if (error) throw error;
      }

      // Record transaction
      await supabase.from("transactions").insert({ type: "income", category: "Sales", amount: total, description: `Sale ${orderNumber}`, reference_id: order.id, payment_method: paymentMethod });

      return order;
    },
    onSuccess: () => {
      toast.success("Sale completed!");
      setCart([]);
      setDiscount(0);
      queryClient.invalidateQueries();
    },
    onError: (e) => toast.error("Sale failed: " + e.message),
  });

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-5rem)]">
      {/* Products */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name, generic name, or barcode..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex-1 overflow-auto">
          {products && products.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {products.map((p: any) => (
                <Card key={p.id} className="p-3 cursor-pointer hover:shadow-md transition-shadow" onClick={() => addToCart(p)}>
                  {p.image_url && <img src={p.image_url} alt={p.name} className="w-full h-20 object-cover rounded mb-2" />}
                  <p className="font-medium text-sm truncate">{p.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{p.generic_name}</p>
                  <div className="flex justify-between items-center mt-2">
                    <span className="font-bold text-primary text-sm">৳{p.selling_price}</span>
                    <span className="text-xs text-muted-foreground">Stock: {p.stock_quantity}</span>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState icon={ShoppingCart} title="No products found" description="Add products in Inventory first, or adjust your search." />
          )}
        </div>
      </div>

      {/* Cart */}
      <Card className="w-full lg:w-96 flex flex-col shrink-0">
        <div className="p-4 border-b">
          <h2 className="font-semibold flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" /> Cart ({cart.length})
          </h2>
        </div>
        <div className="flex-1 overflow-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Tap products to add to cart</p>
          ) : (
            cart.map((item) => (
              <div key={item.product_id} className="flex items-center gap-2 text-sm">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{item.name}</p>
                  <p className="text-muted-foreground">৳{item.selling_price} × {item.quantity}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQty(item.product_id, -1)}><Minus className="h-3 w-3" /></Button>
                  <span className="w-6 text-center">{item.quantity}</span>
                  <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQty(item.product_id, 1)}><Plus className="h-3 w-3" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeItem(item.product_id)}><Trash2 className="h-3 w-3" /></Button>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="p-4 border-t space-y-3">
          <div className="flex justify-between text-sm"><span>Subtotal</span><span>৳{subtotal.toFixed(2)}</span></div>
          <div className="flex items-center gap-2 text-sm">
            <span>Discount</span>
            <Input type="number" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} className="w-24 h-8 text-right ml-auto" />
          </div>
          <div className="flex justify-between font-bold text-lg"><span>Total</span><span className="text-primary">৳{total.toFixed(2)}</span></div>
          <Select value={paymentMethod} onValueChange={setPaymentMethod}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="cash">Cash</SelectItem>
              <SelectItem value="card">Card</SelectItem>
              <SelectItem value="mobile">Mobile Payment</SelectItem>
            </SelectContent>
          </Select>
          <Button className="w-full" size="lg" disabled={cart.length === 0 || completeSale.isPending} onClick={() => completeSale.mutate()}>
            {completeSale.isPending ? "Processing..." : "Complete Sale"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
