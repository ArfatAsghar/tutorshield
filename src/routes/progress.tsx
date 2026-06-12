import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { RequireAuth } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Star, FileText, TrendingUp, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/progress")({
  head: () => ({ meta: [{ title: "Progress reports — TutorShield" }] }),
  component: () => <RequireAuth><ProgressPage /></RequireAuth>,
});

function ProgressPage() {
  const { user } = useAuth();
  const isTutor = user?.role === "tutor";
  const [topic, setTopic] = useState("");
  const [studentName, setStudentName] = useState("");
  const [subject, setSubject] = useState("");
  const [rating, setRating] = useState(4);
  const [notes, setNotes] = useState("");
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    if (isSupabaseConfigured && user) {
      const { data, error } = await supabase
        .from("progress_reports")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      if (!error && data) {
        setReports(data.map((r: any) => ({
          id: r.id,
          date: new Date(r.created_at).toLocaleDateString(),
          student: r.student_name,
          subject: r.subject,
          topic: r.topic,
          rating: r.rating,
          notes: r.notes,
        })));
      }
    } else {
      setReports([
        { id: "p1", date: "2026-06-05", student: "Zain", subject: "Mathematics", topic: "Quadratic Equations", rating: 4, notes: "Strong grasp of factoring. Needs practice with the quadratic formula." },
        { id: "p2", date: "2026-06-03", student: "Zain", subject: "Mathematics", topic: "Linear Functions", rating: 5, notes: "Excellent session. Completed all homework with full understanding." },
        { id: "p3", date: "2026-06-01", student: "Zain", subject: "Mathematics", topic: "Polynomials", rating: 3, notes: "Distracted today. Recommend a shorter session next time." },
      ]);
    }
    setLoading(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (isSupabaseConfigured && user) {
        const { error } = await supabase.from("progress_reports").insert({
          tutor_id: user.id,
          student_name: studentName || "Student",
          subject: subject || "General",
          topic,
          rating,
          notes,
        });
        if (error) throw error;
        toast.success("Progress report submitted");
        setTopic(""); setNotes(""); setRating(4); setStudentName(""); setSubject("");
        loadReports();
      } else {
        const newReport = {
          id: crypto.randomUUID(),
          date: new Date().toLocaleDateString(),
          student: studentName || "Student",
          subject: subject || "General",
          topic,
          rating,
          notes,
        };
        setReports((prev) => [newReport, ...prev]);
        toast.success("Progress report submitted");
        setTopic(""); setNotes(""); setRating(4); setStudentName(""); setSubject("");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to submit report");
    } finally {
      setSubmitting(false);
    }
  };

  const reportsThisMonth = reports.filter((r) => {
    const d = new Date(r.date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const avgRating = reports.length > 0
    ? (reports.reduce((s, r) => s + (r.rating || 0), 0) / reports.length).toFixed(1)
    : "—";

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Progress reports</h1>
        <p className="text-muted-foreground mt-1">{isTutor ? "Submit daily session notes so parents see real progress." : "Track your child's learning trajectory across every session."}</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { label: "Reports this month", value: String(reportsThisMonth), icon: FileText },
          { label: "Avg. session rating", value: `${avgRating}★`, icon: Star },
          { label: "Total reports", value: String(reports.length), icon: TrendingUp },
        ].map((s) => (
          <Card key={s.label}><CardContent className="pt-6">
            <s.icon className="w-5 h-5 mb-2 text-primary" />
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
          </CardContent></Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {isTutor && (
          <Card className="lg:col-span-1">
            <CardHeader><CardTitle>New report</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={submit} className="space-y-3">
                <div className="space-y-1.5"><Label>Student name</Label><Input required value={studentName} onChange={(e) => setStudentName(e.target.value)} placeholder="Zain" /></div>
                <div className="space-y-1.5"><Label>Subject</Label><Input required value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Mathematics" /></div>
                <div className="space-y-1.5"><Label>Topic covered</Label><Input required value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Quadratic equations" /></div>
                <div className="space-y-1.5">
                  <Label>Session rating</Label>
                  <div className="flex gap-1">
                    {[1,2,3,4,5].map((n) => (
                      <button key={n} type="button" onClick={() => setRating(n)}>
                        <Star className={`w-6 h-6 ${n <= rating ? "fill-warning text-warning" : "text-muted"}`} />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5"><Label>Notes</Label><Textarea rows={4} required value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What went well, what needs work…" /></div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting...</> : "Submit report"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        <Card className={isTutor ? "lg:col-span-2" : "lg:col-span-3"}>
          <CardHeader><CardTitle>Recent reports</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {reports.length === 0 && <p className="text-muted-foreground text-sm">No progress reports yet.</p>}
            {reports.map((r) => (
              <div key={r.id} className="p-4 rounded-lg border border-border">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <p className="font-semibold">{r.topic}</p>
                    <p className="text-xs text-muted-foreground">{r.student} · {r.subject} · {r.date}</p>
                  </div>
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => <Star key={i} className={`w-4 h-4 ${i < r.rating ? "fill-warning text-warning" : "text-muted"}`} />)}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-2">{r.notes}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
