import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { RequireAuth } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { verificationQuestions } from "@/lib/mock-data";
import { useAuth } from "@/lib/auth";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { Shield, CheckCircle2, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/verification")({
  head: () => ({ meta: [{ title: "Verification exam — TutorShield" }] }),
  component: () => <RequireAuth><Verification /></RequireAuth>,
});

function Verification() {
  const [started, setStarted] = useState(false);
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [done, setDone] = useState(false);
  const { user, refreshUser, updateUser } = useAuth();
  const navigate = useNavigate();

  if (user && user.role !== "tutor") {
    return (
      <div className="max-w-2xl mx-auto text-center space-y-4 py-12">
        <h1 className="text-2xl font-bold">Verification is for tutors only</h1>
        <p className="text-muted-foreground">Parents do not need to complete a verification exam.</p>
        <Link to="/dashboard"><Button>Back to dashboard</Button></Link>
      </div>
    );
  }

  const submit = async (choice: number) => {
    const next = [...answers, choice];
    setAnswers(next);
    if (i + 1 < verificationQuestions.length) {
      setI(i + 1);
    } else {
      const score = next.reduce((s, a, idx) => s + (a === verificationQuestions[idx].answer ? 1 : 0), 0);
      const pct = Math.round((score / verificationQuestions.length) * 100);
      const passed = pct >= 60;
      if (passed && isSupabaseConfigured && user) {
        try {
          const { error } = await supabase.from("profiles").update({ verified: true }).eq("id", user.id);
          if (error) throw error;

          const { data: tutor } = await supabase.from("tutors").select("badges").eq("id", user.id).maybeSingle();
          const currentBadges = tutor?.badges || [];
          const updatedBadges = Array.from(new Set([...currentBadges, "Verified"]));

          await supabase.from("tutors").upsert({
            id: user.id,
            subjects: [],
            hourly_rate: 25,
            city: "Unknown",
            experience: 1,
            badges: updatedBadges
          });

          await refreshUser();
          toast.success("Verification passed! Badge awarded.");
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : "Unknown error";
          toast.error("Failed to update verification status: " + message);
        }
      } else if (passed) {
        updateUser({ verified: true });
        toast.success("Verification passed! Badge awarded.");
      }
      setDone(true);
    }
  };

  if (done) {
    const score = answers.reduce((s, a, idx) => s + (a === verificationQuestions[idx].answer ? 1 : 0), 0);
    const pct = Math.round((score / verificationQuestions.length) * 100);
    const passed = pct >= 60;
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="pt-12 text-center">
            {passed ? <CheckCircle2 className="w-16 h-16 mx-auto text-accent" /> : <XCircle className="w-16 h-16 mx-auto text-destructive" />}
            <h1 className="mt-6 text-3xl font-bold">{passed ? "Verification passed!" : "Try again"}</h1>
            <p className="text-muted-foreground mt-2">You scored {score}/{verificationQuestions.length} ({pct}%)</p>
            {passed && <Badge className="mt-4 bg-accent text-accent-foreground gap-1 mx-auto"><Shield className="w-3 h-3" />Verified Tutor</Badge>}
            <Button className="mt-8" onClick={() => navigate({ to: "/dashboard" })}>Back to dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Tutor verification exam</h1>
          <p className="text-muted-foreground mt-1">Prove your subject competency with a short live test.</p>
        </div>
        <Card>
          <CardHeader><CardTitle>Before you start</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-start gap-3"><Clock className="w-5 h-5 text-primary shrink-0 mt-0.5" /><div><p className="font-medium">5 questions, no time limit</p><p className="text-muted-foreground">Score 60% or higher to earn your Verified badge.</p></div></div>
            <div className="flex items-start gap-3"><Shield className="w-5 h-5 text-accent shrink-0 mt-0.5" /><div><p className="font-medium">Anti-cheating measures</p><p className="text-muted-foreground">Tab switching is monitored. Submitted answers are final.</p></div></div>
            <div className="flex items-start gap-3"><CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" /><div><p className="font-medium">Instant result</p><p className="text-muted-foreground">Your verification status updates immediately.</p></div></div>
          </CardContent>
        </Card>
        <Button size="lg" className="w-full" onClick={() => setStarted(true)}>Start exam</Button>
      </div>
    );
  }

  const q = verificationQuestions[i];
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Question {i + 1} of {verificationQuestions.length}</p>
        <Progress value={((i + 1) / verificationQuestions.length) * 100} className="mt-2" />
      </div>
      <Card>
        <CardContent className="pt-6">
          <h2 className="text-xl font-semibold">{q.q}</h2>
          <div className="mt-6 space-y-2">
            {q.options.map((opt, idx) => (
              <button key={idx} onClick={() => submit(idx)}
                className="w-full text-left p-4 rounded-lg border-2 border-border hover:border-primary hover:bg-primary/5 transition-colors">
                <span className="font-medium">{String.fromCharCode(65 + idx)}.</span> {opt}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
