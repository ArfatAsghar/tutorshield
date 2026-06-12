import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, MapPin, FileText, Star, MessageSquare, CreditCard, ArrowRight, GraduationCap, Sparkles, Quote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CountUp } from "@/components/CountUp";
import { Reveal } from "@/components/Reveal";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TutorShield — Verified tutors parents can trust" },
      { name: "description", content: "Verify tutor competency with live exams. Track attendance, progress, and payments in one trusted platform." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Nav */}
      <header className="border-b border-border/60 bg-background/70 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <Logo />
          </Link>
          <nav className="hidden md:flex items-center gap-10 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors story-link">Features</a>
            <a href="#how" className="hover:text-foreground transition-colors story-link">How it works</a>
            <a href="#trust" className="hover:text-foreground transition-colors story-link">Trust</a>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link to="/auth"><Button variant="ghost" size="sm">Log in</Button></Link>
            <Link to="/auth"><Button size="sm" className="bg-primary hover:bg-primary/90 shadow-emerald">Get started</Button></Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-hero text-primary-foreground grain">
        {/* Floating orbs */}
        <div className="absolute top-20 -left-32 w-[420px] h-[420px] rounded-full bg-gold/30 blur-[120px] animate-orb" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full bg-primary/40 blur-[140px] animate-orb" style={{ animationDelay: "-7s" }} />
        <div className="absolute top-1/3 right-1/4 w-72 h-72 rounded-full bg-accent/20 blur-[100px] animate-float-slow" />

        {/* Subtle grid */}
        <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "linear-gradient(oklch(1 0 0) 1px, transparent 1px), linear-gradient(90deg, oklch(1 0 0) 1px, transparent 1px)", backgroundSize: "64px 64px" }} />

        <div className="relative max-w-6xl mx-auto px-4 py-24 md:py-36">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass text-xs font-medium tracking-wide animate-rise">
            <Sparkles className="w-3.5 h-3.5 text-gold" />
            <span className="uppercase tracking-[0.15em]">AI-powered verification</span>
          </div>
          <h1 className="mt-6 text-5xl md:text-7xl lg:text-8xl font-display font-medium max-w-4xl leading-[1.02] animate-blur-in">
            Hire tutors you can{" "}
            <span className="italic text-gradient-gold animate-gradient-x">actually</span>{" "}
            trust.
          </h1>
          <p className="mt-7 text-lg md:text-xl text-primary-foreground/75 max-w-2xl leading-relaxed animate-rise delay-200">
            TutorShield verifies tutor competency through live subject exams, tracks attendance via geolocation, and gives parents transparent progress reports — all in one refined platform.
          </p>
          <div className="mt-10 flex flex-wrap gap-3 animate-rise delay-300">
            <Link to="/auth">
              <Button size="lg" className="bg-gold text-gold-foreground hover:bg-gold/90 shadow-glow group h-12 px-7 text-base">
                Find a tutor
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="lg" variant="outline" className="bg-transparent border-primary-foreground/25 text-primary-foreground hover:bg-primary-foreground/10 h-12 px-7 text-base">
                I'm a tutor
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-20 grid grid-cols-3 gap-8 max-w-3xl">
            {[
              { n: 12000, suffix: "+", l: "Verified tutors" },
              { n: 98, suffix: "%", l: "Parent satisfaction" },
              { n: 50, suffix: "+", l: "Subjects covered" },
            ].map((s, i) => (
              <Reveal key={s.l} delay={i * 120}>
                <div className="border-l-2 border-gold/40 pl-5">
                  <div className="text-4xl md:text-5xl font-display font-medium text-gold">
                    <CountUp to={s.n} suffix={s.suffix} />
                  </div>
                  <div className="text-sm text-primary-foreground/60 mt-2 tracking-wide uppercase">{s.l}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-b from-transparent to-background pointer-events-none" />
      </section>

      {/* Features */}
      <section id="features" className="py-24 md:py-36 relative">
        <div className="absolute top-10 right-10 w-96 h-96 rounded-full bg-gold/5 blur-3xl" />
        <div className="max-w-6xl mx-auto px-4 relative">
          <Reveal className="max-w-2xl">
            <p className="text-xs font-semibold text-gold uppercase tracking-[0.2em]">— Built for trust</p>
            <h2 className="mt-4 text-4xl md:text-5xl font-display">
              Everything you need to feel <em className="text-gradient-gold not-italic">confident</em>
            </h2>
            <p className="mt-5 text-muted-foreground text-lg leading-relaxed">Replace guesswork with verifiable signals. From the first booking to the last session.</p>
          </Reveal>
          <div className="mt-16 grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: CheckCircle2, title: "Verification exams", text: "Live subject competency tests — not just CV claims." },
              { icon: MapPin, title: "Geo check-in", text: "Geotagged attendance so parents know sessions actually happened." },
              { icon: FileText, title: "Progress reports", text: "Daily session notes, topics covered, and student trajectory." },
              { icon: Star, title: "Authentic reviews", text: "Reviews only from verified parents with completed sessions." },
              { icon: MessageSquare, title: "AI-moderated chat", text: "Communication scanned for safety — protecting students and parents." },
              { icon: CreditCard, title: "Escrow payments", text: "Funds released after each verified session. No disputes." },
            ].map((f, i) => (
              <Reveal key={f.title} delay={i * 80}>
                <div className="group relative bg-card border border-border rounded-2xl p-7 hover-lift h-full overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-gold/0 via-gold/0 to-gold/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="relative">
                    <div className="w-12 h-12 rounded-xl bg-gradient-trust flex items-center justify-center mb-5 shadow-emerald group-hover:scale-110 transition-transform duration-500">
                      <f.icon className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <h3 className="font-display text-2xl">{f.title}</h3>
                    <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{f.text}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* How */}
      <section id="how" className="py-24 md:py-36 bg-primary text-primary-foreground relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-gold/10 blur-3xl animate-orb" />
        <div className="max-w-6xl mx-auto px-4 relative">
          <Reveal>
            <p className="text-xs font-semibold text-gold uppercase tracking-[0.2em] text-center">— The process</p>
            <h2 className="mt-4 text-4xl md:text-5xl font-display text-center max-w-2xl mx-auto">How TutorShield works</h2>
          </Reveal>
          <div className="mt-20 grid md:grid-cols-3 gap-10">
            {[
              { n: "01", title: "Tutors prove competency", text: "Live subject exam + identity verification + background check." },
              { n: "02", title: "Parents browse with confidence", text: "Filter by verified badges, ratings, subject, and location." },
              { n: "03", title: "Track every session", text: "Geo check-in, progress reports, and escrow payments built in." },
            ].map((s, i) => (
              <Reveal key={s.n} delay={i * 150}>
                <div className="relative group">
                  <div className="text-7xl font-display text-gold/40 group-hover:text-gold/70 transition-colors duration-500">{s.n}</div>
                  <div className="w-12 h-px bg-gold/50 my-5" />
                  <h3 className="font-display text-2xl text-primary-foreground">{s.title}</h3>
                  <p className="mt-3 text-primary-foreground/70 leading-relaxed">{s.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="py-24 md:py-32">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <Reveal>
            <Quote className="w-10 h-10 mx-auto text-gold" />
            <p className="mt-8 font-display text-3xl md:text-4xl leading-[1.25] italic">
              "For the first time, I know exactly what my daughter learns each session — and I trust the tutor we picked."
            </p>
            <div className="mt-8 flex items-center justify-center gap-3">
              <div className="w-11 h-11 rounded-full bg-gradient-trust shadow-emerald" />
              <div className="text-left">
                <p className="font-semibold">Ayesha Khan</p>
                <p className="text-sm text-muted-foreground">Parent, Lahore</p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* CTA */}
      <section id="trust" className="py-24 md:py-32 relative">
        <div className="max-w-5xl mx-auto px-4">
          <Reveal>
            <div className="relative rounded-3xl bg-gradient-hero text-primary-foreground p-14 md:p-20 overflow-hidden grain shadow-emerald">
              <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full bg-gold/30 blur-3xl animate-orb" />
              <div className="absolute -bottom-20 -left-20 w-96 h-96 rounded-full bg-accent/20 blur-3xl animate-orb" style={{ animationDelay: "-5s" }} />
              <div className="relative text-center">
                <GraduationCap className="w-12 h-12 mx-auto text-gold" />
                <h2 className="mt-6 text-4xl md:text-6xl font-display max-w-3xl mx-auto leading-[1.05]">
                  Make tutoring <em className="text-gradient-gold not-italic">transparent.</em>
                </h2>
                <p className="mt-5 text-lg text-primary-foreground/75 max-w-xl mx-auto">Join thousands of parents and tutors building a more trusted ecosystem.</p>
                <Link to="/auth" className="inline-block mt-10">
                  <Button size="lg" className="bg-gold text-gold-foreground hover:bg-gold/90 h-12 px-8 text-base shadow-glow group">
                    Get started free
                    <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <footer className="border-t border-border py-12">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Logo className="scale-75 origin-left" /> © 2026 TutorShield. Built with trust.
          </div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
            <a href="#" className="hover:text-foreground transition-colors">Terms</a>
            <a href="#" className="hover:text-foreground transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
