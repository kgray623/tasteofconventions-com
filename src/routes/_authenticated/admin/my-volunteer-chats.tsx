import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageCircle } from "lucide-react";
import { CategoryChat } from "@/components/CategoryChat";
import { useChatUnread } from "@/hooks/use-chat-unread";
import { useAdminView } from "@/hooks/use-admin-view";

export const Route = createFileRoute("/_authenticated/admin/my-volunteer-chats")({
  head: () => ({ meta: [{ title: "My volunteer chats — Steering Committee" }] }),
  component: MyVolunteerChatsPage,
});

type MyCategory = { id: string; name: string; description: string | null };
type ProfileRow = { id: string; display_name: string | null; email: string | null };

function MyVolunteerChatsPage() {
  const { user } = useAuth();
  const { isAdmin } = useAdminView();
  const chatUnread = useChatUnread();
  const [myCats, setMyCats] = useState<MyCategory[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [chatOpen, setChatOpen] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    let alive = true;
    void (async () => {
      const { data: assigns } = await supabase
        .from("category_assignments")
        .select("category_id")
        .eq("user_id", user.id);
      const catIds = Array.from(new Set((assigns ?? []).map((a) => a.category_id)));
      if (!alive) return;
      if (catIds.length === 0) {
        setMyCats([]);
      } else {
        const { data: cats } = await supabase
          .from("categories")
          .select("id,name,description")
          .in("id", catIds)
          .order("sort_order");
        if (alive) setMyCats((cats ?? []) as MyCategory[]);
      }
      const { data: p } = await supabase.from("profiles").select("id,display_name,email");
      if (alive) setProfiles((p ?? []) as ProfileRow[]);
    })();
    return () => {
      alive = false;
    };
  }, [user?.id]);

  const nameForUser = (uid: string) => {
    const p = profiles.find((x) => x.id === uid);
    return p?.display_name || p?.email || "Member";
  };

  const unreadForCategory = (catId: string) =>
    chatUnread.categories.find((c) => c.category_id === catId)?.count ?? 0;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-2xl">My volunteer chats</h2>
        <p className="text-sm text-muted-foreground mt-1">
          One-tap access to chats for every volunteer category you're signed up for.
        </p>
      </div>

      {myCats.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground text-sm">
          You haven't volunteered for any categories yet.{" "}
          <Link
            to="/admin/categories"
            search={{ view: undefined }}
            className="text-terracotta underline"
          >
            Browse volunteer opportunities
          </Link>
          .
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {myCats.map((c) => {
            const unread = unreadForCategory(c.id);
            return (
              <Card key={c.id} className="p-4 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{c.name}</p>
                    {unread > 0 && (
                      <Badge className="bg-terracotta text-cream hover:bg-terracotta text-[10px]">
                        {unread} new
                      </Badge>
                    )}
                  </div>
                  {c.description && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{c.description}</p>
                  )}
                </div>
                <Button
                  size="sm"
                  onClick={() => setChatOpen(c.id)}
                  className="bg-ink text-cream hover:bg-ink/90"
                >
                  <MessageCircle className="w-4 h-4 mr-1.5" /> Open chat
                </Button>
                <CategoryChat
                  open={chatOpen === c.id}
                  onOpenChange={(v) => setChatOpen(v ? c.id : null)}
                  categoryId={c.id}
                  categoryName={c.name}
                  canChat
                  isAdmin={isAdmin}
                  nameFor={nameForUser}
                />
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
