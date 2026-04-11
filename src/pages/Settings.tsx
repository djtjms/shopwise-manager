import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Upload, Store, FileText, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export default function SettingsPage() {
  const { isSuperAdmin } = useAuth();
  const queryClient = useQueryClient();

  const { data: settings } = useQuery({
    queryKey: ["store-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("store_settings").select("*");
      const map: Record<string, string> = {};
      data?.forEach((s: any) => { map[s.key] = s.value || ""; });
      return map;
    },
  });

  const [form, setForm] = useState({
    store_name: "", store_tagline: "", store_phone: "", store_email: "",
    store_address: "", store_logo: "", currency_symbol: "৳",
    receipt_footer: "", drug_license_no: "",
  });

  useEffect(() => {
    if (settings) {
      setForm({
        store_name: settings.store_name || "",
        store_tagline: settings.store_tagline || "",
        store_phone: settings.store_phone || "",
        store_email: settings.store_email || "",
        store_address: settings.store_address || "",
        store_logo: settings.store_logo || "",
        currency_symbol: settings.currency_symbol || "৳",
        receipt_footer: settings.receipt_footer || "",
        drug_license_no: settings.drug_license_no || "",
      });
    }
  }, [settings]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop();
    const path = `logo-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file);
    if (error) { toast.error("Upload failed"); return; }
    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    setForm((f) => ({ ...f, store_logo: data.publicUrl }));
    toast.success("Logo uploaded");
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      for (const [key, value] of Object.entries(form)) {
        const { error } = await supabase
          .from("store_settings")
          .upsert({ key, value }, { onConflict: "key" });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Settings saved!");
      queryClient.invalidateQueries({ queryKey: ["store-settings"] });
    },
    onError: (e) => toast.error(e.message),
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <div className="max-w-3xl">
        <Tabs defaultValue="branding">
          <TabsList className="mb-4">
            <TabsTrigger value="branding"><Store className="h-4 w-4 mr-1" />Store Branding</TabsTrigger>
            <TabsTrigger value="receipt"><FileText className="h-4 w-4 mr-1" />Receipt</TabsTrigger>
            <TabsTrigger value="license"><Globe className="h-4 w-4 mr-1" />License & Legal</TabsTrigger>
          </TabsList>

          {!isSuperAdmin && (
            <p className="text-sm text-muted-foreground mb-4">Only super admins can modify store settings.</p>
          )}

          <TabsContent value="branding">
            <div className="bg-card rounded-xl border p-6 space-y-4">
              <div>
                <Label>Store Logo</Label>
                <div className="flex items-center gap-4 mt-1">
                  {form.store_logo && <img src={form.store_logo} alt="Logo" className="h-20 w-20 rounded-lg object-contain border p-1" />}
                  {isSuperAdmin && (
                    <label className="cursor-pointer">
                      <div className="flex items-center gap-2 px-3 py-2 border rounded-md text-sm hover:bg-muted">
                        <Upload className="h-4 w-4" /> Upload Logo
                      </div>
                      <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                    </label>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><Label>Store Name (দোকানের নাম)</Label><Input value={form.store_name} onChange={(e) => set("store_name", e.target.value)} disabled={!isSuperAdmin} /></div>
                <div><Label>Tagline (ট্যাগলাইন)</Label><Input value={form.store_tagline} onChange={(e) => set("store_tagline", e.target.value)} disabled={!isSuperAdmin} /></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><Label>Phone (ফোন)</Label><Input value={form.store_phone} onChange={(e) => set("store_phone", e.target.value)} disabled={!isSuperAdmin} placeholder="+880-XXXX-XXXXXX" /></div>
                <div><Label>Email (ইমেইল)</Label><Input value={form.store_email} onChange={(e) => set("store_email", e.target.value)} disabled={!isSuperAdmin} /></div>
              </div>
              <div><Label>Address (ঠিকানা)</Label><Textarea value={form.store_address} onChange={(e) => set("store_address", e.target.value)} disabled={!isSuperAdmin} rows={2} /></div>
              <div><Label>Currency Symbol (মুদ্রা চিহ্ন)</Label><Input value={form.currency_symbol} onChange={(e) => set("currency_symbol", e.target.value)} disabled={!isSuperAdmin} className="w-24" /></div>
            </div>
          </TabsContent>

          <TabsContent value="receipt">
            <div className="bg-card rounded-xl border p-6 space-y-4">
              <p className="text-sm text-muted-foreground">Customize what appears on printed receipts.</p>
              <div><Label>Receipt Footer Message</Label><Textarea value={form.receipt_footer} onChange={(e) => set("receipt_footer", e.target.value)} disabled={!isSuperAdmin} rows={2} placeholder="ধন্যবাদ! আবার আসবেন।" /></div>
            </div>
          </TabsContent>

          <TabsContent value="license">
            <div className="bg-card rounded-xl border p-6 space-y-4">
              <p className="text-sm text-muted-foreground">Bangladesh DGDA drug license information for compliance.</p>
              <div><Label>Drug License No. (ড্রাগ লাইসেন্স নম্বর)</Label><Input value={form.drug_license_no} onChange={(e) => set("drug_license_no", e.target.value)} disabled={!isSuperAdmin} placeholder="e.g. DL-XXXX-XXXXX" /></div>
            </div>
          </TabsContent>

          {isSuperAdmin && (
            <div className="mt-6">
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} size="lg">
                {saveMutation.isPending ? "Saving..." : "Save All Settings"}
              </Button>
            </div>
          )}
        </Tabs>
      </div>
    </div>
  );
}
