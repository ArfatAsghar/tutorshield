import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
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

  // Proctoring States
  const [violations, setViolations] = useState(0);
  const [isFullscreenExited, setIsFullscreenExited] = useState(false);
  const [timeLeft, setTimeLeft] = useState(180); // 3 minutes total
  const [proctorStatus, setProctorStatus] = useState<"active" | "failed_proctoring" | "failed_timeout">("active");
  const [proctorMessage, setProctorMessage] = useState("");
  
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

  // Fullscreen helper functions
  const enterFullscreen = async () => {
    try {
      const element = document.documentElement;
      if (element.requestFullscreen) {
        await element.requestFullscreen();
      }
      setIsFullscreenExited(false);
    } catch (err) {
      console.warn("Failed to enter fullscreen:", err);
    }
  };

  const startExam = async () => {
    const finalSubject = activeSubject.trim();
    if (!finalSubject) {
      toast.error("Please specify a subject for the competency exam.");
      return;
    }

    setGenerating(true);
    try {
      const data = await generateSubjectExam({ data: { subject: finalSubject } });
      if (data && data.length > 0) {
        setQuestions(data);
        setViolations(0);
        setIsFullscreenExited(false);
        setTimeLeft(180);
        setProctorStatus("active");
        setProctorMessage("");
        setStarted(true);
        setI(0);
        setAnswers([]);
        setDone(false);

        // Wait brief millisecond before entering fullscreen
        setTimeout(async () => {
          await enterFullscreen();
        }, 150);
      } else {
        throw new Error("No questions generated.");
      }
    } catch (err: any) {
      toast.error("Failed to generate dynamic exam: " + (err.message || err));
    } finally {
      setGenerating(false);
    }
  };

  // Fullscreen change listener
  useEffect(() => {
    if (!started || done || proctorStatus !== "active") return;

    const handleFullscreenChange = () => {
      const isFullscreen = !!document.fullscreenElement;
      if (!isFullscreen) {
        setIsFullscreenExited(true);
        setViolations((prev) => {
          const next = prev + 1;
          if (next >= 2) {
            setProctorStatus("failed_proctoring");
            setProctorMessage("Exited fullscreen mode multiple times.");
            document.exitFullscreen().catch(() => {});
          }
          return next;
        });
        toast.warning("Fullscreen exited! This is a proctoring violation.");
      } else {
        setIsFullscreenExited(false);
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [started, done, proctorStatus]);

  // Tab switch & focus lost listener
  useEffect(() => {
    if (!started || done || proctorStatus !== "active") return;

    const handleFocusLost = () => {
      if (document.hidden || !document.hasFocus()) {
        setViolations((prev) => {
          const next = prev + 1;
          if (next >= 2) {
            setProctorStatus("failed_proctoring");
            setProctorMessage("Switched tabs or browser window lost focus.");
            document.exitFullscreen().catch(() => {});
          }
          return next;
        });
        toast.error("Security warning: Switched tabs or lost window focus!");
      }
    };

    document.addEventListener("visibilitychange", handleFocusLost);
    window.addEventListener("blur", handleFocusLost);
    return () => {
      document.removeEventListener("visibilitychange", handleFocusLost);
      window.removeEventListener("blur", handleFocusLost);
    };
  }, [started, done, proctorStatus]);

  // Keyboard and context menu block listeners (No copy/paste/inspector)
  useEffect(() => {
    if (!started || done || proctorStatus !== "active") return;

    const preventKeys = (e: KeyboardEvent) => {
      const isCtrl = e.ctrlKey || e.metaKey;
      if (
        (isCtrl && ["c", "v", "x", "u", "s"].includes(e.key.toLowerCase())) ||
        e.key === "F12" ||
        (isCtrl && e.shiftKey && e.key.toLowerCase() === "i")
      ) {
        e.preventDefault();
        toast.error("Copy-paste and source inspection shortcuts are disabled during the exam.");
      }
    };

    const preventContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      toast.error("Right-click is disabled to protect test integrity.");
    };

    const preventSelection = (e: Event) => {
      e.preventDefault();
    };

    window.addEventListener("keydown", preventKeys);
    window.addEventListener("contextmenu", preventContextMenu);
    window.addEventListener("selectstart", preventSelection);
    return () => {
      window.removeEventListener("keydown", preventKeys);
      window.removeEventListener("contextmenu", preventContextMenu);
      window.removeEventListener("selectstart", preventSelection);
    };
  }, [started, done, proctorStatus]);

  // Countdown timer effect
  useEffect(() => {
    if (!started || done || proctorStatus !== "active") return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setProctorStatus("failed_timeout");
          setProctorMessage("Time expired.");
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [started, done, proctorStatus, answers, i, questions]);

  const completeExam = async (finalAnswers: number[]) => {
    const score = finalAnswers.reduce((s, a, idx) => s + (a === questions[idx].answer ? 1 : 0), 0);
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
    document.exitFullscreen().catch(() => {});
  };

  const handleAutoSubmit = () => {
    const filledAnswers = [...answers];
    while (filledAnswers.length < questions.length) {
      filledAnswers.push(-1);
    }
    completeExam(filledAnswers);
  };

  const submit = async (choice: number) => {
    const next = [...answers, choice];
    setAnswers(next);
    if (i + 1 < questions.length) {
      setI(i + 1);
    } else {
      await completeExam(next);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // 1. Loading AI exam generation state
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
            Gemini is composing 5 custom competency questions for <span className="font-semibold text-foreground">"{activeSubject}"</span>...
          </p>
        </div>
      </div>
    );
  }

  // 2. Fullscreen warning blocker overlay
  if (started && isFullscreenExited && proctorStatus === "active") {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md text-white p-6 select-none">
        <div className="max-w-md text-center space-y-6">
          <AlertTriangle className="w-16 h-16 text-warning mx-auto animate-bounce" />
          <h2 className="text-3xl font-bold">Fullscreen Mode Required</h2>
          <p className="text-gray-300 text-sm leading-relaxed">
            The proctoring system has detected that you exited fullscreen mode. Leaving fullscreen mode, resizing the browser, or switching windows is a security violation.
          </p>
          <div className="bg-white/10 p-4 rounded-xl border border-white/20">
            <p className="text-sm font-semibold">Warnings: {violations} / 2</p>
            <p className="text-xs text-gray-400 mt-1">If you reach 2 warnings, your exam will be terminated immediately.</p>
          </div>
          <Button size="lg" className="w-full bg-primary text-primary-foreground font-semibold shadow-emerald" onClick={enterFullscreen}>
            Re-enter Fullscreen
          </Button>
        </div>
      </div>
    );
  }

  // 3. Proctoring failure / Timeout terminated screen
  if (proctorStatus === "failed_proctoring" || proctorStatus === "failed_timeout") {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="border-destructive/40 bg-destructive/5 overflow-hidden">
          <div className="bg-destructive text-destructive-foreground p-8 text-center space-y-3">
            <XCircle className="w-16 h-16 mx-auto animate-pulse" />
            <h1 className="text-3xl font-bold">Exam Terminated</h1>
            <p className="text-sm text-destructive-foreground/80">Proctoring Verification Failed</p>
          </div>
          <CardContent className="pt-8 text-center space-y-6 pb-10">
            <div className="max-w-sm mx-auto space-y-2">
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Reason</p>
              <p className="text-lg font-medium text-foreground">{proctorMessage || "Security violation detected during exam."}</p>
            </div>
            
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              To ensure tutoring quality and test integrity, all verified badges require completing the competency exam without leaving fullscreen mode, switching tabs, or losing window focus.
            </p>

            <div className="flex justify-center gap-4 pt-4">
              <Button variant="outline" onClick={() => { setStarted(false); setProctorStatus("active"); setViolations(0); }}>
                Try Again
              </Button>
              <Button onClick={() => navigate({ to: "/dashboard" })}>
                Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 4. Completed exam results screen
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

  // 5. Initial start setup screen
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
          <CardHeader><CardTitle>Proctored Exam Rules</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-start gap-3"><Clock className="w-5 h-5 text-primary shrink-0 mt-0.5" /><div><p className="font-medium">5 dynamic questions, 3 minutes total</p><p className="text-muted-foreground">Ticking countdown timer. Failure to complete on time triggers auto-submission.</p></div></div>
            <div className="flex items-start gap-3"><Shield className="w-5 h-5 text-accent shrink-0 mt-0.5" /><div><p className="font-medium">Strict Proctoring Enabled</p><p className="text-muted-foreground">Fullscreen mode is required. Leaving fullscreen, switching tabs, or losing window focus twice terminates the exam immediately.</p></div></div>
            <div className="flex items-start gap-3"><CheckCircle2 className="w-5 h-5 text-accent shrink-0 mt-0.5" /><div><p className="font-medium">Security Safeguards</p><p className="text-muted-foreground">Text copying, text selection, keyboard shortcuts, and right-click options are disabled.</p></div></div>
          </CardContent>
        </Card>
        <Button size="lg" className="w-full shadow-emerald" onClick={startExam}>Start exam</Button>
      </div>
    );
  }

  // 6. Active exam question screen
  const q = questions[i];
  return (
    <div className="max-w-2xl mx-auto space-y-6 select-none">
      {/* Proctoring status bar */}
      <div className="flex justify-between items-center bg-muted/65 border border-border p-3.5 rounded-xl text-xs">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Shield className="w-4 h-4 text-accent" />
          <span>Proctoring Active</span>
        </div>
        <div className="flex items-center gap-4">
          <span className={`font-semibold flex items-center gap-1 ${timeLeft < 30 ? "text-destructive animate-pulse" : timeLeft < 60 ? "text-warning" : "text-muted-foreground"}`}>
            <Clock className="w-3.5 h-3.5" />
            Time remaining: {formatTime(timeLeft)}
          </span>
          <span className={`font-semibold ${violations > 0 ? "text-warning animate-pulse" : "text-muted-foreground"}`}>
            Warnings: {violations}/2
          </span>
        </div>
      </div>

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
