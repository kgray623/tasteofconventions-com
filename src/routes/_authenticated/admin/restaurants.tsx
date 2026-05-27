import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, X, Pencil, Check, ChevronDown, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/restaurants")({
  head: () => ({ meta: [{ title: "Restaurants — Admin" }] }),
  component: RestaurantsPage,
});

type Restaurant = {
  id: string;
  name: string;
  cuisine: string | null;
  description: string | null;
  image_url: string | null;
  active: boolean;
};

type MenuItem = {
  id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  price: number;
  category: string | null;
  available: boolean;
};

function RestaurantsPage() {
  const [rows, setRows] = useState<Restaurant[]>([]);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState({ name: "", cuisine: "", description: "", image_url: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [edit, setEdit] = useState<Partial<Restaurant>>({});
  const [openMenu, setOpenMenu] = useState<Record<string, boolean>>({});
  const [itemDraft, setItemDraft] = useState<Record<string, { name: string; price: string; category: string; description: string }>>({});

  const load = async () => {
    setLoading(true);
    const [r, m] = await Promise.all([
      supabase.from("restaurants").select("*").order("created_at", { ascending: false }),
      supabase.from("menu_items").select("*").order("category", { ascending: true }).order("name"),
    ]);
    if (r.error) toast.error(r.error.message);
    if (m.error) toast.error(m.error.message);
    setRows((r.data as Restaurant[]) ?? []);
    setMenu((m.data as MenuItem[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!draft.name.trim()) return toast.error("Name is required.");
    const { error } = await supabase.from("restaurants").insert({
      name: draft.name.trim(),
      cuisine: draft.cuisine.trim() || null,
      description: draft.description.trim() || null,
      image_url: draft.image_url.trim() || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Restaurant added.");
    setDraft({ name: "", cuisine: "", description: "", image_url: "" });
    load();
  };

  const toggleActive = async (r: Restaurant) => {
    const { error } = await supabase.from("restaurants").update({ active: !r.active }).eq("id", r.id);
    if (error) return toast.error(error.message);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this restaurant? Its menu items will also be removed.")) return;
    await supabase.from("menu_items").delete().eq("restaurant_id", id);
    const { error } = await supabase.from("restaurants").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted.");
    load();
  };

  const startEdit = (r: Restaurant) => {
    setEditingId(r.id);
    setEdit({ name: r.name, cuisine: r.cuisine, description: r.description, image_url: r.image_url });
  };

  const saveEdit = async (id: string) => {
    const { error } = await supabase
      .from("restaurants")
      .update({
        name: (edit.name ?? "").toString().trim(),
        cuisine: (edit.cuisine ?? "")?.toString().trim() || null,
        description: (edit.description ?? "")?.toString().trim() || null,
        image_url: (edit.image_url ?? "")?.toString().trim() || null,
      })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Saved.");
    setEditingId(null);
    setEdit({});
    load();
  };

  const addItem = async (restaurantId: string) => {
    const d = itemDraft[restaurantId] || { name: "", price: "", category: "", description: "" };
    if (!d.name.trim()) return toast.error("Item name required.");
    const price = parseFloat(d.price || "0");
    if (Number.isNaN(price) || price < 0) return toast.error("Price must be a non-negative number.");
    const { error } = await supabase.from("menu_items").insert({
      restaurant_id: restaurantId,
      name: d.name.trim(),
      price,
      category: d.category.trim() || null,
      description: d.description.trim() || null,
    });
    if (error) return toast.error(error.message);
    setItemDraft({ ...itemDraft, [restaurantId]: { name: "", price: "", category: "", description: "" } });
    load();
  };

  const removeItem = async (id: string) => {
    if (!confirm("Delete this menu item?")) return;
    const { error } = await supabase.from("menu_items").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const toggleItemAvailable = async (item: MenuItem) => {
    const { error } = await supabase.from("menu_items").update({ available: !item.available }).eq("id", item.id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <div className="space-y-6">
      <Card className="p-5 space-y-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-terracotta">Add restaurant</p>
          <h2 className="font-display text-xl mt-1">New restaurant</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <Input placeholder="Name *" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          <Input placeholder="Cuisine (e.g., Italian)" value={draft.cuisine} onChange={(e) => setDraft({ ...draft, cuisine: e.target.value })} />
        </div>
        <Input placeholder="Image URL (optional)" value={draft.image_url} onChange={(e) => setDraft({ ...draft, image_url: e.target.value })} />
        <Textarea placeholder="Description (optional)" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} rows={3} />
        <div>
          <Button onClick={add} className="bg-ink text-cream hover:bg-ink/90">
            <Plus className="w-4 h-4 mr-2" /> Add restaurant
          </Button>
        </div>
      </Card>

      <div className="space-y-3">
        {loading && <p className="text-muted-foreground text-sm">Loading…</p>}
        {!loading && rows.length === 0 && (
          <Card className="p-6 text-center text-muted-foreground text-sm">No restaurants yet.</Card>
        )}
        {rows.map((r) => {
          const items = menu.filter((m) => m.restaurant_id === r.id);
          const isOpen = !!openMenu[r.id];
          const d = itemDraft[r.id] || { name: "", price: "", category: "", description: "" };
          return (
            <Card key={r.id} className="p-4 space-y-3">
              {editingId === r.id ? (
                <div className="space-y-3">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <Input value={(edit.name as string) ?? ""} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder="Name" />
                    <Input value={(edit.cuisine as string) ?? ""} onChange={(e) => setEdit({ ...edit, cuisine: e.target.value })} placeholder="Cuisine" />
                  </div>
                  <Input value={(edit.image_url as string) ?? ""} onChange={(e) => setEdit({ ...edit, image_url: e.target.value })} placeholder="Image URL" />
                  <Textarea value={(edit.description as string) ?? ""} onChange={(e) => setEdit({ ...edit, description: e.target.value })} placeholder="Description" rows={3} />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => saveEdit(r.id)} className="bg-ink text-cream hover:bg-ink/90">
                      <Check className="w-4 h-4 mr-1" /> Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setEditingId(null); setEdit({}); }}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-display text-lg">{r.name}</h3>
                      {r.cuisine && <Badge variant="secondary" className="text-[10px]">{r.cuisine}</Badge>}
                      <Badge variant={r.active ? "default" : "secondary"} className="text-[10px]">
                        {r.active ? "active" : "hidden"}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">{items.length} items</Badge>
                    </div>
                    {r.description && <p className="text-sm text-muted-foreground mt-1">{r.description}</p>}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" variant="outline" onClick={() => setOpenMenu({ ...openMenu, [r.id]: !isOpen })}>
                      {isOpen ? <ChevronDown className="w-4 h-4 mr-1" /> : <ChevronRight className="w-4 h-4 mr-1" />}
                      Menu
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => toggleActive(r)}>
                      {r.active ? "Hide" : "Show"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => startEdit(r)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => remove(r.id)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              {isOpen && editingId !== r.id && (
                <div className="border-t border-border pt-3 space-y-3">
                  <div className="space-y-1.5">
                    {items.length === 0 && (
                      <p className="text-xs text-muted-foreground italic">No menu items yet.</p>
                    )}
                    {items.map((it) => (
                      <div key={it.id} className="flex items-center justify-between gap-2 bg-secondary/50 rounded-md px-3 py-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium truncate">{it.name}</span>
                            {it.category && <Badge variant="secondary" className="text-[10px]">{it.category}</Badge>}
                            <span className="text-xs text-muted-foreground">${Number(it.price).toFixed(2)}</span>
                            {!it.available && <Badge variant="outline" className="text-[10px]">hidden</Badge>}
                          </div>
                          {it.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{it.description}</p>}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button size="sm" variant="ghost" onClick={() => toggleItemAvailable(it)} className="h-7 text-xs">
                            {it.available ? "Hide" : "Show"}
                          </Button>
                          <button onClick={() => removeItem(it.id)} className="text-muted-foreground hover:text-terracotta p-1">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="grid sm:grid-cols-4 gap-2">
                    <Input
                      placeholder="Item name *"
                      value={d.name}
                      onChange={(e) => setItemDraft({ ...itemDraft, [r.id]: { ...d, name: e.target.value } })}
                      className="sm:col-span-2"
                    />
                    <Input
                      placeholder="Price"
                      type="number"
                      step="0.01"
                      value={d.price}
                      onChange={(e) => setItemDraft({ ...itemDraft, [r.id]: { ...d, price: e.target.value } })}
                    />
                    <Input
                      placeholder="Category"
                      value={d.category}
                      onChange={(e) => setItemDraft({ ...itemDraft, [r.id]: { ...d, category: e.target.value } })}
                    />
                    <Textarea
                      placeholder="Description (optional)"
                      value={d.description}
                      onChange={(e) => setItemDraft({ ...itemDraft, [r.id]: { ...d, description: e.target.value } })}
                      rows={2}
                      className="sm:col-span-4"
                    />
                  </div>
                  <Button size="sm" onClick={() => addItem(r.id)} className="bg-ink text-cream hover:bg-ink/90">
                    <Plus className="w-4 h-4 mr-1" /> Add menu item
                  </Button>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
