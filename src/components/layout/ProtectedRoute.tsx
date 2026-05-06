import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ReactNode, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const { pathname } = useLocation();
  const [checking, setChecking] = useState(true);
  const [onboarded, setOnboarded] = useState<boolean>(true);

  useEffect(() => {
    if (!user) { setChecking(false); return; }
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("user_profiles")
        .select("onboarding_completed")
        .eq("id", user.id)
        .maybeSingle();
      if (!active) return;
      setOnboarded(!!data?.onboarding_completed);
      setChecking(false);
    })();
    return () => { active = false; };
  }, [user]);

  if (loading || checking) {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>;
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (!onboarded && pathname !== "/onboarding") return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}
