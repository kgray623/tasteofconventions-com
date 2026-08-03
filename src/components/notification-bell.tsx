import { Bell } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useChatUnread } from "@/hooks/use-chat-unread";
import { useNewRsvps } from "@/hooks/use-new-rsvps";
import { useRoles } from "@/hooks/use-roles";
import { NewBadge } from "@/components/new-badge";

function timeAgo(iso: string) {
  const diff = Date.now() - Date.parse(iso);
  if (!Number.isFinite(diff) || diff < 0) return "just now";
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function replyLabel(status: string | null, mode: string | null, party: number) {
  const who = `${party} ${party === 1 ? "person" : "people"}`;
  if (status === "no") return `Declined · ${who}`;
  if (status === "yes") return `${mode === "zoom" ? "Yes — Zoom" : "Yes — in person"} · ${who}`;
  if (status === "maybe") return `Maybe · ${who}`;
  if (status === "waitlist") return `Waitlist · ${who}`;
  return `Replied · ${who}`;
}

function normName(s: string | null | undefined) {
  return (s ?? "").toLowerCase().replace(/[^a-z]/g, "");
}

/** "Referred by <who>", showing the guest → committee chain when they differ. */
function ReferredBy({ typed, inviter }: { typed: string | null; inviter: string | null }) {
  if (!inviter && !typed) {
    return <p className="text-[11px] text-muted-foreground italic">Referrer not recorded</p>;
  }
  const sameName = !!typed && !!inviter && normName(typed) === normName(inviter);
  if (!inviter) {
    return (
      <p className="text-[11px] text-muted-foreground truncate">
        Referred by <span className="italic">{typed}</span> · not yet credited
      </p>
    );
  }
  if (!typed || sameName) {
    return <p className="text-[11px] text-muted-foreground truncate">Referred by {inviter}</p>;
  }
  return (
    <p className="text-[11px] text-muted-foreground truncate">
      Referred by <span className="italic">{typed}</span> · credited to {inviter}
    </p>
  );
}


export function NotificationBell() {
  const unread = useChatUnread();
  const rsvps = useNewRsvps();
  const { isTeam, isAdmin } = useRoles();
  const total = unread.total + rsvps.count;
  const canSeeTeamChat = isTeam || isAdmin;
  const guestListTo = isAdmin ? "/admin/guests" : "/dashboard";

  return (
    <Popover onOpenChange={(open) => { if (open) rsvps.refresh(); }}>
      <PopoverTrigger
        className="relative inline-flex items-center justify-center w-9 h-9 rounded-md hover:bg-secondary transition"
        aria-label={total > 0 ? `${total} new notification${total === 1 ? "" : "s"}` : "Notifications"}
      >
        <Bell className="w-5 h-5 text-ink" />
        {total > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-terracotta text-cream text-[10px] font-semibold flex items-center justify-center">
            {total > 99 ? "99+" : total}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="px-4 py-3 border-b">
          <p className="text-sm font-semibold text-ink">Notifications</p>
          <p className="text-xs text-muted-foreground">
            New RSVP replies and messages in chats you're part of
          </p>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {total === 0 && (
            <p className="px-4 py-6 text-sm text-muted-foreground text-center">
              You're all caught up.
            </p>
          )}

          {rsvps.count > 0 && (
            <div className="border-b bg-secondary/40 px-4 py-2 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink flex items-center gap-1.5">
                New RSVPs ({rsvps.count})
                <NewBadge target="bell:new-rsvps" direction="left" />
              </p>
              <button
                type="button"
                onClick={() => void rsvps.markSeen()}
                className="text-xs text-terracotta hover:underline"
              >
                Mark all read
              </button>
            </div>
          )}

          {rsvps.items.map((r) => (
            <Link
              key={r.invitation_id}
              to={guestListTo}
              search={isAdmin ? { sort: "replied" as const } : undefined}
              onClick={() => void rsvps.markSeen()}
              className="flex items-start justify-between gap-3 px-4 py-3 hover:bg-secondary transition border-b"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink truncate">{r.guest_name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {replyLabel(r.status, r.attendance_mode, r.party_size)}
                </p>
                <ReferredBy typed={r.referred_by_text} inviter={r.inviter_name} />
              </div>
              <span className="text-[11px] text-muted-foreground shrink-0">
                {timeAgo(r.responded_at)}
              </span>

            </Link>
          ))}

          {canSeeTeamChat && unread.team > 0 && (
            <Link
              to="/admin/chat"
              className="flex items-center justify-between px-4 py-3 hover:bg-secondary transition border-b"
            >
              <div>
                <p className="text-sm font-medium text-ink">Committee chat</p>
                <p className="text-xs text-muted-foreground">New messages</p>
              </div>
              <span className="min-w-[22px] h-[22px] px-1.5 rounded-full bg-terracotta text-cream text-xs font-semibold flex items-center justify-center">
                {unread.team}
              </span>
            </Link>
          )}

          {unread.categories.map((c) => (
            <Link
              key={c.category_id}
              to="/admin/subcommittee"
              search={{ chat: c.category_id }}
              className="flex items-center justify-between px-4 py-3 hover:bg-secondary transition border-b last:border-b-0"
            >
              <div>
                <p className="text-sm font-medium text-ink">{c.name}</p>
                <p className="text-xs text-muted-foreground">Volunteer chat</p>
              </div>
              <span className="min-w-[22px] h-[22px] px-1.5 rounded-full bg-terracotta text-cream text-xs font-semibold flex items-center justify-center">
                {c.count}
              </span>
            </Link>
          ))}

        </div>
      </PopoverContent>
    </Popover>
  );
}
