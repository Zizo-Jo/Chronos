import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Zap, Sparkles, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default function Auth() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, signIn, signUp } = useAuth();
  const [loading, setLoading] = useState(false);
  const [signinEmail, setSigninEmail] = useState("");
  const [signinPassword, setSigninPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  useEffect(() => { if (user) navigate("/app", { replace: true }); }, [user, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    const { error } = await signIn(signinEmail, signinPassword);
    setLoading(false);
    if (error) toast.error(error.message);
    else { toast.success(t("auth.welcomeBackToast")); navigate("/app"); }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    const { error } = await signUp(signupEmail, signupPassword, signupName);
    setLoading(false);
    if (error) toast.error(error.message);
    else toast.success(t("auth.checkInbox"));
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setForgotLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success(t("auth.resetSent"));
    setForgotOpen(false);
    setForgotEmail("");
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 relative overflow-hidden">
      <div className="pointer-events-none absolute -top-20 -left-20 h-[500px] w-[500px] rounded-full bg-primary/25 blur-[140px]" />
      <div className="pointer-events-none absolute -bottom-20 -right-20 h-[500px] w-[500px] rounded-full bg-accent/15 blur-[140px]" />

      <div className="relative z-10 flex flex-col p-6 md:p-12">
        <div className="flex items-center justify-between mb-12">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-primary shadow-glow flex items-center justify-center">
              <Zap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-bold">Zentryx</span>
          </Link>
          <LanguageSwitcher />
        </div>

        <div className="m-auto w-full max-w-md animate-fade-in">
          <h1 className="font-display text-4xl font-bold tracking-tight mb-2">{t("auth.welcomeBack")}</h1>
          <p className="text-muted-foreground mb-8">{t("auth.subtitle")}</p>

          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid grid-cols-2 w-full mb-6 bg-secondary/50 rounded-xl p-1">
              <TabsTrigger value="signin" className="rounded-lg">{t("auth.signIn")}</TabsTrigger>
              <TabsTrigger value="signup" className="rounded-lg">{t("auth.signUp")}</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">{t("auth.email")}</Label>
                  <Input id="email" type="email" value={signinEmail} onChange={(e)=>setSigninEmail(e.target.value)} placeholder={t("auth.emailPlaceholder")} className="h-11 rounded-xl" required />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">{t("auth.password")}</Label>
                    <button
                      type="button"
                      onClick={() => { setForgotEmail(signinEmail); setForgotOpen(true); }}
                      className="text-xs text-muted-foreground hover:text-primary transition-colors"
                    >
                      {t("auth.forgotPassword")}
                    </button>
                  </div>
                  <Input id="password" type="password" value={signinPassword} onChange={(e)=>setSigninPassword(e.target.value)} placeholder={t("auth.passwordPlaceholder")} className="h-11 rounded-xl" required />
                </div>
                <Button type="submit" disabled={loading} className="w-full h-11 rounded-xl bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow inline-flex items-center justify-center gap-2 whitespace-normal">
                  {loading ? t("auth.signingIn") : <>{t("auth.signIn")} <ArrowRight className="h-4 w-4 shrink-0" /></>}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">{t("auth.fullName")}</Label>
                  <Input id="name" value={signupName} onChange={(e)=>setSignupName(e.target.value)} placeholder={t("auth.namePlaceholder")} className="h-11 rounded-xl" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email2">{t("auth.email")}</Label>
                  <Input id="email2" type="email" value={signupEmail} onChange={(e)=>setSignupEmail(e.target.value)} placeholder={t("auth.emailPlaceholder")} className="h-11 rounded-xl" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password2">{t("auth.password")}</Label>
                  <Input id="password2" type="password" value={signupPassword} onChange={(e)=>setSignupPassword(e.target.value)} placeholder={t("auth.signupPasswordPlaceholder")} minLength={6} className="h-11 rounded-xl" required />
                </div>
                <Button type="submit" disabled={loading} className="w-full h-11 rounded-xl bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow inline-flex items-center justify-center gap-2 whitespace-normal">
                  {loading ? t("auth.creating") : <>{t("auth.createAccount")} <ArrowRight className="h-4 w-4 shrink-0" /></>}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <div className="relative hidden lg:flex items-center justify-center p-12">
        <div className="absolute inset-6 rounded-[2.5rem] bg-gradient-primary opacity-30 blur-3xl" />
        <div className="relative glass-strong rounded-[2rem] p-10 max-w-md text-center space-y-5 shadow-elevated animate-scale-in">
          <div className="inline-flex h-14 w-14 rounded-2xl bg-gradient-primary items-center justify-center shadow-glow">
            <Sparkles className="h-7 w-7 text-primary-foreground" />
          </div>
          <h2 className="font-display text-3xl font-bold tracking-tight">
            <span className="gradient-text">{t("auth.tagline1")}</span><br />{t("auth.tagline2")}
          </h2>
          <p className="text-muted-foreground leading-relaxed">{t("auth.taglineDesc")}</p>
        </div>
      </div>

      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>{t("auth.resetTitle")}</DialogTitle>
            <DialogDescription>{t("auth.resetDesc")}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleForgot} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="forgot-email">{t("auth.email")}</Label>
              <Input
                id="forgot-email"
                type="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder={t("auth.emailPlaceholder")}
                className="h-11 rounded-xl"
                required
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button
                type="submit"
                disabled={forgotLoading}
                className="w-full h-11 rounded-xl bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow"
              >
                {forgotLoading ? t("auth.sending") : t("auth.sendResetLink")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
