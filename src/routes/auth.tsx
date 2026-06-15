import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Shield, GraduationCap, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth, type Role } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — TutorShield" }] }),
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [role, setRole] = useState<Role>("parent");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, signup } = useAuth();
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") {
        const loggedIn = await login(email, password);
        toast.success("Welcome back!");
        navigate({ to: loggedIn.role === "tutor" && !loggedIn.verified ? "/verification" : "/dashboard" });
      } else {
        const created = await signup({ name, email, password, role });
        if (created.needsVerification) {
          toast.success("Account created! Please check your inbox and confirm your email address to log in.", {
            duration: 10000,
          });
          setMode("login");
          setPassword("");
        } else {
          toast.success("Account created!");
          navigate({ to: created.role === "tutor" ? "/verification" : "/dashboard" });
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <div className="hidden md:flex flex-col justify-between bg-gradient-hero text-primary-foreground p-12 relative overflow-hidden">
        <Link to="/" className="flex items-center gap-2 relative z-10">
          <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center"><Shield className="w-5 h-5 text-accent-foreground" /></div>
          <span className="font-display font-bold text-xl">TutorShield</span>
        </Link>
        <div className="relative z-10 max-w-md">
          <h1 className="text-4xl font-bold leading-tight">Trust, transparency, and accountability — built into tutoring.</h1>
          <p className="mt-4 text-primary-foreground/80">Join the platform that's setting the new standard for private tutoring.</p>
        </div>
        <div className="absolute -bottom-20 -right-20 w-96 h-96 rounded-full bg-accent/30 blur-3xl" />
      </div>

      <div className="flex items-center justify-center p-6 md:p-12 bg-background">
        <div className="w-full max-w-md">
          <Link to="/" className="md:hidden flex items-center gap-2 mb-8">
            <Shield className="w-6 h-6 text-primary" />
            <span className="font-display font-bold">TutorShield</span>
          </Link>
          <h2 className="text-3xl font-bold">{mode === "login" ? "Welcome back" : "Create your account"}</h2>
          <p className="mt-2 text-muted-foreground text-sm">
            {mode === "login" ? "Sign in to continue" : "Start in less than 2 minutes"}
          </p>

          {mode === "signup" && (
            <div className="mt-6 grid grid-cols-2 gap-3">
              {([
                { v: "parent", label: "I'm a Parent", icon: Users },
                { v: "tutor", label: "I'm a Tutor", icon: GraduationCap },
              ] as const).map((r) => {
                const active = role === r.v;
                return (
                  <button key={r.v} type="button" onClick={() => setRole(r.v)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${active ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}>
                    <r.icon className={`w-5 h-5 mb-2 ${active ? "text-primary" : "text-muted-foreground"}`} />
                    <div className="font-semibold text-sm">{r.label}</div>
                  </button>
                );
              })}
            </div>
          )}

          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Ayesha Khan" />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
              {mode === "login" && <p className="text-xs text-muted-foreground">Tip: include "tutor" in email to log in as a tutor.</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
            </Button>
          </form>

          <p className="mt-6 text-sm text-center text-muted-foreground">
            {mode === "login" ? "New here?" : "Already have an account?"}{" "}
            <button onClick={() => setMode(mode === "login" ? "signup" : "login")} className="text-primary font-semibold hover:underline">
              {mode === "login" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
