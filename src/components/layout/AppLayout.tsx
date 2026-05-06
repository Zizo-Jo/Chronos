import { Outlet, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import NotificationsBell from "./NotificationsBell";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default function AppLayout() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-16 sticky top-0 z-30 backdrop-blur-xl bg-background/60 border-b border-border/50 flex items-center gap-2 md:gap-3 px-3 md:px-6">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            <div className="hidden md:flex relative flex-1 min-w-0 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("app.common.search")}
                className="pl-9 h-9 bg-secondary/40 border-border/50 rounded-xl"
              />
            </div>
            <div className="flex-1 md:hidden" />
            <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
              <LanguageSwitcher />
              <NotificationsBell />
              <Button
                size="sm"
                onClick={() => navigate("/app/assistant?focus=1")}
                className="rounded-xl bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow gap-2 shrink-0"
              >
                <Sparkles className="h-4 w-4" />
                <span className="hidden sm:inline whitespace-nowrap">{t("app.common.askAi")}</span>
              </Button>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-8 animate-fade-in">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
