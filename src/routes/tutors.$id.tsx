import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { RequireAuth } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
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
  const { user } = useAuth();
  const [tutor, setTutor] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Booking states
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [bookingSubject, setBookingSubject] = useState("");
  const [bookingDate, setBookingDate] = useState(tomorrowStr);
  const [bookingTime, setBookingTime] = useState("15:00");
  const [bookingLoading, setBookingLoading] = useState(false);

  useEffect(() => {
    if (tutor && tutor.subjects?.length > 0 && !bookingSubject) {
      setBookingSubject(tutor.subjects[0]);
    }
  }, [tutor]);

  const handleBookSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("You must be logged in to book a session.");
      return;
    }
    if (user.role !== "parent") {
      toast.error("Only parents can request sessions.");
      return;
    }
    if (!bookingSubject) {
      toast.error("Please select a subject.");
      return;
    }
    if (!bookingDate) {
      toast.error("Please select a date.");
      return;
    }
    if (!bookingTime) {
      toast.error("Please select a time.");
      return;
    }

    setBookingLoading(true);
    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase
          .from("bookings")
          .insert({
            parent_id: user.id,
            tutor_id: tutor.id,
            subject: bookingSubject,
            booking_date: bookingDate,
            booking_time: bookingTime,
            status: "Pending",
          });

        if (error) throw error;
        toast.success("Session request submitted successfully!");
        setIsBookingOpen(false);
      } else {
        toast.success("Demo: Session request submitted successfully!");
        setIsBookingOpen(false);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to submit request.");
    } finally {
      setBookingLoading(false);
    }
  };

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
              <Button size="lg" className="w-full md:w-auto" onClick={() => setIsBookingOpen(true)}><Calendar className="w-4 h-4 mr-2" />Book session</Button>
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

      {/* Booking Dialog Modal */}
      {isBookingOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
          <Card className="w-full max-w-md shadow-glow relative border-border/80 bg-card/90 backdrop-blur animate-in slide-in-from-bottom-4 duration-300">
            <CardHeader>
              <CardTitle className="text-xl">Request Tutoring Session</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">Submit a schedule request for {tutor.name}. The tutor will review and approve it.</p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleBookSession} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Subject</label>
                  <select
                    value={bookingSubject}
                    onChange={(e) => setBookingSubject(e.target.value)}
                    className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                  >
                    {tutor.subjects.map((sub: string) => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date</label>
                    <input
                      type="date"
                      min={new Date().toISOString().split("T")[0]}
                      value={bookingDate}
                      onChange={(e) => setBookingDate(e.target.value)}
                      className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Time</label>
                    <input
                      type="time"
                      value={bookingTime}
                      onChange={(e) => setBookingTime(e.target.value)}
                      className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsBookingOpen(false)}
                    disabled={bookingLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="shadow-emerald"
                    disabled={bookingLoading}
                  >
                    {bookingLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit Request"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
