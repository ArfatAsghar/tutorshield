import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { RequireAuth } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Star, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/reviews")({
  head: () => ({ meta: [{ title: "Reviews — TutorShield" }] }),
  component: () => <RequireAuth><Reviews /></RequireAuth>,
});

interface Review {
  id: string;
  parent: string;
  rating: number;
  date: string;
  text: string;
}

function Reviews() {
  const { user } = useAuth();
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [tutorId, setTutorId] = useState("");
  const [tutorsList, setTutorsList] = useState<{ id: string; name: string }[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const selectedTutor = tutorsList.find((t) => t.id === tutorId);
  const isParent = user?.role === "parent";

  useEffect(() => {
    const fetchTutors = async () => {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from("tutors")
          .select("id, profiles (name)");
        if (!error && data) {
          const mapped = data.map((t: any) => {
            const profile = Array.isArray(t.profiles) ? t.profiles[0] : t.profiles;
            return {
              id: t.id,
              name: profile?.name || "Tutor"
            };
          });
          setTutorsList(mapped);
          if (mapped.length > 0) {
            setTutorId(mapped[0].id);
          }
        }
      }
      setLoading(false);
    };
    fetchTutors();
  }, []);

  useEffect(() => {
    if (tutorId) {
      loadReviews();
    } else {
      setReviews([]);
    }
  }, [tutorId]);

  const loadReviews = async () => {
    setLoading(true);
    if (isSupabaseConfigured && tutorId) {
      const { data, error } = await supabase
        .from("reviews")
        .select("id, parent_name, rating, text, created_at")
        .eq("tutor_id", tutorId)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setReviews(
          data.map((r: { id: string; parent_name: string; rating: number; text: string; created_at: string }) => ({
            id: r.id,
            parent: r.parent_name || "Anonymous",
            rating: r.rating,
            date: new Date(r.created_at).toLocaleDateString(),
            text: r.text,
          }))
        );
      } else {
        setReviews([]);
      }
    } else {
      setReviews([]);
    }
    setLoading(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !user || !tutorId) return;

    setSubmitting(true);
    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.from("reviews").insert({
          tutor_id: tutorId,
          parent_id: user.id,
          parent_name: user.name,
          rating,
          text: text.trim(),
        });
        if (error) throw error;
        toast.success("Review submitted!");
        setText("");
        setRating(5);
        await loadReviews();
      } else {
        const newReview: Review = {
          id: crypto.randomUUID(),
          parent: user.name,
          rating,
          date: new Date().toLocaleDateString(),
          text: text.trim(),
        };
        setReviews((prev) => [newReview, ...prev]);
        toast.success("Review submitted!");
        setText("");
        setRating(5);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to submit review";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && tutorsList.length === 0) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reviews</h1>
        <p className="text-muted-foreground mt-1">Honest feedback from verified parents.</p>
      </div>

      {isParent && tutorsList.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Leave a review for {selectedTutor?.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="tutor">Tutor</Label>
                <select
                  id="tutor"
                  value={tutorId}
                  onChange={(e) => setTutorId(e.target.value)}
                  className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                >
                  {tutorsList.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" onClick={() => setRating(n)}>
                    <Star className={`w-7 h-7 ${n <= rating ? "fill-warning text-warning" : "text-muted"}`} />
                  </button>
                ))}
              </div>
              <Textarea
                rows={4}
                required
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Share your experience…"
              />
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...
                  </>
                ) : (
                  "Submit review"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {isParent && tutorsList.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground text-sm">
            No active tutors found to review.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>All reviews</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {reviews.length === 0 && <p className="text-muted-foreground text-sm">No reviews yet.</p>}
          {reviews.map((r) => (
            <div key={r.id} className="border-b border-border last:border-0 pb-4 last:pb-0">
              <div className="flex items-center justify-between">
                <div className="font-medium">{r.parent}</div>
                <span className="text-xs text-muted-foreground">{r.date}</span>
              </div>
              <div className="flex gap-0.5 my-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className={`w-3.5 h-3.5 ${i < r.rating ? "fill-warning text-warning" : "text-muted"}`} />
                ))}
              </div>
              <p className="text-sm text-muted-foreground">{r.text}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
