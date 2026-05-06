import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, Zap, BookOpen, Wallet, UtensilsCrossed, Timer, BarChart3, ArrowRight, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default function Landing() {
  const { t } = useTranslation();
  const features = [
    { icon: BookOpen, title: t("features.studyTitle"), desc: t("features.studyDesc") },
    { icon: Wallet, title: t("features.financeTitle"), desc: t("features.financeDesc") },
    { icon: UtensilsCrossed, title: t("features.nutritionTitle"), desc: t("features.nutritionDesc") },
    { icon: Timer, title: t("features.focusTitle"), desc: t("features.focusDesc") },
    { icon: BarChart3, title: t("features.analyticsTitle"), desc: t("features.analyticsDesc") },
    { icon: Sparkles, title: t("features.assistantTitle"), desc: t("features.assistantDesc") },
  ];
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Ambient orbs */}
      <div className="pointer-events-none absolute top-0 left-1/4 h-[500px] w-[500px] rounded-full bg-primary/30 blur-[140px]" />
      <div className="pointer-events-none absolute top-1/3 right-0 h-[400px] w-[400px] rounded-full bg-accent/20 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-[400px] w-[400px] rounded-full bg-primary-glow/20 blur-[120px]" />

      {/* Nav */}
      <header className="relative z-10 max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-gradient-primary shadow-glow flex items-center justify-center">
            <Zap className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-bold">Zentryx</span>
        </div>
        <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          <a href="#features" className="hover:text-foreground transition-colors">{t("nav.features")}</a>
          <Link to="/how-it-works" className="hover:text-foreground transition-colors">{t("nav.howItWorks")}</Link>
          <a href="#pricing" className="hover:text-foreground transition-colors">{t("nav.pricing")}</a>
        </nav>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <Link to="/auth"><Button variant="ghost" size="sm" className="rounded-xl">{t("nav.signIn")}</Button></Link>
          <Link to="/app"><Button size="sm" className="rounded-xl bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow">{t("nav.launchApp")}</Button></Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-16 pb-24 text-center">
        <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 mb-8 animate-fade-in">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-medium tracking-wide">{t("hero.badge")}</span>
        </div>
        <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-bold tracking-tighter leading-[1.05] mb-6 animate-fade-in">
          {t("hero.title1")} <br className="md:hidden" />
          <span className="gradient-text">{t("hero.title2")}</span>
        </h1>
        <p className="max-w-2xl mx-auto text-lg md:text-xl text-muted-foreground leading-relaxed mb-10 animate-fade-in">
          {t("hero.subtitle")}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 animate-fade-in">
          <Link to="/app">
            <Button size="lg" className="rounded-2xl h-12 px-7 bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow gap-2">
              {t("hero.openDashboard")} <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link to="/auth">
            <Button size="lg" variant="outline" className="rounded-2xl h-12 px-7 glass border-glass-border">
              {t("hero.createAccount")}
            </Button>
          </Link>
        </div>

        {/* Hero preview */}
        <div className="mt-20 relative animate-scale-in">
          <div className="absolute inset-0 bg-gradient-primary opacity-30 blur-3xl rounded-[3rem]" />
          <div className="relative glass-strong rounded-[2rem] p-3 shadow-elevated">
            <div className="rounded-[1.5rem] overflow-hidden bg-card/60 aspect-[16/9] grid grid-cols-12 gap-3 p-4">
              <div className="col-span-3 glass rounded-2xl p-4 space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className={`h-7 rounded-lg ${i === 0 ? "bg-gradient-primary" : "bg-muted/40"}`} />
                ))}
              </div>
              <div className="col-span-9 grid grid-cols-3 gap-3">
                <div className="col-span-2 glass rounded-2xl p-5 flex flex-col justify-between">
                  <div className="h-3 w-24 rounded-full bg-muted/40" />
                  <div className="h-10 w-3/4 rounded-lg bg-gradient-primary opacity-80" />
                </div>
                <div className="glass rounded-2xl p-5 flex items-center justify-center">
                  <div className="h-20 w-20 rounded-full border-4 border-primary/40 border-t-primary" />
                </div>
                <div className="glass rounded-2xl p-4 h-28" />
                <div className="glass rounded-2xl p-4 h-28" />
                <div className="glass rounded-2xl p-4 h-28" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative z-10 max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight mb-4">
            {t("features.heading1")} <span className="gradient-text">{t("features.heading2")}</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {t("features.subtitle")}
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <div
              key={f.title}
              className="glass rounded-3xl p-7 hover:-translate-y-1 hover:shadow-elevated transition-all duration-300 group"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="h-12 w-12 rounded-2xl bg-gradient-primary/20 border border-primary/30 flex items-center justify-center mb-5 group-hover:bg-gradient-primary group-hover:shadow-glow transition-all">
                <f.icon className="h-5 w-5 text-primary group-hover:text-primary-foreground" />
              </div>
              <h3 className="font-display font-semibold text-lg mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section id="pricing" className="relative z-10 max-w-5xl mx-auto px-6 py-24">
        <div className="glass-strong rounded-[2.5rem] p-12 md:p-16 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-glow" />
          <div className="relative z-10">
            <h2 className="font-display text-3xl md:text-5xl font-bold tracking-tight mb-4">
              {t("cta.heading1")} <span className="gradient-text">{t("cta.heading2")}</span>
            </h2>
            <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
              {t("cta.subtitle")}
            </p>
            <div className="flex flex-wrap justify-center gap-3 mb-8">
              {[t("cta.chip1"), t("cta.chip2"), t("cta.chip3")].map((label) => (
                <div key={label} className="flex items-center gap-2 text-sm glass rounded-full px-4 py-2">
                  <Check className="h-3.5 w-3.5 text-primary" /> {label}
                </div>
              ))}
            </div>
            <Link to="/app">
              <Button size="lg" className="rounded-2xl h-12 px-8 bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow gap-2">
                {t("cta.button")} <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="relative z-10 max-w-7xl mx-auto px-6 py-10 border-t border-border/40 flex flex-wrap items-center justify-between gap-4 text-sm text-muted-foreground">
        <p>{t("footer.copy")}</p>
        <div className="flex gap-6">
          <a href="#" className="hover:text-foreground">{t("footer.privacy")}</a>
          <a href="#" className="hover:text-foreground">{t("footer.terms")}</a>
          <a href="#" className="hover:text-foreground">{t("footer.contact")}</a>
        </div>
      </footer>
    </div>
  );
}
