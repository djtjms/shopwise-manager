import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Search, Plus, Minus, Trash2, ShoppingCart, ScanLine, Printer, User } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QRScanner } from "@/components/QRScanner";
import { printReceipt } from "@/components/ReceiptPrint";

interface CartItem {
  product_id: string;
  name: string;
  selling_price: number;
  quantity: number;
  stock: number;
  batch_number?: string;
}

export default function POS() {
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [customerId, setCustomerId] = useState<string>("");
  const [scanOpen, setScanOpen] = useState(false);
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

  const { data: customers } = useQuery({
    queryKey: ["pos-customers"],
    queryFn: async () => {
      const { data } = await supabase.from("customers").select("id, name, phone").order("name");
      return data || [];
    },
  });

  const { data: storeSettings } = useQuery({
    queryKey: ["store-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("store_settings").select("key, value");
      const map: Record<string, string> = {};
      data?.forEach((s: any) => { map[s.key] = s.value || ""; });
      return map;
    },
  });

  const addToCart = (product: any) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product_id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock_quantity) {
          toast.error("স্টকে পর্যাপ্ত পরিমাণ নেই");
          return prev;
        }
        return prev.map((i) =>
          i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { product_id: product.id, name: product.name, selling_price: product.selling_price, quantity: 1, stock: product.stock_quantity, batch_number: product.batch_number }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev.map((i) => {
        if (i.product_id !== id) return i;
        const newQty = i.quantity + delta;
        if (newQty <= 0) return i;
        if (newQty > i.stock) { toast.error("স্টকে পর্যাপ্ত পরিমাণ নেই"); return i; }
        return { ...i, quantity: newQty };
      })
    );
  };

  const removeItem = (id: string) => setCart((prev) => prev.filter((i) => i.product_id !== id));

  const subtotal = cart.reduce((s, i) => s + i.selling_price * i.quantity, 0);
  const total = subtotal - discount;

  const handleScan = (data: string) => {
    try {
      const parsed = JSON.parse(data);
      if (parsed.id) {
        const found = products?.find((p: any) => p.id === parsed.id);
        if (found) {
          addToCart(found);
          setScanOpen(false);
          toast.success(`যোগ করা হয়েছে: ${found.name}`);
        } else {
          setSearch(parsed.name || "");
          setScanOpen(false);
        }
      }
    } catch {
      setSearch(data);
      setScanOpen(false);
      toast.info(`খুঁজছে: ${data}`);
    }
  };

  const completeSale = useMutation({
    mutationFn: async () => {
      const orderNumber = `ORD-${Date.now()}`;
      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .insert({
          order_number: orderNumber, order_type: "sale", status: "completed",
          subtotal, discount, tax: 0, total,
          payment_method: paymentMethod,
          customer_id: customerId || null,
        })
        .select("*, customers(name, phone)")
        .single();
      if (orderErr) throw orderErr;

      const items = cart.map((i) => ({
        order_id: order.id, product_id: i.product_id,
        quantity: i.quantity, unit_price: i.selling_price,
        total_price: i.selling_price * i.quantity,
      }));
      const { error: itemsErr } = await supabase.from("order_items").insert(items);
      if (itemsErr) throw itemsErr;

      for (const item of cart) {
        const { error } = await supabase.from("products").update({ stock_quantity: item.stock - item.quantity }).eq("id", item.product_id);
        if (error) throw error;
      }

      await supabase.from("transactions").insert({
        type: "income", category: "Sales", amount: total,
        description: `বিক্রয় ${orderNumber}`, reference_id: order.id,
        payment_method: paymentMethod,
      });

      return order;
    },
    onSuccess: (order) => {
      toast.success("বিক্রয় সম্পন্ন হয়েছে!");
      // Auto print receipt
      const orderItems = cart.map((i) => ({
        products: { name: i.name },
        quantity: i.quantity,
        unit_price: i.selling_price,
        total_price: i.selling_price * i.quantity,
      }));
      printReceipt(order, orderItems, storeSettings || {});
      setCart([]);
      setDiscount(0);
      setCustomerId("");
      queryClient.invalidateQueries();
    },
    onError: (e) => toast.error("বিক্রয় ব্যর্থ: " + e.message),
  });

  const currency = storeSettings?.currency_symbol || "৳";

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-5rem)]">
      {/* Products */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="নাম, জেনেরিক নাম, বা বারকোড দিয়ে খুঁজুন..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Button variant="outline" size="icon" onClick={() => setScanOpen(true)} title="QR/Barcode Scan">
            <ScanLine className="h-4 w-4" />
          </Button>
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
                    <span className="font-bold text-primary text-sm">{currency}{p.selling_price}</span>
                    <span className="text-xs text-muted-foreground">স্টক: {p.stock_quantity}</span>
                  </div>
                  {p.batch_number && <p className="text-xs text-muted-foreground mt-1">ব্যাচ: {p.batch_number}</p>}
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState icon={ShoppingCart} title="কোন পণ্য পাওয়া যায়নি" description="ইনভেন্টরিতে পণ্য যোগ করুন অথবা সার্চ পরিবর্তন করুন।" />
          )}
        </div>
      </div>

      {/* Cart */}
      <Card className="w-full lg:w-96 flex flex-col shrink-0">
        <div className="p-4 border-b">
          <h2 className="font-semibold flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" /> কার্ট ({cart.length})
          </h2>
        </div>

        {/* Customer Selection */}
        <div className="px-4 pt-3">
          <Select value={customerId} onValueChange={setCustomerId}>
            <SelectTrigger className="h-9">
              <User className="h-3 w-3 mr-1" />
              <SelectValue placeholder="Walk-in Customer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="walk-in">Walk-in Customer</SelectItem>
              {customers?.map((c: any) => (
                <SelectItem key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ""}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">পণ্যে ট্যাপ করে কার্টে যোগ করুন</p>
          ) : (
            cart.map((item) => (
              <div key={item.product_id} className="flex items-center gap-2 text-sm">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{item.name}</p>
                  <p className="text-muted-foreground">{currency}{item.selling_price} × {item.quantity}</p>
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
          <div className="flex justify-between text-sm"><span>সাবটোটাল</span><span>{currency}{subtotal.toFixed(2)}</span></div>
          <div className="flex items-center gap-2 text-sm">
            <span>ছাড়</span>
            <Input type="number" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} className="w-24 h-8 text-right ml-auto" />
          </div>
          <div className="flex justify-between font-bold text-lg"><span>মোট</span><span className="text-primary">{currency}{total.toFixed(2)}</span></div>
          <Select value={paymentMethod} onValueChange={setPaymentMethod}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="cash">নগদ (Cash)</SelectItem>
              <SelectItem value="card">কার্ড (Card)</SelectItem>
              <SelectItem value="bkash">বিকাশ (bKash)</SelectItem>
              <SelectItem value="nagad">নগদ (Nagad)</SelectItem>
              <SelectItem value="rocket">রকেট (Rocket)</SelectItem>
            </SelectContent>
          </Select>
          <Button className="w-full" size="lg" disabled={cart.length === 0 || completeSale.isPending} onClick={() => completeSale.mutate()}>
            <Printer className="h-4 w-4 mr-2" />
            {completeSale.isPending ? "প্রক্রিয়াকরণ..." : "বিক্রয় সম্পন্ন করুন"}
          </Button>
        </div>
      </Card>

      <QRScanner open={scanOpen} onOpenChange={setScanOpen} onScan={handleScan} />
    </div>
  );
}
