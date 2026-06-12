import { createFileRoute, Link } from "@tanstack/react-router";
import { RequireAuth } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, TrendingUp, Calendar, Users, CheckCircle2, AlertCircle, Star, Clock, Loader2, MapPin, Navigation, Compass } from "lucide-react";
import { tutors, progressReports } from "@/lib/mock-data";
import { Reveal } from "@/components/Reveal";
import { useState, useEffect } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — TutorShield" }] }),
  component: () => <RequireAuth><Dashboard /></RequireAuth>,
});

function Dashboard() {
  const { user } = useAuth();
  if (!user) return null;
  return user.role === "tutor" ? <TutorDash /> : <ParentDash />;
}

function ParentDash() {
  const { user } = useAuth();
  const [tutor, setTutor] = useState<any>(null);
  const [stats, setStats] = useState({
    activeTutors: "1",
    sessionsThisMonth: "12",
    avgProgress: "4.3★",
    nextSession: "Today 5pm",
  });
  const [recentReports, setRecentReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Geotracking states for tutor
  const [tutorLocation, setTutorLocation] = useState<{ lat: number; lng: number; updated: string } | null>(null);

  useEffect(() => {
    const loadParentData = async () => {
      setLoading(true);
      if (isSupabaseConfigured) {
        try {
          // 1. Fetch tutor list to select "Your tutor"
          const { data: tutorsData, error: tutorsErr } = await supabase
            .from("tutors")
            .select(`
              id, subjects, rating, reviews, hourly_rate, city, experience, bio, badges,
              profiles (name, avatar, verified)
            `)
            .limit(1);

          let selectedTutor = null;
          if (tutorsData && tutorsData.length > 0 && !tutorsErr) {
            const t = tutorsData[0];
            selectedTutor = {
              id: t.id,
              name: t.profiles?.name || "Tutor",
              subjects: t.subjects || [],
              rating: t.rating || 5.0,
              reviews: t.reviews || 0,
              avatar: t.profiles?.avatar || "https://api.dicebear.com/9.x/notionists/svg?seed=tutor",
              verified: t.profiles?.verified ?? false,
            };
          } else {
            selectedTutor = tutors[0];
          }
          setTutor(selectedTutor);

          // 2. Fetch progress reports
          const { data: reports, error: reportsErr } = await supabase
            .from("progress_reports")
            .select("*")
            .order("created_at", { ascending: false });

          let fetchedReports: any[] = [];
          if (reports && !reportsErr) {
            fetchedReports = reports.map((r: any) => ({
              id: r.id,
              topic: r.topic,
              date: new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
              notes: r.notes,
              rating: r.rating,
            }));
          } else {
            fetchedReports = progressReports;
          }
          setRecentReports(fetchedReports);

          // Calculate parent stats
          const uniqueTutorIds = new Set(reports?.map((r: any) => r.tutor_id).filter(Boolean) || []);
          const activeTutorsCount = uniqueTutorIds.size || (selectedTutor ? 1 : 0);

          const now = new Date();
          const reportsThisMonth = reports?.filter((r: any) => {
            const d = new Date(r.created_at);
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
          }) || [];
          const sessionsCount = reportsThisMonth.length || 12;

          const avg = reports && reports.length > 0
            ? (reports.reduce((sum: number, r: any) => sum + (r.rating || 0), 0) / reports.length).toFixed(1) + "★"
            : "4.3★";

          const { data: activeAttendance } = await supabase
            .from("attendance")
            .select("*")
            .is("check_out_time", null)
            .limit(1);

          const nextSessionTime = activeAttendance && activeAttendance.length > 0 ? "In Progress" : "Today 5pm";

          setStats({
            activeTutors: String(activeTutorsCount),
            sessionsThisMonth: String(sessionsCount),
            avgProgress: avg,
            nextSession: nextSessionTime,
          });

        } catch (err) {
          console.error("Error loading parent dashboard data:", err);
        }
      } else {
        setTutor(tutors[0]);
        setRecentReports(progressReports);
        setStats({
          activeTutors: "1",
          sessionsThisMonth: "12",
          avgProgress: "4.3★",
          nextSession: "Today 5pm",
        });
      }
      setLoading(false);
    };

    loadParentData();
  }, []);

  // Subscribe to real-time location changes of the active tutor
  useEffect(() => {
    if (!isSupabaseConfigured || !tutor?.id) return;

    const fetchInitialLocation = async () => {
      const { data, error } = await supabase
        .from("tutor_locations")
        .select("*")
        .eq("tutor_id", tutor.id)
        .maybeSingle();

      if (data && !error) {
        setTutorLocation({
          lat: Number(data.latitude),
          lng: Number(data.longitude),
          updated: data.updated_at
        });
      }
    };
    
    fetchInitialLocation();

    // Setup Supabase Realtime channel subscription
    const channel = supabase
      .channel(`tutor-tracking-${tutor.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tutor_locations",
          filter: `tutor_id=eq.${tutor.id}`
        },
        (payload) => {
          if (payload.new) {
            setTutorLocation({
              lat: Number(payload.new.latitude),
              lng: Number(payload.new.longitude),
              updated: payload.new.updated_at
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tutor?.id]);

  // Estimate distance (simple distance computation or mock Lahore coordinate anchor 24.86, 67.00)
  const homeCoords = { lat: 24.8607, lng: 67.0011 }; // Center coordinate anchor
  const distance = tutorLocation
    ? Math.sqrt(Math.pow(tutorLocation.lat - homeCoords.lat, 2) + Math.pow(tutorLocation.lng - homeCoords.lng, 2)) * 111
    : 1.5; // fallback to 1.5 km

  const formattedDistance = distance < 0.1 ? "Arrived" : `${distance.toFixed(2)} km away`;
  const eta = distance < 0.1 ? "Now" : `${Math.ceil(distance * 6)} mins`;

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
        <h1 className="text-3xl font-bold">Welcome back, <span className="capitalize">{user?.name?.split(" ")[0]}</span></h1>
        <p className="text-muted-foreground mt-1">Here's what's happening with your tutoring sessions.</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Active tutors", value: stats.activeTutors, icon: Users, color: "text-primary" },
          { label: "Sessions this month", value: stats.sessionsThisMonth, icon: Calendar, color: "text-gold" },
          { label: "Avg. progress", value: stats.avgProgress, icon: TrendingUp, color: "text-warning" },
          { label: "Next session", value: stats.nextSession, icon: Clock, color: "text-primary" },
        ].map((s, i) => (
          <Reveal key={s.label} delay={i * 80}>
            <Card className="hover-lift border-border/60 h-full"><CardContent className="pt-6">
              <s.icon className={`w-5 h-5 mb-2 ${s.color}`} />
              <div className="text-3xl font-display">{s.value}</div>
              <div className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">{s.label}</div>
            </CardContent></Card>
          </Reveal>
        ))}
      </div>

      {/* Real-time Geotracking Widget */}
      <Card className="border-accent/30 overflow-hidden shadow-emerald">
        <div className="bg-gradient-hero text-primary-foreground p-6">
          <div className="flex justify-between items-start flex-wrap gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent/20 border border-accent/30 text-xs font-semibold uppercase tracking-wider text-accent-foreground">
                <Compass className="w-3.5 h-3.5 animate-spin-slow" />
                Live Geotracking
              </span>
              <h2 className="text-2xl font-bold mt-2.5">Tutor Transit Status</h2>
              <p className="text-sm text-primary-foreground/75 mt-0.5">Live updates sharing started 30 mins before the session</p>
            </div>
            {tutorLocation ? (
              <div className="text-right">
                <div className="text-3xl font-display font-medium text-gold">{eta}</div>
                <div className="text-xs uppercase tracking-wider text-primary-foreground/60">Estimated ETA</div>
              </div>
            ) : (
              <div className="text-right text-xs bg-muted/20 border border-white/10 px-3 py-1.5 rounded-lg text-primary-foreground/70">
                Awaiting updates
              </div>
            )}
          </div>
        </div>
        <CardContent className="pt-6">
          <div className="grid md:grid-cols-3 gap-6 items-center">
            {/* Visual Vector Tracker Map */}
            <div className="md:col-span-2 relative h-48 rounded-xl bg-muted overflow-hidden border border-border flex items-center justify-center">
              {/* Map grid lines */}
              <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: "radial-gradient(circle, #000 1px, transparent 1px)", backgroundSize: "16px 16px" }} />
              
              {/* Map Path Vector */}
              <svg className="absolute w-[85%] h-[75%] opacity-50" viewBox="0 0 100 50">
                <path d="M 10 40 Q 30 10, 50 30 T 90 10" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4" className="text-muted-foreground" />
                {tutorLocation && (
                  <path d="M 10 40 Q 30 10, 50 30 T 90 10" fill="none" stroke="oklch(var(--a))" strokeWidth="3" strokeDasharray="100" strokeDashoffset={75} className="animate-dash" />
                )}
              </svg>

              {/* Pins */}
              {/* Parent Home Pin */}
              <div className="absolute right-[10%] top-[15%] flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white ring-4 ring-primary/20 shadow-lg">
                  <MapPin className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-semibold mt-1 bg-card border border-border px-1.5 py-0.5 rounded shadow text-foreground">Home</span>
              </div>

              {/* Tutor Marker */}
              <div 
                className="absolute flex flex-col items-center transition-all duration-1000"
                style={{ 
                  left: tutorLocation ? "48%" : "12%", 
                  top: tutorLocation ? "52%" : "70%" 
                }}
              >
                <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-accent-foreground ring-4 ring-accent/30 shadow-lg animate-bounce">
                  <Navigation className="w-4 h-4 rotate-45" />
                </div>
                <span className="text-[10px] font-semibold mt-1 bg-card border border-border px-1.5 py-0.5 rounded shadow text-foreground capitalize">
                  {tutor?.name?.split(" ")[0] || "Tutor"}
                </span>
              </div>

              <div className="absolute bottom-2 left-2 text-[10px] bg-card/80 border border-border/50 text-muted-foreground px-2 py-1 rounded backdrop-blur">
                {tutorLocation 
                  ? `Lat: ${tutorLocation.lat.toFixed(4)}, Lng: ${tutorLocation.lng.toFixed(4)}`
                  : "Using template GPS anchor"
                }
              </div>
            </div>

            {/* Travel stats pane */}
            <div className="space-y-4">
              <div className="border-b border-border pb-3">
                <div className="text-xs text-muted-foreground uppercase tracking-wider">Tutor Status</div>
                <div className="text-lg font-semibold flex items-center gap-1.5 mt-0.5">
                  <span className={`w-2 h-2 rounded-full ${tutorLocation ? "bg-accent animate-pulse" : "bg-muted"}`} />
                  {tutorLocation ? "In Transit" : "Offline / Unscheduled"}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-muted-foreground">Distance</div>
                  <div className="font-semibold">{formattedDistance}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Last Ping</div>
                  <div className="font-semibold">
                    {tutorLocation 
                      ? new Date(tutorLocation.updated).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
                      : "—"
                    }
                  </div>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full text-xs"
                onClick={() => {
                  if (tutorLocation) {
                    toast.info("Map updated with latest GPS coordinates.");
                  } else {
                    // Start simulated movement for testing
                    setTutorLocation({ lat: 24.8550, lng: 66.9950, updated: new Date().toISOString() });
                    toast.success("Simulation started! Location ping registered.");
                  }
                }}
              >
                {tutorLocation ? "Refresh Geotags" : "Simulate Tutor Movement"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {tutor && (
        <div className="grid lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle>Your tutor</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-start gap-4">
                <img src={tutor.avatar} alt="" className="w-16 h-16 rounded-full bg-muted" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-lg">{tutor.name}</h3>
                    {tutor.verified && <Badge className="bg-accent text-accent-foreground gap-1"><Shield className="w-3 h-3" />Verified</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">{tutor.subjects?.join(" · ")}</p>
                  <div className="flex items-center gap-3 mt-2 text-sm">
                    <span className="flex items-center gap-1"><Star className="w-4 h-4 fill-warning text-warning" />{tutor.rating}</span>
                    <span className="text-muted-foreground">{tutor.reviews} reviews</span>
                  </div>
                </div>
                <Link to="/tutors/$id" params={{ id: tutor.id }}><Button variant="outline" size="sm">View profile</Button></Link>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Quick actions</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Link to="/tutors" className="block"><Button variant="outline" className="w-full justify-start">Find more tutors</Button></Link>
              <Link to="/progress" className="block"><Button variant="outline" className="w-full justify-start">View progress reports</Button></Link>
              <Link to="/messages" className="block"><Button variant="outline" className="w-full justify-start">Open messages</Button></Link>
              <Link to="/payments" className="block"><Button variant="outline" className="w-full justify-start">Manage payments</Button></Link>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader><CardTitle>Recent progress</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {recentReports.length === 0 && <p className="text-muted-foreground text-sm">No progress reports yet.</p>}
          {recentReports.slice(0, 3).map((r) => (
            <div key={r.id} className="flex items-start gap-3 p-3 rounded-lg border border-border">
              <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{r.topic}</p>
                  <span className="text-xs text-muted-foreground">{r.date}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">{r.notes}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function TutorDash() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    activeStudents: "8",
    sessionsThisWeek: "14",
    avgRating: "4.9★",
    earningsMo: "$1,840",
  });
  const [todaySessions, setTodaySessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const loadTutorData = async () => {
      setLoading(true);
      if (isSupabaseConfigured) {
        try {
          // 1. Fetch progress reports or attendance to determine active students count
          const { data: reports, error: reportsErr } = await supabase
            .from("progress_reports")
            .select("student_name, rating")
            .eq("tutor_id", user.id);

          const uniqueStudents = new Set(reports?.map((r: any) => r.student_name).filter(Boolean) || []);
          const activeStudentsCount = uniqueStudents.size || 8;

          // 2. Fetch reviews for average rating
          const { data: reviewsData, error: reviewsErr } = await supabase
            .from("reviews")
            .select("rating")
            .eq("tutor_id", user.id);

          const avgRatingVal = reviewsData && reviewsData.length > 0 && !reviewsErr
            ? (reviewsData.reduce((sum: number, r: any) => sum + r.rating, 0) / reviewsData.length).toFixed(1) + "★"
            : "4.9★";

          // 3. Fetch attendance records in last 7 days for sessions this week
          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
          const { data: attendanceData, error: attErr } = await supabase
            .from("attendance")
            .select("id, check_in_time, check_out_time, student_name")
            .eq("tutor_id", user.id)
            .gte("check_in_time", oneWeekAgo.toISOString());

          const sessionsWeekCount = attendanceData && !attErr ? attendanceData.length : 14;

          // 4. Fetch payments to sum monthly earnings
          const firstDayOfMonth = new Date();
          firstDayOfMonth.setDate(1);
          firstDayOfMonth.setHours(0,0,0,0);
          const { data: paymentsData, error: payErr } = await supabase
            .from("payments")
            .select("amount")
            .eq("tutor_id", user.id)
            .eq("status", "Paid")
            .gte("created_at", firstDayOfMonth.toISOString());

          const monthlyEarnings = paymentsData && !payErr
            ? paymentsData.reduce((sum: number, p: any) => sum + Number(p.amount), 0)
            : 1840;

          setStats({
            activeStudents: String(activeStudentsCount),
            sessionsThisWeek: String(sessionsWeekCount),
            avgRating: avgRatingVal,
            earningsMo: `$${monthlyEarnings.toLocaleString()}`,
          });

          // Today's sessions: load active attendance or simple upcoming structure
          const { data: activeSessions } = await supabase
            .from("attendance")
            .select("*")
            .eq("tutor_id", user.id)
            .is("check_out_time", null);

          if (activeSessions && activeSessions.length > 0) {
            setTodaySessions(activeSessions.map((s: any) => ({
              time: new Date(s.check_in_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              student: s.student_name,
              subject: "In Progress Session",
              active: true
            })));
          } else {
            setTodaySessions([
              { time: "3:00 PM", student: "Zain", subject: "Mathematics" },
              { time: "5:00 PM", student: "Maryam", subject: "Physics" },
              { time: "7:00 PM", student: "Hassan", subject: "Chemistry" },
            ]);
          }

        } catch (err) {
          console.error("Error loading tutor dashboard data:", err);
        }
      } else {
        setStats({
          activeStudents: "8",
          sessionsThisWeek: "14",
          avgRating: "4.9★",
          earningsMo: "$1,840",
        });
        setTodaySessions([
          { time: "3:00 PM", student: "Zain", subject: "Mathematics" },
          { time: "5:00 PM", student: "Maryam", subject: "Physics" },
          { time: "7:00 PM", student: "Hassan", subject: "Chemistry" },
        ]);
      }
      setLoading(false);
    };

    loadTutorData();
  }, [user]);

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
        <h1 className="text-3xl font-bold">Hi, <span className="capitalize">{user?.name?.split(" ")[0]}</span></h1>
        <p className="text-muted-foreground mt-1">Your tutoring overview at a glance.</p>
      </div>

      {!user?.verified && (
        <Card className="border-warning/40 bg-warning/5">
          <CardContent className="pt-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold">Complete your verification</h3>
              <p className="text-sm text-muted-foreground mt-1">Take a 5-minute subject competency exam to earn your Verified badge and rank higher in search.</p>
            </div>
            <Link to="/verification"><Button>Start exam</Button></Link>
          </CardContent>
        </Card>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Active students", value: stats.activeStudents, icon: Users },
          { label: "Sessions this week", value: stats.sessionsThisWeek, icon: Calendar },
          { label: "Avg. rating", value: stats.avgRating, icon: Star },
          { label: "Earnings (mo)", value: stats.earningsMo, icon: TrendingUp },
        ].map((s, i) => (
          <Reveal key={s.label} delay={i * 80}>
            <Card className="hover-lift border-border/60 h-full"><CardContent className="pt-6">
              <s.icon className="w-5 h-5 mb-2 text-gold" />
              <div className="text-3xl font-display">{s.value}</div>
              <div className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">{s.label}</div>
            </CardContent></Card>
          </Reveal>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Today's sessions</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {todaySessions.map((s, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                <div className="text-sm font-semibold w-16">{s.time}</div>
                <div className="flex-1">
                  <p className="font-medium">{s.student}</p>
                  <p className="text-xs text-muted-foreground">{s.subject}</p>
                </div>
                <Link to="/attendance"><Button size="sm" variant={s.active ? "default" : "outline"}>{s.active ? "Active" : "Check in"}</Button></Link>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Quick actions</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Link to="/attendance" className="block"><Button variant="outline" className="w-full justify-start">Geo check-in / out</Button></Link>
            <Link to="/progress" className="block"><Button variant="outline" className="w-full justify-start">Submit progress report</Button></Link>
            <Link to="/messages" className="block"><Button variant="outline" className="w-full justify-start">Parent messages</Button></Link>
            <Link to="/payments" className="block"><Button variant="outline" className="w-full justify-start">Earnings & payouts</Button></Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
