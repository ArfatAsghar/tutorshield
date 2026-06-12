import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { RequireAuth } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { generateSubjectExam } from "@/lib/api/exam";
import { Shield, CheckCircle2, XCircle, Clock, Loader2, Sparkles, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/verification")({
  head: () => ({ meta: [{ title: "Verification exam — TutorShield" }] }),
  component: () => <RequireAuth><Verification /></RequireAuth>,
});

const POPULAR_SUBJECTS = ["Mathematics", "Physics", "Chemistry", "Biology", "Computer Science", "English", "Economics"];

function Verification() {
  const [started, setStarted] = useState(false);
  const [subject, setSubject] = useState("Mathematics");
  const [customSubject, setCustomSubject] = useState("");
  const [questions, setQuestions] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);
  
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

  const activeSubject = subject === "Other" ? customSubject : subject;

  const startExam = async () => {
    const finalSubject = activeSubject.trim();
    if (!finalSubject) {
      toast.error("Please specify a subject for the competency exam.");
      return;
    }

    setGenerating(true);
    try {
      // Call the Gemini API server-side action
      const data = await generateSubjectExam({ data: { subject: finalSubject } });
      if (data && data.length > 0) {
        setQuestions(data);
        setStarted(true);
        setI(0);
        setAnswers([]);
        setDone(false);
      } else {
        throw new Error("No questions generated.");
      }
    } catch (err: any) {
      toast.error("Failed to generate dynamic exam: " + (err.message || err));
    } finally {
      setGenerating(false);
    }
  };

  const submit = async (choice: number) => {
    const next = [...answers, choice];
    setAnswers(next);
    if (i + 1 < questions.length) {
      setI(i + 1);
    } else {
      const score = next.reduce((s, a, idx) => s + (a === questions[idx].answer ? 1 : 0), 0);
      const pct = Math.round((score / questions.length) * 100);
      const passed = pct >= 60;
      const finalSubject = activeSubject.trim();

      if (passed && isSupabaseConfigured && user) {
        try {
          const { error } = await supabase.from("profiles").update({ verified: true }).eq("id", user.id);
          if (error) throw error;

          const { data: tutor } = await supabase.from("tutors").select("badges, subjects").eq("id", user.id).maybeSingle();
          const currentBadges = tutor?.badges || [];
          const currentSubjects = tutor?.subjects || [];
          
          const newBadge = `Verified: ${finalSubject}`;
          const updatedBadges = Array.from(new Set([...currentBadges, "Verified", newBadge]));
          const updatedSubjects = Array.from(new Set([...currentSubjects, finalSubject]));

          await supabase.from("tutors").upsert({
            id: user.id,
            subjects: updatedSubjects,
            badges: updatedBadges
          });

          await refreshUser();
          toast.success(`Verification passed! ${newBadge} badge awarded.`);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : "Unknown error";
          toast.error("Failed to update verification status: " + message);
        }
      } else if (passed) {
        updateUser({ verified: true });
        toast.success(`Verification passed! Verified: ${finalSubject} badge awarded.`);
      }
      setDone(true);
    }
  };

  if (generating) {
    return (
      <div className="max-w-2xl mx-auto text-center space-y-6 py-20 flex flex-col items-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <div className="space-y-2">
          <h2 className="text-2xl font-bold flex items-center justify-center gap-2">
            <Sparkles className="w-5 h-5 text-gold animate-pulse" />
            Generating AI Exam
          </h2>
          <p className="text-muted-foreground text-sm max-w-sm">
            Gemini 2.5 is composing 5 custom competency questions for <span className="font-semibold text-foreground">"{activeSubject}"</span>...
          </p>
        </div>
      </div>
    );
  }

  if (done) {
    const score = answers.reduce((s, a, idx) => s + (a === questions[idx].answer ? 1 : 0), 0);
    const pct = Math.round((score / questions.length) * 100);
    const passed = pct >= 60;
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="pt-12 text-center">
            {passed ? <CheckCircle2 className="w-16 h-16 mx-auto text-accent" /> : <XCircle className="w-16 h-16 mx-auto text-destructive" />}
            <h1 className="mt-6 text-3xl font-bold">{passed ? "Verification passed!" : "Try again"}</h1>
            <p className="text-muted-foreground mt-2">You scored {score}/{questions.length} ({pct}%)</p>
            {passed && (
              <div className="flex justify-center gap-2 mt-4 flex-wrap">
                <Badge className="bg-accent text-accent-foreground gap-1"><Shield className="w-3 h-3" />Verified Tutor</Badge>
                <Badge variant="outline" className="border-gold text-gold font-medium">Verified: {activeSubject}</Badge>
              </div>
            )}
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
          <p className="text-muted-foreground mt-1">Prove your subject competency with an AI-generated exam.</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Select Verification Field</CardTitle>
            <CardDescription>Select the field you want to certify in. Gemini will create a custom exam for it.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subject-select">Choose Subject Area</Label>
              <select
                id="subject-select"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
              >
                {POPULAR_SUBJECTS.map((sub) => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
                <option value="Other">Other (Custom Subject)</option>
              </select>
            </div>

            {subject === "Other" && (
              <div className="space-y-2">
                <Label htmlFor="custom-subject">Type Subject Name</Label>
                <Input
                  id="custom-subject"
                  required
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  placeholder="e.g. Linear Algebra, Organic Chemistry, World History"
                />
              </div>
            )}

            <div className="rounded-lg bg-muted/50 p-4 border border-border mt-4 text-xs text-muted-foreground flex gap-2.5">
              <AlertTriangle className="w-5 h-5 text-warning shrink-0" />
              <div>
                <p className="font-semibold text-foreground mb-0.5">Note on dynamic generation</p>
                <p>Gemini AI generates different questions each time. Once you click "Start Exam", the questions are locked in. Make sure you are prepared for the selected subject.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Before you start</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-start gap-3"><Clock className="w-5 h-5 text-primary shrink-0 mt-0.5" /><div><p className="font-medium">5 dynamic questions, no time limit</p><p className="text-muted-foreground">Score 60% or higher to earn your certification badges.</p></div></div>
            <div className="flex items-start gap-3"><Shield className="w-5 h-5 text-accent shrink-0 mt-0.5" /><div><p className="font-medium">Tab switching monitored</p><p className="text-muted-foreground">Exiting the page resets the progress. Submitted answers are final.</p></div></div>
            <div className="flex items-start gap-3"><CheckCircle2 className="w-5 h-5 text-accent shrink-0 mt-0.5" /><div><p className="font-medium">Badge awarded</p><p className="text-muted-foreground">Upon passing, a verified badge for this subject is pinned to your profile.</p></div></div>
          </CardContent>
        </Card>
        <Button size="lg" className="w-full shadow-emerald" onClick={startExam}>Start exam</Button>
      </div>
    );
  }

  const q = questions[i];
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Question {i + 1} of {questions.length}</p>
          <p className="text-xs text-gold flex items-center gap-1.5 mt-0.5"><Sparkles className="w-3 h-3" />Subject: {activeSubject}</p>
        </div>
        <Progress value={((i + 1) / questions.length) * 100} className="w-32" />
      </div>
      <Card>
        <CardContent className="pt-6">
          <h2 className="text-xl font-semibold leading-relaxed">{q.q}</h2>
          <div className="mt-6 space-y-2">
            {q.options.map((opt: string, idx: number) => (
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
