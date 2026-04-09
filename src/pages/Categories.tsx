import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Tags, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

export default function Categories() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: "", description: "" });
  const queryClient = useQueryClient();

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("*").order("name");
      return data || [];
    },
  });

  const resetForm = () => { setForm({ name: "", description: "" }); setEditing(null); };

  const openEdit = (c: any) => { setForm({ name: c.name, description: c.description || "" }); setEditing(c); setOpen(true); };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editing) {
        const { error } = await supabase.from("categories").update(form).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("categories").insert(form);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success(editing ? "Updated" : "Added"); setOpen(false); resetForm(); queryClient.invalidateQueries({ queryKey: ["categories"] }); },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("categories").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Deleted"); queryClient.invalidateQueries({ queryKey: ["categories"] }); },
  });

  return (
    <div>
      <PageHeader title="Categories" description="Organize medicines by category" actionLabel="Add Category" onAction={() => { resetForm(); setOpen(true); }} />
      {categories && categories.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((c: any) => (
            <div key={c.id} className="bg-card rounded-xl border p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">{c.name}</h3>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteMutation.mutate(c.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{c.description || "No description"}</p>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon={Tags} title="No categories" description="Create categories to organize your medicines." actionLabel="Add Category" onAction={() => { resetForm(); setOpen(true); }} />
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Category" : "Add Category"}</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <Button onClick={() => saveMutation.mutate()} disabled={!form.name || saveMutation.isPending}>
              {saveMutation.isPending ? "Saving..." : editing ? "Update" : "Add Category"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
