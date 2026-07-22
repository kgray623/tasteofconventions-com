import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, X, Hand, Save, MessageCircle } from "lucide-react";
import { useRoles } from "@/hooks/use-roles";
import { useAuth } from "@/hooks/use-auth";
import { CategoryChat } from "@/components/CategoryChat";

export const Route = createFileRoute("/_authenticated/admin/categories")({
  head: () => ({
    meta: [
      { title: "Volunteer Categories — Taste of Conventions Admin" },
      {
        name: "description",
        content: "Admin volunteer category assignments for A Taste of Special Conventions.",
      },
      { property: "og:title", content: "Volunteer Categories — Taste of Conventions Admin" },
      {
        property: "og:description",
        content: "Admin volunteer category assignments for A Taste of Special Conventions.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CategoriesPage,
});

type Cat = { id: string; name: string; sort_order: number; description: string | null };
type Assign = { id: string; category_id: string; user_id: string | null; volunteer_name: string | null; notes: string | null };
type Profile = { id: string; display_name: string | null };

const normalizeSearchName = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const scoreProfileName = (query: string, name: string) => {
  const q = normalizeSearchName(query);
  const n = normalizeSearchName(name);
  if (!q || !n) return 0;
  if (n === q) return 100;
  if (n.startsWith(q)) return 90;
  if (n.includes(` ${q}`)) return 85;
  if (n.includes(q)) return 75;

  const qTokens = q.split(" ").filter(Boolean);
  const nTokens = n.split(" ").filter(Boolean);
  const matchedTokens = qTokens.filter((qt) =>
    nTokens.some((nt) => nt.startsWith(qt) || nt.includes(qt) || qt.includes(nt)),
  ).length;
  return matchedTokens > 0 ? Math.round((matchedTokens / qTokens.length) * 70) : 0;
};

function VolunteerNameInput({
  value,
  onChange,
  profiles,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  profiles: Profile[];
  placeholder: string;
}) {
  const [focused, setFocused] = useState(false);
  const suggestions = useMemo(() => {
    const query = value.trim();
    if (!query) return [];
    return profiles
      .map((profile) => ({ profile, name: profile.display_name?.trim() ?? "", score: scoreProfileName(query, profile.display_name ?? "") }))
      .filter((item) => item.name && item.score > 0)
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
      .slice(0, 6);
  }, [profiles, value]);

  return (
    <div className="relative">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => window.setTimeout(() => setFocused(false), 120)}
        placeholder={placeholder}
        aria-label="Volunteer name"
        autoComplete="off"
      />
      {focused && value.trim() && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-auto rounded-md border border-border bg-popover shadow-lg">
          {suggestions.map(({ profile, name }) => (
            <button
              key={profile.id}
              type="button"
              className="block w-full px-3 py-2 text-left text-sm hover:bg-secondary focus:bg-secondary focus:outline-none"
              onMouseDown={(event) => {
                event.preventDefault();
                onChange(name);
                setFocused(false);
              }}
            >
              {name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CategoriesPage() {
  const { isAdmin: isActualAdmin, loading: rolesLoading } = useRoles();
  const search = useSearch({ from: "/_authenticated/admin" });
  const previewCommittee = isActualAdmin && search.view === "committee";
  const isAdmin = isActualAdmin;
  const { user } = useAuth();
  const [cats, setCats] = useState<Cat[]>([]);
  const [assigns, setAssigns] = useState<Assign[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [newCat, setNewCat] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [quickCatId, setQuickCatId] = useState("");
  const [quickVolunteerName, setQuickVolunteerName] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [editingDesc, setEditingDesc] = useState<Record<string, string>>({});
  const [chatOpen, setChatOpen] = useState<string | null>(null);

  const load = async () => {
    const [c, a, p] = await Promise.all([
      supabase.from("categories").select("*").order("sort_order"),
      supabase.from("category_assignments").select("*"),
      supabase.from("profiles").select("id,display_name"),
    ]);
    setCats(c.data ?? []);
    setAssigns(a.data ?? []);
    setProfiles(p.data ?? []);
    setQuickCatId((current) => current || c.data?.[0]?.id || "");
  };
  useEffect(() => { load(); }, []);

  const addCategory = async () => {
    if (!newCat.trim()) return;
    const max = Math.max(0, ...cats.map((c) => c.sort_order));
    const { error } = await supabase.from("categories").insert({ 
      name: newCat.trim(), 
      description: newDesc.trim() || null,
      sort_order: max + 10 
    });
    if (error) return toast.error(error.message);
    setNewCat(""); 
    setNewDesc("");
    load();
  };

  const deleteCategory = async (id: string) => {
    if (!confirm("Delete this category and its assignments?")) return;
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const updateDescription = async (id: string) => {
    const desc = editingDesc[id];
    if (desc === undefined) return;
    const { error } = await supabase.from("categories").update({ description: desc.trim() || null }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Description updated");
    setEditingDesc((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    load();
  };

  const addAssign = async (catId: string, selfVolunteer = false, valueOverride?: string) => {
    if (selfVolunteer) {
      if (!user) return toast.error("Please sign in to volunteer.");
      const exists = assigns.some((a) => a.category_id === catId && a.user_id === user.id);
      if (exists) { toast.info("You're already volunteering for this."); return; }
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
    const value = (valueOverride ?? drafts[catId] ?? "").trim();
    if (!value) return;
    const valueLower = value.toLowerCase();
    const profile = profiles.find((p) => p.display_name?.trim().toLowerCase() === valueLower);
    const { error } = await supabase.from("category_assignments").insert({
      category_id: catId,
      user_id: profile?.id ?? null,
      volunteer_name: profile ? null : value,
    });
    if (error) return toast.error(error.message);
    toast.success("Volunteer added.");
    setDrafts({ ...drafts, [catId]: "" });
    if (valueOverride !== undefined) setQuickVolunteerName("");
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
    return p?.display_name || "Unknown";
  };

  const nameForUser = (uid: string) => {
    const p = profiles.find((x) => x.id === uid);
    return p?.display_name || "Member";
  };

  const isCurrentUserAssignment = (a: Assign) => {
    if (!user) return false;
    if (a.user_id === user.id) return true;
    const profile = profiles.find((p) => p.id === user.id);
    const displayName = profile?.display_name?.trim().toLowerCase();
    const volunteerName = a.volunteer_name?.trim().toLowerCase();
    return !!displayName && !!volunteerName && displayName === volunteerName;
  };

  if (rolesLoading) return <p className="text-muted-foreground">Loading assignments…</p>;

  return (
    <div className="space-y-6">
      {isAdmin && (
        <Card className="p-4 space-y-4">
          <div className="space-y-3">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Admin: add a volunteer to a category</p>
              <p className="text-sm text-muted-foreground">Choose the volunteer role, type the person&apos;s name, then tap Add volunteer.</p>
            </div>
            <div className="grid gap-2 md:grid-cols-[minmax(180px,1fr)_minmax(220px,1.2fr)_auto]">
              <select
                value={quickCatId}
                onChange={(e) => setQuickCatId(e.target.value)}
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label="Volunteer category"
              >
                {cats.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              <Input
                list="admin-volunteer-names"
                value={quickVolunteerName}
                onChange={(e) => setQuickVolunteerName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addAssign(quickCatId, false, quickVolunteerName);
                }}
                placeholder="Type volunteer name…"
                aria-label="Volunteer name"
              />
              <datalist id="admin-volunteer-names">
                {profiles.map((p) => (
                  <option key={p.id} value={p.display_name ?? ""}>{p.display_name}</option>
                ))}
              </datalist>
              <Button
                onClick={() => addAssign(quickCatId, false, quickVolunteerName)}
                disabled={!quickCatId || !quickVolunteerName.trim()}
                className="bg-ink text-cream hover:bg-ink/90"
              >
                <Plus className="w-4 h-4 mr-2" /> Add volunteer
              </Button>
            </div>
          </div>

          <div className="border-t border-border pt-4 space-y-3">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">New category</p>
            <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[240px] space-y-2">
              <Input value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="Category Name (e.g., Valet)" />
              <Textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Description (optional)" className="h-20" />
            </div>
            <Button onClick={addCategory} className="bg-ink text-cream hover:bg-ink/90 self-end">
              <Plus className="w-4 h-4 mr-2" /> Add category
            </Button>
            </div>
          </div>
        </Card>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cats.map((c) => {
          const items = assigns.filter((a) => a.category_id === c.id);
          const currentDesc = editingDesc[c.id] ?? c.description ?? "";
          const isDirty = editingDesc[c.id] !== undefined && editingDesc[c.id] !== (c.description ?? "");

          return (
            <Card key={c.id} className="p-5 flex flex-col h-full">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display text-lg">{c.name}</h3>
                {isAdmin && (
                  <button onClick={() => deleteCategory(c.id)} className="text-muted-foreground hover:text-terracotta">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              
              <div className="flex-1 space-y-4">
                <div className="space-y-2">
                  {isAdmin ? (
                    <div className="space-y-1.5">
                      <Textarea 
                        value={currentDesc} 
                        onChange={(e) => setEditingDesc({ ...editingDesc, [c.id]: e.target.value })}
                        onBlur={() => { if (isDirty) updateDescription(c.id); }}
                        placeholder="Add a description for this role..."
                        className="text-xs min-h-[60px] resize-none"
                      />
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-[10px] italic ${isDirty ? "text-terracotta" : "text-muted-foreground"}`}>
                          {isDirty ? "Unsaved changes" : "Saved"}
                        </span>
                        <Button
                          size="sm"
                          variant={isDirty ? "default" : "outline"}
                          disabled={!isDirty}
                          onClick={() => updateDescription(c.id)}
                          className="h-7 text-xs"
                        >
                          <Save className="w-3 h-3 mr-1" /> Save description
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground leading-relaxed min-h-[3rem]">
                      {c.description || "\u00A0"}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  {items.length === 0 && (
                    <p className="text-xs text-muted-foreground">No one has volunteered yet.</p>
                  )}
                  {items.map((a) => {
                    const isMe = isCurrentUserAssignment(a);
                    return (
                      <div key={a.id} className="flex items-center justify-between gap-2 bg-secondary/50 rounded-md px-3 py-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Badge variant="secondary" className="text-[10px] shrink-0">
                            volunteer
                          </Badge>
                          <span className="text-sm truncate">{labelFor(a)}</span>
                        </div>
                        {isAdmin && (
                          <button onClick={() => removeAssign(a.id)} className="text-muted-foreground hover:text-terracotta">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2 pt-4 mt-auto">
                {(() => {
                  const myAssign = items.find(isCurrentUserAssignment);
                  const alreadyVolunteered = !!myAssign;
                  return (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (!user) return toast.error("Please sign in.");
                          if (!alreadyVolunteered && !isAdmin) {
                            return toast.info("Volunteer for this category to join the chat.");
                          }
                          setChatOpen(c.id);
                        }}
                        disabled={!user}
                        className="w-full"
                      >
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Open chat
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => addAssign(c.id, true)}
                        disabled={!user}
                        className="w-full bg-terracotta text-cream hover:bg-terracotta/90"
                      >
                        <Hand className="w-4 h-4 mr-2" />
                        I want to volunteer
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => myAssign ? removeAssign(myAssign.id) : toast.info("You haven't volunteered for this yet.")}
                        disabled={!user}
                        className="w-full"
                      >
                        <X className="w-4 h-4 mr-2" />
                        I want to withdraw my volunteer
                      </Button>
                      {isAdmin && (
                        <div className="pt-2 border-t border-border space-y-1.5">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                            Admin: add a volunteer
                          </p>
                          <div className="flex gap-2">
                            <Input
                              list={`profiles-${c.id}`}
                              value={drafts[c.id] || ""}
                              onChange={(e) => setDrafts({ ...drafts, [c.id]: e.target.value })}
                              onKeyDown={(e) => e.key === "Enter" && addAssign(c.id)}
                              placeholder="Type any name…"
                              className="text-sm"
                            />
                            <datalist id={`profiles-${c.id}`}>
                              {profiles.map((p) => (
                                <option key={p.id} value={p.display_name ?? ""}>{p.display_name}</option>
                              ))}
                            </datalist>
                            <Button size="sm" onClick={() => addAssign(c.id)} className="bg-ink text-cream hover:bg-ink/90">
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                          <p className="text-[10px] text-muted-foreground italic">
                            Suggests committee members; free text also works.
                          </p>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
              <CategoryChat
                open={chatOpen === c.id}
                onOpenChange={(v) => setChatOpen(v ? c.id : null)}
                categoryId={c.id}
                categoryName={c.name}
                canChat={isAdmin || items.some(isCurrentUserAssignment)}
                isAdmin={isAdmin}
                nameFor={nameForUser}
              />
            </Card>
          );
        })}
      </div>
    </div>
  );
}
