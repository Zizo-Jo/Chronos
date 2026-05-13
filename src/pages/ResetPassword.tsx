import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Zap, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function ResetPassword() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Supabase parses recovery tokens in the URL hash and emits a session event.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { toast.error(t("auth.passwordTooShort")); return; }
    if (password !== confirm) { toast.error(t("auth.passwordsDontMatch")); return; }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(t("auth.passwordUpdated"));
    navigate("/app", { replace: true });
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4 md:p-8">
      <div className="pointer-events-none absolute -top-20 -left-20 h-[500px] w-[500px] rounded-full bg-primary/25 blur-[140px]" />
      <div className="pointer-events-none absolute -bottom-20 -right-20 h-[500px] w-[500px] rounded-full bg-accent/15 blur-[140px]" />

      <div className="relative z-10 glass-strong rounded-[2rem] p-6 md:p-10 w-full max-w-md shadow-elevated animate-fade-in space-y-6">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-gradient-primary shadow-glow flex items-center justify-center">
            <Zap className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-bold">Zentryx</span>
        </Link>

        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">{t("auth.newPasswordTitle")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {ready ? t("auth.newPasswordReady") : t("auth.verifyingLink")}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-password">{t("auth.newPassword")}</Label>
            <Input
              id="new-password" type="password" minLength={6}
              value={password} onChange={(e)=>setPassword(e.target.value)}
              placeholder={t("auth.signupPasswordPlaceholder")}
              className="h-11 rounded-xl" required disabled={!ready}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">{t("auth.confirmPassword")}</Label>
            <Input
              id="confirm-password" type="password" minLength={6}
              value={confirm} onChange={(e)=>setConfirm(e.target.value)}
              placeholder={t("auth.repeatPassword")}
              className="h-11 rounded-xl" required disabled={!ready}
            />
          </div>
          <Button
            type="submit" disabled={!ready || saving}
            className="w-full h-11 rounded-xl bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow inline-flex items-center justify-center gap-2 whitespace-normal"
          >
            {saving ? t("auth.updating") : <>{t("auth.updatePassword")} <ArrowRight className="h-4 w-4 shrink-0" /></>}
          </Button>
        </form>

        <p className="text-xs text-muted-foreground text-center">
          <Link to="/auth" className="hover:text-primary">{t("auth.backToSignIn")}</Link>
        </p>
      </div>
    </div>
  );
}
