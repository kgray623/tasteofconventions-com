import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, X, Hand } from "lucide-react";
import { useRoles } from "@/hooks/use-roles";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/admin/categories")({
  component: CategoriesPage,
});

type Cat = { id: string; name: string; sort_order: number };
type Assign = { id: string; category_id: string; user_id: string | null; volunteer_name: string | null; notes: string | null };
type Profile = { id: string; display_name: string | null; email: string | null };

function CategoriesPage() {
  const { isAdmin: isActualAdmin, loading: rolesLoading } = useRoles();
  const search = useSearch({ from: "/_authenticated/admin" });
  const previewCommittee = isActualAdmin && search.view === "committee";
  const isAdmin = isActualAdmin && !previewCommittee;
  const { user } = useAuth();
  const [cats, setCats] = useState<Cat[]>([]);
  const [assigns, setAssigns] = useState<Assign[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [newCat, setNewCat] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const load = async () => {
    const [c, a, p] = await Promise.all([
      supabase.from("categories").select("*").order("sort_order"),
      supabase.from("category_assignments").select("*"),
      supabase.from("profiles").select("id,display_name,email"),
    ]);
    setCats(c.data ?? []);
    setAssigns(a.data ?? []);
    setProfiles(p.data ?? []);
  };
  useEffect(() => { load(); }, []);

  const addCategory = async () => {
    if (!newCat.trim()) return;
    const max = Math.max(0, ...cats.map((c) => c.sort_order));
    const { error } = await supabase.from("categories").insert({ name: newCat.trim(), sort_order: max + 10 });
    if (error) return toast.error(error.message);
    setNewCat(""); load();
  };

  const deleteCategory = async (id: string) => {
    if (!confirm("Delete this category and its assignments?")) return;
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const addAssign = async (catId: string, selfVolunteer = false) => {
    if (selfVolunteer) {
      if (!user) return toast.error("Please sign in to volunteer.");
      const exists = assigns.some((a) => a.category_id === catId && a.user_id === user.id);
      if (exists) return;
      const { error } = await supabase.from("category_assignments").insert({
        category_id: catId,
        user_id: user.id,
        volunteer_name: null,
      });
      if (error) return toast.error(error.message);
      toast.success("Thanks for volunteering!");
      load();
      return;
    }
    const value = (drafts[catId] || "").trim();
    if (!value) return;
    const profile = profiles.find((p) => p.email === value || p.display_name === value);
    const { error } = await supabase.from("category_assignments").insert({
      category_id: catId,
      user_id: profile?.id ?? null,
      volunteer_name: profile ? null : value,
    });
    if (error) return toast.error(error.message);
    setDrafts({ ...drafts, [catId]: "" });
    load();
  };

  const removeAssign = async (id: string) => {
    const { error } = await supabase.from("category_assignments").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const labelFor = (a: Assign) => {
    if (a.volunteer_name) return a.volunteer_name;
    const p = profiles.find((x) => x.id === a.user_id);
    return p?.display_name || p?.email || "Unknown";
  };

  if (rolesLoading) return <p className="text-muted-foreground">Loading assignments…</p>;

  return (
    <div className="space-y-6">
      {isAdmin && (
        <Card className="p-4 flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[240px]">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">New category</p>
            <Input value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="e.g., Valet" />
          </div>
          <Button onClick={addCategory} className="bg-ink text-cream hover:bg-ink/90">
            <Plus className="w-4 h-4 mr-2" /> Add category
          </Button>
        </Card>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cats.map((c) => {
          const items = assigns.filter((a) => a.category_id === c.id);
          return (
            <Card key={c.id} className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg">{c.name}</h3>
                {isAdmin && (
                  <button onClick={() => deleteCategory(c.id)} className="text-muted-foreground hover:text-terracotta">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="space-y-1.5">
                {c.name.toLowerCase().includes("alcohol") && (
                  <p className="text-xs text-muted-foreground italic mb-2">
                    This includes ensuring the event is dignified and alcohol is limited to those of legal age and limit intake to 2 drinks.
                  </p>
                )}
                {items.length === 0 && !c.name.toLowerCase().includes("alcohol") && (
                  <p className="text-xs text-muted-foreground italic">No one assigned yet.</p>
                )}
                {items.map((a) => (
                  <div key={a.id} className="flex items-center justify-between gap-2 bg-secondary/50 rounded-md px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge variant={a.user_id ? "default" : "secondary"} className="text-[10px] shrink-0">
                        {a.user_id ? "team" : "volunteer"}
                      </Badge>
                      <span className="text-sm truncate">{labelFor(a)}</span>
                    </div>
                    {isAdmin && (
                      <button onClick={() => removeAssign(a.id)} className="text-muted-foreground hover:text-terracotta">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {(() => {
                const alreadyVolunteered = !!user && items.some((a) => a.user_id === user.id);
                return (
                  <div className="space-y-2 pt-1">
                    <Button
                      size="sm"
                      onClick={() => addAssign(c.id, true)}
                      disabled={!user || alreadyVolunteered}
                      className="w-full bg-terracotta text-cream hover:bg-terracotta/90"
                    >
                      <Hand className="w-4 h-4 mr-2" />
                      {alreadyVolunteered ? "You're volunteering" : "I want to volunteer"}
                    </Button>
                    {isAdmin && (
                      <div className="flex gap-2">
                        <Input
                          list={`profiles-${c.id}`}
                          value={drafts[c.id] || ""}
                          onChange={(e) => setDrafts({ ...drafts, [c.id]: e.target.value })}
                          onKeyDown={(e) => e.key === "Enter" && addAssign(c.id)}
                          placeholder="Admin: add someone else…"
                          className="text-sm"
                        />
                        <datalist id={`profiles-${c.id}`}>
                          {profiles.map((p) => (
                            <option key={p.id} value={p.email ?? p.display_name ?? ""}>{p.display_name}</option>
                          ))}
                        </datalist>
                        <Button size="sm" variant="outline" onClick={() => addAssign(c.id)}>
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })()}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
