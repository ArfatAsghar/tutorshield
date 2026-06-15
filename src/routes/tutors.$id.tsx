import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { RequireAuth } from "@/components/AppShell";
import { mapTutorRow } from "@/lib/tutor-types";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Star, MapPin, Calendar, CheckCircle2, ArrowLeft, Loader2, MessageSquare } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/tutors/$id")({
  head: () => ({ meta: [{ title: "Tutor profile — TutorShield" }] }),
  component: () => <RequireAuth><TutorDetail /></RequireAuth>,
});

function TutorDetail() {
  const { id } = useParams({ from: "/tutors/$id" });
  const [tutor, setTutor] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from("tutors")
          .select(`
            id, subjects, rating, reviews, hourly_rate, city, experience, bio, badges,
            profiles (name, avatar, verified)
          `)
          .eq("id", id)
          .single();

        if (data && !error) {
          setTutor(mapTutorRow(data));
        } else {
          setTutor(null);
        }

        // Load reviews for this tutor
        const { data: revs } = await supabase
          .from("reviews")
          .select("*")
          .eq("tutor_id", id)
          .order("created_at", { ascending: false });

        if (revs && revs.length > 0) {
          setReviews(revs.map((r: any) => ({
            id: r.id,
            parent: r.parent_name || "Anonymous",
            rating: r.rating,
            date: new Date(r.created_at).toLocaleDateString(),
            text: r.text,
          })));
        } else {
          setReviews([]);
        }
      } else {
        setTutor(null);
        setReviews([]);
      }
      setLoading(false);
    };
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!tutor) return <p>Tutor not found. <Link to="/tutors" className="text-primary underline">Back</Link></p>;

  return (
    <div className="space-y-6">
      <Link to="/tutors" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Back to tutors
      </Link>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-6">
            <img src={tutor.avatar} alt="" className="w-28 h-28 rounded-2xl bg-muted" />
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold">{tutor.name}</h1>
                {tutor.verified && <Badge className="bg-accent text-accent-foreground gap-1"><Shield className="w-3 h-3" />Verified</Badge>}
              </div>
              <p className="text-muted-foreground mt-1 flex items-center gap-1"><MapPin className="w-4 h-4" />{tutor.city} · {tutor.experience} years experience</p>
              <div className="flex items-center gap-1 mt-2">
                <Star className="w-4 h-4 fill-warning text-warning" />
                <span className="font-semibold">{tutor.rating}</span>
                <span className="text-muted-foreground text-sm">({tutor.reviews} reviews)</span>
              </div>
              <p className="mt-4 text-sm">{tutor.bio}</p>
              <div className="flex flex-wrap gap-2 mt-4">
                {tutor.subjects.map((s: string) => <Badge key={s} variant="secondary">{s}</Badge>)}
              </div>
            </div>
            <div className="md:text-right flex flex-col items-stretch md:items-end gap-2.5">
              <div className="text-3xl font-bold">${tutor.hourlyRate}<span className="text-base text-muted-foreground font-normal">/hr</span></div>
              <Button size="lg" className="w-full md:w-auto" onClick={() => toast.success("Session request sent!")}><Calendar className="w-4 h-4 mr-2" />Book session</Button>
              <Link to="/messages" search={{ tutorId: tutor.id }} className="w-full md:w-auto">
                <Button size="lg" variant="outline" className="w-full">
                  <MessageSquare className="w-4 h-4 mr-2" /> Message tutor
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-3 gap-4">
        {tutor.badges.map((b: string) => (
          <Card key={b}><CardContent className="pt-6 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-accent" />
            <span className="font-medium text-sm">{b}</span>
          </CardContent></Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Parent reviews</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {reviews.length === 0 && <p className="text-muted-foreground text-sm">No reviews yet.</p>}
          {reviews.map((r) => (
            <div key={r.id} className="border-b border-border last:border-0 pb-4 last:pb-0">
              <div className="flex items-center justify-between">
                <div className="font-medium">{r.parent}</div>
                <span className="text-xs text-muted-foreground">{r.date}</span>
              </div>
              <div className="flex gap-0.5 my-1">
                {[...Array(5)].map((_, i) => <Star key={i} className={`w-3.5 h-3.5 ${i < r.rating ? "fill-warning text-warning" : "text-muted"}`} />)}
              </div>
              <p className="text-sm text-muted-foreground">{r.text}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
