import { Bell, Check, Trash2, Sparkles, Calendar as CalIcon, ListChecks, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useNotifications, type Notification } from "@/hooks/useNotifications";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

const iconFor = (type: string) => {
  switch (type) {
    case "task": return ListChecks;
    case "ai": return Sparkles;
    case "schedule": return CalIcon;
    case "warning": return AlertTriangle;
    default: return Bell;
  }
};

export default function NotificationsBell() {
  const { items, loading, unreadCount, markAllRead, markRead, remove } = useNotifications();
  const navigate = useNavigate();

  const onClick = async (n: Notification) => {
    if (!n.read) await markRead(n.id);
    if (n.link) navigate(n.link);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-xl relative" aria-label="Notifications">
          <Bell className="h-[18px] w-[18px]" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 h-4 min-w-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold flex items-center justify-center shadow-glow">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] p-0 glass border-glass-border rounded-2xl overflow-hidden">
        <div className="px-4 py-3 flex items-center justify-between border-b border-border/40">
          <p className="font-display font-semibold text-sm">Notifications</p>
          {items.length > 0 && unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={markAllRead}>
              <Check className="h-3.5 w-3.5" /> Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-[420px] overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-xs text-muted-foreground">Loading…</div>
          ) : items.length === 0 ? (
            <div className="p-10 text-center">
              <Bell className="h-6 w-6 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
            </div>
          ) : (
            items.map((n) => {
              const Icon = iconFor(n.type);
              return (
                <div key={n.id} className={`group flex gap-3 px-4 py-3 border-b border-border/30 last:border-0 transition-colors ${!n.read ? "bg-primary/5" : ""} hover:bg-secondary/30`}>
                  <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${!n.read ? "bg-gradient-primary text-primary-foreground" : "bg-secondary/60 text-muted-foreground"}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <button onClick={() => onClick(n)} className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-medium truncate">{n.title}</p>
                    {n.body && <p className="text-xs text-muted-foreground line-clamp-2">{n.body}</p>}
                    <p className="text-[10px] text-muted-foreground/70 mt-1">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </p>
                  </button>
                  <button onClick={() => remove(n.id)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive self-start" aria-label="Dismiss">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}