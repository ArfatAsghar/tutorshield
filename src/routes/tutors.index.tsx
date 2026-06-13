import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { RequireAuth } from "@/components/AppShell";
import { tutors as mockTutors } from "@/lib/mock-data";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { TutorListItem } from "@/lib/tutor-types";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Shield, Star, MapPin, Loader2, UserX } from "lucide-react";

export const Route = createFileRoute("/tutors/")({
  head: () => ({ meta: [{ title: "Find tutors — TutorShield" }] }),
  component: () => <RequireAuth><TutorsList /></RequireAuth>,
});

function TutorsList() {
  const [q, setQ] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [tutorsList, setTutorsList] = useState<TutorListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      if (isSupabaseConfigured) {
        try {
          // First: try to load from tutors table joined with profiles
          const { data: tutorRows, error: tutorErr } = await supabase
            .from("tutors")
            .select(`
              id,
              subjects,
              rating,
              reviews,
              hourly_rate,
              city,
              experience,
              bio,
              badges,
              profiles (name, avatar, verified)
            `);

          if (!tutorErr && tutorRows && tutorRows.length > 0) {
            const mapped: TutorListItem[] = tutorRows.map((row: any) => {
              const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
              return {
                id: row.id,
                name: profile?.name || "Unknown Tutor",
                avatar: profile?.avatar || `https://api.dicebear.com/9.x/notionists/svg?seed=${row.id}`,
                verified: profile?.verified || false,
                subjects: row.subjects || [],
                rating: Number(row.rating) || 5.0,
                reviews: Number(row.reviews) || 0,
                hourlyRate: Number(row.hourly_rate) || 25,
                city: row.city || "Lahore",
                experience: Number(row.experience) || 1,
                bio: row.bio || "",
                badges: row.badges || [],
              };
            });
            setTutorsList(mapped);
          } else {
            // Fallback: query profiles directly for tutor role users
            const { data: profiles, error: profErr } = await supabase
              .from("profiles")
              .select("id, name, avatar, verified")
              .eq("role", "tutor");

            if (!profErr && profiles && profiles.length > 0) {
              const mapped: TutorListItem[] = profiles.map((p: any) => ({
                id: p.id,
                name: p.name || "Tutor",
                avatar: p.avatar || `https://api.dicebear.com/9.x/notionists/svg?seed=${p.name}`,
                verified: p.verified || false,
                subjects: [],
                rating: 5.0,
                reviews: 0,
                hourlyRate: 25,
                city: "Lahore",
                experience: 1,
                bio: "",
                badges: [],
              }));
              setTutorsList(mapped);
            } else {
              // Nothing in DB yet — show empty state (no mock data)
              setTutorsList([]);
            }
          }
        } catch (err) {
          console.error("Failed to load tutors:", err);
          setTutorsList([]);
        }
      } else {
        // Offline sandbox: show mock data
        setTutorsList(mockTutors);
      }

      setLoading(false);
    };

    load();
  }, []);

  const filtered = tutorsList.filter((t) => {
    if (verifiedOnly && !t.verified) return false;
    if (!q) return true;
    const s = q.toLowerCase();
    return (
      t.name.toLowerCase().includes(s) ||
      t.subjects.some((sub) => sub.toLowerCase().includes(s)) ||
      t.city.toLowerCase().includes(s)
    );
  });

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
        <h1 className="text-3xl font-bold">Find a tutor</h1>
        <p className="text-muted-foreground mt-1">Every verified tutor has passed a live subject competency exam.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by subject, name, or city" className="pl-10" />
        </div>
        <Button variant={verifiedOnly ? "default" : "outline"} onClick={() => setVerifiedOnly(!verifiedOnly)}>
          <Shield className="w-4 h-4 mr-2" /> Verified only
        </Button>
      </div>

      {tutorsList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
          <UserX className="w-12 h-12 text-muted-foreground/40" />
          <p className="text-lg font-medium">No tutors registered yet</p>
          <p className="text-sm text-center max-w-xs">
            Tutors can sign up and register their profiles. Once registered, they'll appear here.
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((t) => (
            <Link key={t.id} to="/tutors/$id" params={{ id: t.id }}>
              <Card className="hover:shadow-glow transition-shadow cursor-pointer h-full">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <img src={t.avatar} alt="" className="w-14 h-14 rounded-full bg-muted" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-semibold truncate">{t.name}</h3>
                        {t.verified && <Shield className="w-4 h-4 text-accent shrink-0" />}
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" />{t.city}
                      </p>
                      <div className="flex items-center gap-1 mt-1 text-sm">
                        <Star className="w-3.5 h-3.5 fill-warning text-warning" />
                        <span className="font-medium">{t.rating}</span>
                        <span className="text-muted-foreground text-xs">({t.reviews} reviews)</span>
                      </div>
                    </div>
                  </div>
                  {t.subjects.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 mt-4">
                      {t.subjects.map((s) => <Badge key={s} variant="secondary">{s}</Badge>)}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground/60 mt-3 italic">Subjects not yet set</p>
                  )}
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                    <span className="text-sm text-muted-foreground">{t.experience} yr{t.experience !== 1 ? "s" : ""} exp</span>
                    <span className="font-semibold">${t.hourlyRate}<span className="text-xs text-muted-foreground font-normal">/hr</span></span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
          {filtered.length === 0 && tutorsList.length > 0 && (
            <p className="col-span-full text-center text-muted-foreground py-12">No tutors match your filters.</p>
          )}
        </div>
      )}
    </div>
  );
}
