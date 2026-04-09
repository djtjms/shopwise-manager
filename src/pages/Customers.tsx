import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Users, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

export default function Customers() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "" });
  const queryClient = useQueryClient();

  const { data: customers } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data } = await supabase.from("customers").select("*").order("name");
      return data || [];
    },
  });

  const resetForm = () => { setForm({ name: "", phone: "", email: "", address: "" }); setEditing(null); };

  const openEdit = (c: any) => {
    setForm({ name: c.name, phone: c.phone || "", email: c.email || "", address: c.address || "" });
    setEditing(c); setOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editing) {
        const { error } = await supabase.from("customers").update(form).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("customers").insert(form);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success(editing ? "Updated" : "Added"); setOpen(false); resetForm(); queryClient.invalidateQueries({ queryKey: ["customers"] }); },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("customers").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Deleted"); queryClient.invalidateQueries({ queryKey: ["customers"] }); },
  });

  return (
    <div>
      <PageHeader title="Customers" description="Manage your customer database" actionLabel="Add Customer" onAction={() => { resetForm(); setOpen(true); }} />
      {customers && customers.length > 0 ? (
        <div className="bg-card rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/50">
                <th className="text-left p-3 font-medium">Name</th>
                <th className="text-left p-3 font-medium hidden sm:table-cell">Phone</th>
                <th className="text-left p-3 font-medium hidden md:table-cell">Email</th>
                <th className="text-right p-3 font-medium">Actions</th>
              </tr></thead>
              <tbody>
                {customers.map((c: any) => (
                  <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="p-3 font-medium">{c.name}</td>
                    <td className="p-3 hidden sm:table-cell">{c.phone || "—"}</td>
                    <td className="p-3 hidden md:table-cell">{c.email || "—"}</td>
                    <td className="p-3 text-right">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteMutation.mutate(c.id)}><Trash2 className="h-4 w-4" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState icon={Users} title="No customers" description="Add customers to track purchases." actionLabel="Add Customer" onAction={() => { resetForm(); setOpen(true); }} />
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Customer" : "Add Customer"}</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <Button onClick={() => saveMutation.mutate()} disabled={!form.name || saveMutation.isPending}>
              {saveMutation.isPending ? "Saving..." : editing ? "Update" : "Add Customer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
