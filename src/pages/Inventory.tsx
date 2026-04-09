import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Package, Pencil, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function Inventory() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data: products, isLoading } = useQuery({
    queryKey: ["products", search],
    queryFn: async () => {
      let q = supabase.from("products").select("*, categories(name)").order("name");
      if (search) q = q.or(`name.ilike.%${search}%,generic_name.ilike.%${search}%,sku.ilike.%${search}%`);
      const { data } = await q;
      return data || [];
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("*").order("name");
      return data || [];
    },
  });

  const [form, setForm] = useState({
    name: "", generic_name: "", category_id: "", sku: "", barcode: "", description: "",
    unit: "piece", purchase_price: 0, selling_price: 0, stock_quantity: 0,
    min_stock_level: 10, expiry_date: "", manufacturer: "", image_url: "",
  });

  const resetForm = () => {
    setForm({ name: "", generic_name: "", category_id: "", sku: "", barcode: "", description: "", unit: "piece", purchase_price: 0, selling_price: 0, stock_quantity: 0, min_stock_level: 10, expiry_date: "", manufacturer: "", image_url: "" });
    setEditing(null);
  };

  const openEdit = (p: any) => {
    setForm({ name: p.name, generic_name: p.generic_name || "", category_id: p.category_id || "", sku: p.sku || "", barcode: p.barcode || "", description: p.description || "", unit: p.unit, purchase_price: p.purchase_price, selling_price: p.selling_price, stock_quantity: p.stock_quantity, min_stock_level: p.min_stock_level, expiry_date: p.expiry_date || "", manufacturer: p.manufacturer || "", image_url: p.image_url || "" });
    setEditing(p);
    setOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop();
    const path = `${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file);
    if (error) { toast.error("Upload failed"); return; }
    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    setForm((f) => ({ ...f, image_url: data.publicUrl }));
    toast.success("Image uploaded");
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { ...form, category_id: form.category_id || null, expiry_date: form.expiry_date || null };
      if (editing) {
        const { error } = await supabase.from("products").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("products").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Product updated" : "Product added");
      setOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Product deleted"); queryClient.invalidateQueries({ queryKey: ["products"] }); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader title="Inventory" description="Manage your medicine stock" actionLabel="Add Product" onAction={() => { resetForm(); setOpen(true); }} />
      <Input placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm mb-4" />

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : products && products.length > 0 ? (
        <div className="bg-card rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">Product</th>
                  <th className="text-left p-3 font-medium hidden md:table-cell">Category</th>
                  <th className="text-left p-3 font-medium hidden sm:table-cell">SKU</th>
                  <th className="text-right p-3 font-medium">Price</th>
                  <th className="text-right p-3 font-medium">Stock</th>
                  <th className="text-right p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p: any) => (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        {p.image_url && <img src={p.image_url} alt="" className="h-10 w-10 rounded object-cover" />}
                        <div>
                          <p className="font-medium">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{p.generic_name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 hidden md:table-cell">{p.categories?.name || "—"}</td>
                    <td className="p-3 hidden sm:table-cell font-mono text-xs">{p.sku || "—"}</td>
                    <td className="p-3 text-right">৳{p.selling_price}</td>
                    <td className="p-3 text-right">
                      {p.stock_quantity <= p.min_stock_level ? (
                        <Badge variant="destructive">{p.stock_quantity}</Badge>
                      ) : (
                        <span>{p.stock_quantity}</span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteMutation.mutate(p.id)}><Trash2 className="h-4 w-4" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState icon={Package} title="No products yet" description="Add your first medicine to start managing inventory." actionLabel="Add Product" onAction={() => { resetForm(); setOpen(true); }} />
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Product" : "Add Product"}</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Generic Name</Label><Input value={form.generic_name} onChange={(e) => setForm({ ...form, generic_name: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category</Label>
                <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{categories?.map((c: any) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div><Label>Unit</Label><Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>SKU</Label><Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} /></div>
              <div><Label>Barcode</Label><Input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Purchase Price</Label><Input type="number" value={form.purchase_price} onChange={(e) => setForm({ ...form, purchase_price: Number(e.target.value) })} /></div>
              <div><Label>Selling Price</Label><Input type="number" value={form.selling_price} onChange={(e) => setForm({ ...form, selling_price: Number(e.target.value) })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Stock Quantity</Label><Input type="number" value={form.stock_quantity} onChange={(e) => setForm({ ...form, stock_quantity: Number(e.target.value) })} /></div>
              <div><Label>Min Stock Level</Label><Input type="number" value={form.min_stock_level} onChange={(e) => setForm({ ...form, min_stock_level: Number(e.target.value) })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Expiry Date</Label><Input type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} /></div>
              <div><Label>Manufacturer</Label><Input value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} /></div>
            </div>
            <div>
              <Label>Product Image</Label>
              <div className="flex items-center gap-3 mt-1">
                {form.image_url && <img src={form.image_url} alt="" className="h-16 w-16 rounded object-cover" />}
                <label className="cursor-pointer">
                  <div className="flex items-center gap-2 px-3 py-2 border rounded-md text-sm hover:bg-muted">
                    <Upload className="h-4 w-4" /> Upload Image
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                </label>
              </div>
            </div>
            <Button onClick={() => saveMutation.mutate()} disabled={!form.name || saveMutation.isPending}>
              {saveMutation.isPending ? "Saving..." : editing ? "Update Product" : "Add Product"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
