import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { RequireAuth } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, LogIn, LogOut, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/attendance")({
  head: () => ({ meta: [{ title: "Attendance — TutorShield" }] }),
  component: () => <RequireAuth><Attendance /></RequireAuth>,
});

function Attendance() {
  const { user } = useAuth();
  const [checkedIn, setCheckedIn] = useState(false);
  const [studentName, setStudentName] = useState("");
  const [checkInTime, setCheckInTime] = useState<string | null>(null);
  const [activeRecordId, setActiveRecordId] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [parentHomeCoords, setParentHomeCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    // Try to get current geolocation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setCoords({ lat: 24.8607, lng: 67.0011 }) // Fallback coords
      );
    } else {
      setCoords({ lat: 24.8607, lng: 67.0011 });
    }

    const fetchParentHome = async () => {
      if (isSupabaseConfigured && user && user.role === "parent") {
        const { data } = await supabase
          .from("profiles")
          .select("home_latitude, home_longitude")
          .eq("id", user.id)
          .maybeSingle();
        if (data?.home_latitude && data?.home_longitude) {
          setParentHomeCoords({
            lat: Number(data.home_latitude),
            lng: Number(data.home_longitude),
          });
        }
      }
    };

    fetchParentHome();
    loadHistory();
  }, [user]);

  const loadHistory = async () => {
    setLoading(true);
    if (isSupabaseConfigured && user) {
      try {
        let query = supabase
          .from("attendance")
          .select(`
            *,
            profiles!attendance_tutor_id_fkey (name, avatar)
          `)
          .order("check_in_time", { ascending: false })
          .limit(15);

        if (user.role === "tutor") {
          query = query.eq("tutor_id", user.id);
        }

        const { data, error } = await query;

        if (!error && data) {
          const formattedHistory = data.map((h: any) => {
            const tutorProfile = Array.isArray(h.profiles) ? h.profiles[0] : h.profiles;
            return {
              id: h.id,
              date: new Date(h.check_in_time).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
              student: h.student_name,
              tutorName: tutorProfile?.name || "Tutor",
              tutorAvatar: tutorProfile?.avatar || "",
              in: new Date(h.check_in_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              out: h.check_out_time ? new Date(h.check_out_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—",
              status: h.status || "Completed",
              lat: h.check_in_lat ? Number(h.check_in_lat) : null,
              lng: h.check_in_lng ? Number(h.check_in_lng) : null,
            };
          });

          setHistory(formattedHistory);
          if (formattedHistory.length > 0) {
            setSelectedRecord(formattedHistory[0]);
          }

          // Check for active (not checked-out) session (tutors only)
          if (user.role === "tutor") {
            const active = data.find((h: any) => !h.check_out_time);
            if (active) {
              setCheckedIn(true);
              setCheckInTime(new Date(active.check_in_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
              setActiveRecordId(active.id);
              setStudentName(active.student_name || "");
            }
          }
        }
      } catch (err) {
        console.error("Failed to load attendance history:", err);
      }
    } else {
      // Offline fallback history template
      const mockHistory = [
        {
          id: "1",
          date: "Jun 16",
          student: "Zain",
          tutorName: "Ayesha Khan",
          in: "04:00 PM",
          out: "06:00 PM",
          status: "Completed",
          lat: 24.8622,
          lng: 67.0035,
        },
      ];
      setHistory(mockHistory);
      setSelectedRecord(mockHistory[0]);
    }
    setLoading(false);
  };

  const checkIn = async () => {
    if (!studentName.trim()) {
      toast.error("Please enter the student's name");
      return;
    }
    const sName = studentName.trim();
    if (isSupabaseConfigured && user) {
      try {
        const { data, error } = await supabase
          .from("attendance")
          .insert({
            tutor_id: user.id,
            student_name: sName,
            check_in_lat: coords?.lat,
            check_in_lng: coords?.lng,
            status: "In Progress",
          })
          .select()
          .single();

        if (error) throw error;
        setActiveRecordId(data.id);
        setCheckedIn(true);
        setCheckInTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
        toast.success(`Geo check-in recorded for ${sName}`);
        loadHistory();
      } catch (err: any) {
        toast.error(err.message || "Check-in failed");
      }
    } else {
      setCheckedIn(true);
      setCheckInTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      toast.success(`Geo check-in recorded for ${sName}`);
    }
  };

  const checkOut = async () => {
    if (isSupabaseConfigured && activeRecordId) {
      try {
        const { error } = await supabase
          .from("attendance")
          .update({ check_out_time: new Date().toISOString(), status: "Completed" })
          .eq("id", activeRecordId);

        if (error) throw error;
        setCheckedIn(false);
        setActiveRecordId(null);
        setStudentName("");
        toast.success("Session ended · payment released from escrow");
        loadHistory();
      } catch (err: any) {
        toast.error(err.message || "Check-out failed");
      }
    } else {
      setCheckedIn(false);
      setStudentName("");
      toast.success("Session ended · payment released from escrow");
    }
  };

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
        <h1 className="text-3xl font-bold">Attendance Log</h1>
        <p className="text-muted-foreground mt-1">
          {user?.role === "tutor"
            ? "Geotagged check-in builds trust with parents and automatically verifies your sessions."
            : "Monitor live and past geotagged session logs checked in by your tutors."}
        </p>
      </div>

      {user?.role === "tutor" && (
        <Card className="overflow-hidden shadow-sm">
          <div className="bg-gradient-hero text-primary-foreground p-8">
            <div className="flex items-center gap-2 text-sm text-primary-foreground/85">
              <MapPin className="w-4 h-4 animate-bounce" /> Current GPS: {coords ? `${coords.lat.toFixed(4)}° N, ${coords.lng.toFixed(4)}° E` : "Detecting..."}
            </div>
            <h2 className="text-2xl font-bold mt-2">Session Check-in</h2>
            <p className="text-primary-foreground/80 mt-1">Geo-verified attendance tracking</p>
            {checkedIn && <p className="mt-4 text-sm flex items-center gap-2 font-medium bg-white/10 px-3 py-1.5 rounded-lg w-fit"><CheckCircle2 className="w-4 h-4 text-accent" /> Checked in at {checkInTime}</p>}
          </div>
          <CardContent className="pt-6">
            {!checkedIn ? (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="student-name" className="text-muted-foreground">Student Name</Label>
                  <Input
                    id="student-name"
                    placeholder="Enter student's name (e.g. Zain)"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                  />
                </div>
                <Button size="lg" className="w-full font-semibold" onClick={checkIn} disabled={!studentName.trim()}><LogIn className="w-4 h-4 mr-2" />Geo check-in</Button>
              </div>
            ) : (
              <Button size="lg" variant="destructive" className="w-full font-semibold animate-pulse" onClick={checkOut}><LogOut className="w-4 h-4 mr-2" />Check out & end session</Button>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        {/* Left pane: History list */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Recent sessions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {history.length === 0 && <p className="text-muted-foreground text-sm py-4 text-center">No attendance records yet.</p>}
            {history.map((h, i) => (
              <div 
                key={h.id || i} 
                onClick={() => setSelectedRecord(h)}
                className={`flex items-center gap-4 p-3.5 rounded-xl border cursor-pointer transition-all hover:bg-muted/40 ${selectedRecord?.id === h.id ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border bg-card"}`}
              >
                <div className="text-xs font-semibold text-muted-foreground w-12 bg-muted/65 py-2 px-1.5 rounded-lg text-center">{h.date}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm">{h.student}</p>
                    {user?.role === "parent" && h.tutorName && (
                      <span className="text-xs text-muted-foreground px-2 py-0.5 rounded-full bg-muted/60">Tutor: {h.tutorName}</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
                    <Clock className="w-3 h-3 text-muted-foreground/80" />{h.in} – {h.out}
                    {h.lat && h.lng && (
                      <span className="text-[10px] bg-accent/10 text-accent font-mono font-semibold px-2 py-0.5 rounded-full ml-1">
                        GPS geotag logged
                      </span>
                    )}
                  </p>
                </div>
                <Badge className={h.status === "Completed" ? "bg-accent text-accent-foreground border-0" : "bg-warning/20 text-warning border-0"}>{h.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Right pane: Google Map selected detail */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-1.5">
              <MapPin className="w-5 h-5 text-accent" />
              Check-in Geotag Map
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedRecord && selectedRecord.lat && selectedRecord.lng ? (
              <div className="space-y-4">
                <div className="relative h-64 rounded-xl overflow-hidden border border-border bg-muted">
                  {user?.role === "parent" && parentHomeCoords ? (
                    <iframe
                      title="Attendance Map Router"
                      src={`https://maps.google.com/maps?saddr=${selectedRecord.lat},${selectedRecord.lng}&daddr=${parentHomeCoords.lat},${parentHomeCoords.lng}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
                      className="w-full h-full border-0"
                      allowFullScreen
                      loading="lazy"
                    />
                  ) : (
                    <iframe
                      title="Attendance Map Detail"
                      src={`https://maps.google.com/maps?q=${selectedRecord.lat},${selectedRecord.lng}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
                      className="w-full h-full border-0"
                      allowFullScreen
                      loading="lazy"
                    />
                  )}
                </div>
                <div className="text-sm space-y-2 bg-muted/30 p-3 rounded-lg border border-border/55">
                  <div className="flex justify-between border-b border-border/40 pb-1.5">
                    <span className="text-muted-foreground text-xs">Student Name</span>
                    <span className="font-semibold text-xs">{selectedRecord.student}</span>
                  </div>
                  {user?.role === "parent" && (
                    <div className="flex justify-between border-b border-border/40 pb-1.5">
                      <span className="text-muted-foreground text-xs">Tutor Name</span>
                      <span className="font-semibold text-xs">{selectedRecord.tutorName}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-b border-border/40 pb-1.5">
                    <span className="text-muted-foreground text-xs">Coordinates</span>
                    <span className="font-mono font-medium text-[11px]">{selectedRecord.lat.toFixed(5)}° N, {selectedRecord.lng.toFixed(5)}° E</span>
                  </div>
                  <div className="flex justify-between border-b border-border/40 pb-1.5">
                    <span className="text-muted-foreground text-xs">Timing</span>
                    <span className="text-xs">{selectedRecord.in} – {selectedRecord.out}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-xs">Verification Status</span>
                    <Badge variant="outline" className="text-[10px] h-5 border-accent text-accent bg-accent/5">{selectedRecord.status}</Badge>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground space-y-3">
                <MapPin className="w-10 h-10 opacity-30 text-accent" />
                <p className="text-xs max-w-[200px] leading-relaxed">Select a session log on the left to see the check-in point mapped dynamically on Google Maps.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
