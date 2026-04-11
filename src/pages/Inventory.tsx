import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Package, Pencil, Trash2, Upload, QrCode, ScanLine, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { QRCodeView } from "@/components/QRCodeView";
import { QRScanner } from "@/components/QRScanner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Inventory() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [qrProduct, setQrProduct] = useState<any>(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [filter, setFilter] = useState("all");
  const queryClient = useQueryClient();

  const { data: products, isLoading } = useQuery({
    queryKey: ["products", search, filter],
    queryFn: async () => {
      let q = supabase.from("products").select("*, categories(name)").order("name");
      if (search) q = q.or(`name.ilike.%${search}%,generic_name.ilike.%${search}%,sku.ilike.%${search}%,batch_number.ilike.%${search}%`);
      if (filter === "low-stock") q = q.lte("stock_quantity", 10).eq("is_active", true);
      if (filter === "expired") q = q.lte("expiry_date", new Date().toISOString().split("T")[0]).eq("is_active", true);
      if (filter === "inactive") q = q.eq("is_active", false);
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
    batch_number: "", drug_license_no: "",
  });

  const resetForm = () => {
    setForm({ name: "", generic_name: "", category_id: "", sku: "", barcode: "", description: "", unit: "piece", purchase_price: 0, selling_price: 0, stock_quantity: 0, min_stock_level: 10, expiry_date: "", manufacturer: "", image_url: "", batch_number: "", drug_license_no: "" });
    setEditing(null);
  };

  const openEdit = (p: any) => {
    setForm({
      name: p.name, generic_name: p.generic_name || "", category_id: p.category_id || "",
      sku: p.sku || "", barcode: p.barcode || "", description: p.description || "",
      unit: p.unit, purchase_price: p.purchase_price, selling_price: p.selling_price,
      stock_quantity: p.stock_quantity, min_stock_level: p.min_stock_level,
      expiry_date: p.expiry_date || "", manufacturer: p.manufacturer || "",
      image_url: p.image_url || "", batch_number: p.batch_number || "",
      drug_license_no: p.drug_license_no || "",
    });
    setEditing(p);
    setOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop();
    const path = `${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file);
    if (error) { toast.error("আপলোড ব্যর্থ"); return; }
    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    setForm((f) => ({ ...f, image_url: data.publicUrl }));
    toast.success("ছবি আপলোড হয়েছে");
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        category_id: form.category_id || null,
        expiry_date: form.expiry_date || null,
        batch_number: form.batch_number || null,
        drug_license_no: form.drug_license_no || null,
      };
      if (editing) {
        const { error } = await supabase.from("products").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("products").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "পণ্য আপডেট হয়েছে" : "পণ্য যোগ হয়েছে");
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
    onSuccess: () => { toast.success("পণ্য মুছে ফেলা হয়েছে"); queryClient.invalidateQueries({ queryKey: ["products"] }); },
    onError: (e) => toast.error(e.message),
  });

  const handleScan = (data: string) => {
    try {
      const parsed = JSON.parse(data);
      if (parsed.id) {
        const found = products?.find((p: any) => p.id === parsed.id);
        if (found) {
          openEdit(found);
          toast.success(`পাওয়া গেছে: ${found.name}`);
        } else {
          setSearch(parsed.name || parsed.sku || "");
          toast.info("পণ্য খুঁজছে...");
        }
      }
    } catch {
      setSearch(data);
      toast.info(`খুঁজছে: ${data}`);
    }
  };

  const isExpired = (date: string) => date && new Date(date) < new Date();

  return (
    <div>
      <PageHeader title="ইনভেন্টরি (Inventory)" description="ঔষধের স্টক ব্যবস্থাপনা" actionLabel="পণ্য যোগ করুন" onAction={() => { resetForm(); setOpen(true); }} />

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <Input placeholder="নাম, জেনেরিক নাম, SKU, ব্যাচ দিয়ে খুঁজুন..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
        <div className="flex gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">সব পণ্য</SelectItem>
              <SelectItem value="low-stock">কম স্টক</SelectItem>
              <SelectItem value="expired">মেয়াদ উত্তীর্ণ</SelectItem>
              <SelectItem value="inactive">নিষ্ক্রিয়</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => setScanOpen(true)} title="Scan QR">
            <ScanLine className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">লোড হচ্ছে...</p>
      ) : products && products.length > 0 ? (
        <div className="bg-card rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">পণ্য</th>
                  <th className="text-left p-3 font-medium hidden md:table-cell">ক্যাটাগরি</th>
                  <th className="text-left p-3 font-medium hidden sm:table-cell">ব্যাচ</th>
                  <th className="text-right p-3 font-medium">মূল্য</th>
                  <th className="text-right p-3 font-medium">স্টক</th>
                  <th className="text-left p-3 font-medium hidden lg:table-cell">মেয়াদ</th>
                  <th className="text-right p-3 font-medium">কার্যকলাপ</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p: any) => (
                  <tr key={p.id} className={`border-b last:border-0 hover:bg-muted/30 ${isExpired(p.expiry_date) ? "bg-destructive/5" : ""}`}>
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
                    <td className="p-3 hidden sm:table-cell font-mono text-xs">{p.batch_number || "—"}</td>
                    <td className="p-3 text-right">৳{p.selling_price}</td>
                    <td className="p-3 text-right">
                      {p.stock_quantity <= p.min_stock_level ? (
                        <Badge variant="destructive">{p.stock_quantity}</Badge>
                      ) : (
                        <span>{p.stock_quantity}</span>
                      )}
                    </td>
                    <td className="p-3 hidden lg:table-cell">
                      {p.expiry_date ? (
                        <Badge variant={isExpired(p.expiry_date) ? "destructive" : "secondary"}>
                          {isExpired(p.expiry_date) ? "মেয়াদ শেষ" : p.expiry_date}
                        </Badge>
                      ) : "—"}
                    </td>
                    <td className="p-3 text-right">
                      <Button size="icon" variant="ghost" onClick={() => { setQrProduct(p); setQrOpen(true); }} title="QR Code">
                        <QrCode className="h-4 w-4" />
                      </Button>
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
        <EmptyState icon={Package} title="কোন পণ্য নেই" description="ইনভেন্টরি ব্যবস্থাপনা শুরু করতে আপনার প্রথম ঔষধ যোগ করুন।" actionLabel="পণ্য যোগ করুন" onAction={() => { resetForm(); setOpen(true); }} />
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "পণ্য সম্পাদনা" : "পণ্য যোগ করুন"}</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <Tabs defaultValue="basic">
              <TabsList className="w-full">
                <TabsTrigger value="basic" className="flex-1">মৌলিক তথ্য</TabsTrigger>
                <TabsTrigger value="pricing" className="flex-1">মূল্য ও স্টক</TabsTrigger>
                <TabsTrigger value="details" className="flex-1">বিস্তারিত</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>নাম (Name) *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                  <div><Label>জেনেরিক নাম</Label><Input value={form.generic_name} onChange={(e) => setForm({ ...form, generic_name: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>ক্যাটাগরি</Label>
                    <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                      <SelectTrigger><SelectValue placeholder="নির্বাচন করুন" /></SelectTrigger>
                      <SelectContent>{categories?.map((c: any) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>একক (Unit)</Label><Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></div>
                </div>
                <div><Label>প্রস্তুতকারক (Manufacturer)</Label><Input value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} /></div>
              </TabsContent>

              <TabsContent value="pricing" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>ক্রয় মূল্য (৳)</Label><Input type="number" value={form.purchase_price} onChange={(e) => setForm({ ...form, purchase_price: Number(e.target.value) })} /></div>
                  <div><Label>বিক্রয় মূল্য (৳)</Label><Input type="number" value={form.selling_price} onChange={(e) => setForm({ ...form, selling_price: Number(e.target.value) })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>স্টক পরিমাণ</Label><Input type="number" value={form.stock_quantity} onChange={(e) => setForm({ ...form, stock_quantity: Number(e.target.value) })} /></div>
                  <div><Label>ন্যূনতম স্টক</Label><Input type="number" value={form.min_stock_level} onChange={(e) => setForm({ ...form, min_stock_level: Number(e.target.value) })} /></div>
                </div>
              </TabsContent>

              <TabsContent value="details" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>SKU</Label><Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} /></div>
                  <div><Label>বারকোড</Label><Input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>ব্যাচ নম্বর</Label><Input value={form.batch_number} onChange={(e) => setForm({ ...form, batch_number: e.target.value })} /></div>
                  <div><Label>মেয়াদ উত্তীর্ণের তারিখ</Label><Input type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} /></div>
                </div>
                <div><Label>ড্রাগ লাইসেন্স নং</Label><Input value={form.drug_license_no} onChange={(e) => setForm({ ...form, drug_license_no: e.target.value })} /></div>
                <div>
                  <Label>পণ্যের ছবি</Label>
                  <div className="flex items-center gap-3 mt-1">
                    {form.image_url && <img src={form.image_url} alt="" className="h-16 w-16 rounded object-cover" />}
                    <label className="cursor-pointer">
                      <div className="flex items-center gap-2 px-3 py-2 border rounded-md text-sm hover:bg-muted">
                        <Upload className="h-4 w-4" /> ছবি আপলোড করুন
                      </div>
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    </label>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <Button onClick={() => saveMutation.mutate()} disabled={!form.name || saveMutation.isPending}>
              {saveMutation.isPending ? "সংরক্ষণ হচ্ছে..." : editing ? "আপডেট করুন" : "পণ্য যোগ করুন"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <QRCodeView open={qrOpen} onOpenChange={setQrOpen} product={qrProduct} />
      <QRScanner open={scanOpen} onOpenChange={setScanOpen} onScan={handleScan} />
    </div>
  );
}
