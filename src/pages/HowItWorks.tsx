import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, Zap, BookOpen, Wallet, UtensilsCrossed, Timer, BarChart3, Calendar, Target, ArrowRight, ArrowLeft, UserPlus, ListChecks, Gauge } from "lucide-react";

const features = [
  { icon: BookOpen, title: "Study Planner", desc: "AI builds weekly study blocks from your tasks, exams and deadlines." },
  { icon: Wallet, title: "Finance", desc: "Track expenses, set budgets, and get savings tips powered by AI." },
  { icon: UtensilsCrossed, title: "Nutrition", desc: "Weekly budget-friendly meal plans and an auto-generated grocery list." },
  { icon: Calendar, title: "Adaptive Schedule", desc: "Drop in fixed commitments — AI fills gaps with study, rest and focus." },
  { icon: Timer, title: "Focus Mode", desc: "Pomodoro sessions, breathing breaks and movement reminders." },
  { icon: BarChart3, title: "Analytics", desc: "Visualise planned vs actual time, peak windows and habit streaks." },
  { icon: Target, title: "Single Focus", desc: "A distraction-free dashboard showing only what matters next." },
  { icon: Sparkles, title: "AI Assistant", desc: "A 24/7 chief-of-staff that knows your data and replans on the fly." },
];

const steps = [
  { icon: UserPlus, title: "Create your account", desc: "Sign up in seconds — no credit card needed." },
  { icon: ListChecks, title: "Onboard in 2 minutes", desc: "Tell us your university, budget, study and nutrition goals." },
  { icon: Sparkles, title: "Let AI build your plan", desc: "Zentryx generates your week — study blocks, meals and focus sessions." },
  { icon: Gauge, title: "Live your day, beautifully", desc: "Open the Dashboard or Now view and follow what's next." },
];

export default function HowItWorks() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="pointer-events-none absolute top-0 left-1/4 h-[500px] w-[500px] rounded-full bg-primary/30 blur-[140px]" />
      <div className="pointer-events-none absolute top-1/3 right-0 h-[400px] w-[400px] rounded-full bg-accent/20 blur-[120px]" />

      <header className="relative z-10 max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-gradient-primary shadow-glow flex items-center justify-center">
            <Zap className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-bold">Zentryx</span>
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          <Link to="/#features" className="hover:text-foreground transition-colors">Features</Link>
          <Link to="/how-it-works" className="text-foreground">How it works</Link>
          <Link to="/#pricing" className="hover:text-foreground transition-colors">Pricing</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/auth"><Button variant="ghost" size="sm" className="rounded-xl">Sign in</Button></Link>
          <Link to="/app"><Button size="sm" className="rounded-xl bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow">Launch app</Button></Link>
        </div>
      </header>

      <section className="relative z-10 max-w-5xl mx-auto px-6 pt-12 pb-12 text-center">
        <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 mb-6">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-medium tracking-wide">How Zentryx works</span>
        </div>
        <h1 className="font-display text-4xl md:text-6xl font-bold tracking-tighter leading-[1.05] mb-5">
          One AI-powered <span className="gradient-text">life OS</span> for students.
        </h1>
        <p className="max-w-2xl mx-auto text-lg text-muted-foreground leading-relaxed">
          Zentryx unifies study, money, meals, focus and habits into a single intelligent dashboard
          that adapts to your day in real time.
        </p>
      </section>

      <section className="relative z-10 max-w-5xl mx-auto px-6 py-12">
        <h2 className="font-display text-2xl md:text-3xl font-bold mb-8 text-center">Get started in 4 steps</h2>
        <div className="grid md:grid-cols-2 gap-5">
          {steps.map((s, i) => (
            <div key={s.title} className="glass rounded-3xl p-6 flex gap-4">
              <div className="h-11 w-11 rounded-2xl bg-gradient-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
                <s.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Step {i + 1}</p>
                <h3 className="font-display font-semibold text-lg mb-1">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="relative z-10 max-w-7xl mx-auto px-6 py-12">
        <h2 className="font-display text-2xl md:text-3xl font-bold mb-8 text-center">Everything you get</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((f) => (
            <div key={f.title} className="glass rounded-3xl p-5 hover:-translate-y-1 transition-all">
              <div className="h-10 w-10 rounded-xl bg-gradient-primary/20 border border-primary/30 flex items-center justify-center mb-3">
                <f.icon className="h-4 w-4 text-primary" />
              </div>
              <h3 className="font-display font-semibold mb-1">{f.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative z-10 max-w-3xl mx-auto px-6 py-16 text-center">
        <div className="glass-strong rounded-[2rem] p-10">
          <h2 className="font-display text-3xl font-bold mb-3">Ready to run your life beautifully?</h2>
          <p className="text-muted-foreground mb-6">Start free. Set up takes less than 2 minutes.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/auth">
              <Button size="lg" className="rounded-2xl h-12 px-7 bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow gap-2">
                Create account <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/">
              <Button size="lg" variant="outline" className="rounded-2xl h-12 px-7 glass border-glass-border gap-2">
                <ArrowLeft className="h-4 w-4" /> Back home
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}