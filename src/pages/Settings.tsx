import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Settings as SettingsIcon, Upload, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    store_name: "",
    store_tagline: "",
    store_phone: "",
    store_email: "",
    store_address: "",
    store_logo: "",
    currency_symbol: "৳",
    receipt_footer: "",
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
          .update({ value })
          .eq("key", key);
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

      <div className="bg-card rounded-xl border p-6 max-w-2xl space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <Store className="h-5 w-5 text-muted-foreground" />
          <h2 className="font-semibold">Store Branding</h2>
        </div>

        {!isSuperAdmin && (
          <p className="text-sm text-muted-foreground">Only super admins can modify store settings.</p>
        )}

        <div className="grid gap-4">
          <div>
            <Label>Store Logo</Label>
            <div className="flex items-center gap-4 mt-1">
              {form.store_logo && <img src={form.store_logo} alt="Logo" className="h-16 w-16 rounded object-contain border" />}
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

          <div className="grid grid-cols-2 gap-4">
            <div><Label>Store Name</Label><Input value={form.store_name} onChange={(e) => set("store_name", e.target.value)} disabled={!isSuperAdmin} /></div>
            <div><Label>Tagline</Label><Input value={form.store_tagline} onChange={(e) => set("store_tagline", e.target.value)} disabled={!isSuperAdmin} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Phone</Label><Input value={form.store_phone} onChange={(e) => set("store_phone", e.target.value)} disabled={!isSuperAdmin} /></div>
            <div><Label>Email</Label><Input value={form.store_email} onChange={(e) => set("store_email", e.target.value)} disabled={!isSuperAdmin} /></div>
          </div>
          <div><Label>Address</Label><Input value={form.store_address} onChange={(e) => set("store_address", e.target.value)} disabled={!isSuperAdmin} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Currency Symbol</Label><Input value={form.currency_symbol} onChange={(e) => set("currency_symbol", e.target.value)} disabled={!isSuperAdmin} /></div>
            <div><Label>Receipt Footer</Label><Input value={form.receipt_footer} onChange={(e) => set("receipt_footer", e.target.value)} disabled={!isSuperAdmin} /></div>
          </div>

          {isSuperAdmin && (
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving..." : "Save Settings"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
