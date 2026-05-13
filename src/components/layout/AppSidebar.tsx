import { NavLink, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard, Sparkles, BookOpen, Wallet, UtensilsCrossed,
  Calendar, Timer, BarChart3, Settings, Zap, Flame, LogOut, Target,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export function AppSidebar() {
  const { state } = useSidebar();
  const { t } = useTranslation();
  const main = [
    { title: t("app.sidebar.dashboard"), url: "/app", icon: LayoutDashboard },
    { title: t("app.sidebar.now"), url: "/app/now", icon: Target },
    { title: t("app.sidebar.assistant"), url: "/app/assistant", icon: Sparkles },
    { title: t("app.sidebar.study"), url: "/app/study", icon: BookOpen },
    { title: t("app.sidebar.finance"), url: "/app/finance", icon: Wallet },
    { title: t("app.sidebar.nutrition"), url: "/app/nutrition", icon: UtensilsCrossed },
  ];
  const tools = [
    { title: t("app.sidebar.calendar"), url: "/app/calendar", icon: Calendar },
    { title: t("app.sidebar.focus"), url: "/app/focus", icon: Timer },
    { title: t("app.sidebar.habits"), url: "/app/habits", icon: Flame },
    { title: t("app.sidebar.analytics"), url: "/app/analytics", icon: BarChart3 },
    { title: t("app.sidebar.settings"), url: "/app/settings", icon: Settings },
  ];
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const { user, signOut } = useAuth();
  const isActive = (url: string) => url === "/app" ? pathname === "/app" : pathname.startsWith(url);

  const [fullName, setFullName] = useState<string>("");

  useEffect(() => {
    if (!user) { setFullName(""); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("user_profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      const name = (data?.full_name ?? "").trim();
      if (name) {
        setFullName(name);
        return;
      }
      // Backfill from auth metadata if profile exists but name is empty
      const metaName = (user.user_metadata?.full_name as string | undefined)?.trim();
      if (metaName) {
        await supabase.from("user_profiles").upsert({ id: user.id, full_name: metaName });
        if (!cancelled) setFullName(metaName);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  const displayName = fullName || user?.email || "";
  const initial = (fullName?.[0] || user?.email?.[0] || "").toUpperCase();

  const renderItems = (items: typeof main) => (
    <SidebarMenu>
      {items.map((item) => {
        const active = isActive(item.url);
        return (
          <SidebarMenuItem key={item.title}>
            <SidebarMenuButton asChild isActive={active} className="h-11 rounded-xl data-[active=true]:bg-gradient-primary data-[active=true]:text-primary-foreground data-[active=true]:shadow-glow transition-all duration-300">
              <NavLink to={item.url} end={item.url === "/app"} className="flex items-center gap-3 min-w-0">
                <item.icon className="h-[18px] w-[18px] shrink-0" />
                {!collapsed && <span className="font-medium text-sm truncate">{item.title}</span>}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="p-4">
        <NavLink to="/app" className="flex items-center gap-3 px-2 py-2">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
            <Zap className="h-5 w-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-display font-bold text-base tracking-tight">Zentryx</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Life OS</span>
            </div>
          )}
        </NavLink>
      </SidebarHeader>

      <SidebarContent className="px-3">
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-muted-foreground/60">{t("app.sidebar.main")}</SidebarGroupLabel>}
          <SidebarGroupContent>{renderItems(main)}</SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-muted-foreground/60">{t("app.sidebar.tools")}</SidebarGroupLabel>}
          <SidebarGroupContent>{renderItems(tools)}</SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        {!collapsed ? (
          <div className="glass rounded-2xl p-3 space-y-3">
            <div className="flex items-center gap-3 px-1">
              <div className="h-10 w-10 rounded-full bg-gradient-primary flex items-center justify-center font-semibold text-primary-foreground">
                {initial}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{displayName}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="w-full justify-start rounded-lg gap-2 h-8" onClick={signOut}>
              <LogOut className="h-3.5 w-3.5"/> {t("app.common.signOut")}
            </Button>
          </div>
        ) : (
          <button onClick={signOut} className="h-10 w-10 mx-auto rounded-full bg-gradient-primary flex items-center justify-center font-semibold text-primary-foreground">
            {initial}
          </button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
