import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { RequireAuth } from "@/components/AppShell";
import { tutors } from "@/lib/mock-data";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { mapTutorRow, type TutorListItem } from "@/lib/tutor-types";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Shield, Star, MapPin, Loader2 } from "lucide-react";

export const Route = createFileRoute("/tutors/")({
  head: () => ({ meta: [{ title: "Find tutors — TutorShield" }] }),
  component: () => <RequireAuth><TutorsList /></RequireAuth>,
});

function TutorsList() {
  const [q, setQ] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [tutorsList, setTutorsList] = useState<TutorListItem[]>(tutors);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
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

      if (!error && data) {
        setTutorsList(data.map((row) => mapTutorRow(row)));
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
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" />{t.city}</p>
                    <div className="flex items-center gap-1 mt-1 text-sm">
                      <Star className="w-3.5 h-3.5 fill-warning text-warning" />
                      <span className="font-medium">{t.rating}</span>
                      <span className="text-muted-foreground text-xs">({t.reviews})</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-4">
                  {t.subjects.map((s) => <Badge key={s} variant="secondary">{s}</Badge>)}
                </div>
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                  <span className="text-sm text-muted-foreground">{t.experience} yrs exp</span>
                  <span className="font-semibold">${t.hourlyRate}<span className="text-xs text-muted-foreground font-normal">/hr</span></span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
      {filtered.length === 0 && <p className="text-center text-muted-foreground py-12">No tutors match your filters.</p>}
    </div>
  );
}
