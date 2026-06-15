import { Bell } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useChatUnread } from "@/hooks/use-chat-unread";
import { useRoles } from "@/hooks/use-roles";

export function NotificationBell() {
  const unread = useChatUnread();
  const { isTeam, isAdmin } = useRoles();
  const total = unread.total;
  const canSeeTeamChat = isTeam || isAdmin;

  return (
    <Popover>
      <PopoverTrigger
        className="relative inline-flex items-center justify-center w-9 h-9 rounded-md hover:bg-secondary transition"
        aria-label={total > 0 ? `${total} new message${total === 1 ? "" : "s"}` : "Notifications"}
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
            New messages in chats you're part of
          </p>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {total === 0 && (
            <p className="px-4 py-6 text-sm text-muted-foreground text-center">
              You're all caught up.
            </p>
          )}

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
              to="/admin/categories"
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
