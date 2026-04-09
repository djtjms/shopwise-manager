import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Truck, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

export default function Suppliers() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: "", contact_person: "", phone: "", email: "", address: "" });
  const queryClient = useQueryClient();

  const { data: suppliers } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const { data } = await supabase.from("suppliers").select("*").order("name");
      return data || [];
    },
  });

  const resetForm = () => { setForm({ name: "", contact_person: "", phone: "", email: "", address: "" }); setEditing(null); };

  const openEdit = (s: any) => {
    setForm({ name: s.name, contact_person: s.contact_person || "", phone: s.phone || "", email: s.email || "", address: s.address || "" });
    setEditing(s); setOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editing) {
        const { error } = await supabase.from("suppliers").update(form).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("suppliers").insert(form);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success(editing ? "Updated" : "Added"); setOpen(false); resetForm(); queryClient.invalidateQueries({ queryKey: ["suppliers"] }); },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("suppliers").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Deleted"); queryClient.invalidateQueries({ queryKey: ["suppliers"] }); },
  });

  return (
    <div>
      <PageHeader title="Suppliers" description="Manage medicine suppliers" actionLabel="Add Supplier" onAction={() => { resetForm(); setOpen(true); }} />
      {suppliers && suppliers.length > 0 ? (
        <div className="bg-card rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/50">
                <th className="text-left p-3 font-medium">Name</th>
                <th className="text-left p-3 font-medium hidden sm:table-cell">Contact</th>
                <th className="text-left p-3 font-medium hidden md:table-cell">Phone</th>
                <th className="text-left p-3 font-medium hidden lg:table-cell">Email</th>
                <th className="text-right p-3 font-medium">Actions</th>
              </tr></thead>
              <tbody>
                {suppliers.map((s: any) => (
                  <tr key={s.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="p-3 font-medium">{s.name}</td>
                    <td className="p-3 hidden sm:table-cell">{s.contact_person || "—"}</td>
                    <td className="p-3 hidden md:table-cell">{s.phone || "—"}</td>
                    <td className="p-3 hidden lg:table-cell">{s.email || "—"}</td>
                    <td className="p-3 text-right">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(s)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteMutation.mutate(s.id)}><Trash2 className="h-4 w-4" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState icon={Truck} title="No suppliers" description="Add your medicine suppliers." actionLabel="Add Supplier" onAction={() => { resetForm(); setOpen(true); }} />
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Supplier" : "Add Supplier"}</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Contact Person</Label><Input value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <Button onClick={() => saveMutation.mutate()} disabled={!form.name || saveMutation.isPending}>
              {saveMutation.isPending ? "Saving..." : editing ? "Update" : "Add Supplier"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
