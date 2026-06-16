import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Shield, GraduationCap, Users, Loader2, Mail, ArrowLeft } from "lucide-react";
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
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [role, setRole] = useState<Role>("parent");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { login, signup, signInWithGoogle, resetPassword } = useAuth();
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "forgot") {
        await resetPassword(email);
        toast.success("Password reset email sent! Please check your inbox.", { duration: 8000 });
        setMode("login");
        return;
      }

      if (mode === "login") {
        const loggedIn = await login(email, password);
        toast.success("Welcome back!");
        navigate({ to: loggedIn.needsVerification ? "/verification" : loggedIn.role === "tutor" && !loggedIn.verified ? "/verification" : "/dashboard" });
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

  const handleGoogleAuth = async () => {
    setGoogleLoading(true);
    try {
      await signInWithGoogle(mode === "signup" ? role : undefined);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Google sign-in failed";
      toast.error(message);
    } finally {
      setGoogleLoading(false);
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

          {mode === "forgot" ? (
            <>
              <button onClick={() => setMode("login")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors mb-4">
                <ArrowLeft className="w-4 h-4" /> Back to sign in
              </button>
              <h2 className="text-3xl font-bold">Reset your password</h2>
              <p className="mt-2 text-muted-foreground text-sm">
                Enter your email address and we'll send you a link to reset your password.
              </p>

              <form onSubmit={submit} className="mt-6 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="reset-email">Email</Label>
                  <Input id="reset-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
                </div>
                <Button type="submit" className="w-full gap-2" size="lg" disabled={loading}>
                  {loading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
                  ) : (
                    <><Mail className="w-4 h-4" /> Send reset link</>
                  )}
                </Button>
              </form>
            </>
          ) : (
            <>
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

              {/* Google OAuth Button */}
              <div className="mt-6">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="w-full gap-3 font-medium border-border hover:bg-muted/50"
                  onClick={handleGoogleAuth}
                  disabled={googleLoading}
                >
                  {googleLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                  )}
                  {mode === "login" ? "Sign in with Google" : "Sign up with Google"}
                </Button>
              </div>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-3 text-muted-foreground tracking-wider">or continue with email</span>
                </div>
              </div>

              <form onSubmit={submit} className="space-y-4">
                {mode === "signup" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="name">Full name</Label>
                    <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Ayesha Khan" />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    {mode === "login" && (
                      <button
                        type="button"
                        onClick={() => setMode("forgot")}
                        className="text-xs text-primary hover:underline font-medium"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
                </div>
                <Button type="submit" className="w-full" size="lg" disabled={loading}>
                  {loading ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Please wait…</>
                  ) : (
                    mode === "login" ? "Sign in" : "Create account"
                  )}
                </Button>
              </form>

              <p className="mt-6 text-sm text-center text-muted-foreground">
                {mode === "login" ? "New here?" : "Already have an account?"}{" "}
                <button onClick={() => setMode(mode === "login" ? "signup" : "login")} className="text-primary font-semibold hover:underline">
                  {mode === "login" ? "Create an account" : "Sign in"}
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
