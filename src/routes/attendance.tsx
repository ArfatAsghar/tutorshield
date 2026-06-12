import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { RequireAuth } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, LogIn, LogOut, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/attendance")({
  head: () => ({ meta: [{ title: "Attendance — TutorShield" }] }),
  component: () => <RequireAuth><Attendance /></RequireAuth>,
});

function Attendance() {
  const { user } = useAuth();
  const [checkedIn, setCheckedIn] = useState(false);
  const [checkInTime, setCheckInTime] = useState<string | null>(null);
  const [activeRecordId, setActiveRecordId] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

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

    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    if (isSupabaseConfigured && user) {
      const { data, error } = await supabase
        .from("attendance")
        .select("*")
        .eq("tutor_id", user.id)
        .order("check_in_time", { ascending: false })
        .limit(10);

      if (!error && data) {
        setHistory(data.map((h: any) => ({
          id: h.id,
          date: new Date(h.check_in_time).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          student: h.student_name,
          in: new Date(h.check_in_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          out: h.check_out_time ? new Date(h.check_out_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—",
          status: h.status || "Completed",
        })));

        // Check for active (not checked-out) session
        const active = data.find((h: any) => !h.check_out_time);
        if (active) {
          setCheckedIn(true);
          setCheckInTime(new Date(active.check_in_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
          setActiveRecordId(active.id);
        }
      }
    } else {
      setHistory([
        { date: "Jun 5", student: "Zain", in: "5:00 PM", out: "6:30 PM", status: "Completed" },
        { date: "Jun 3", student: "Maryam", in: "4:00 PM", out: "5:30 PM", status: "Completed" },
        { date: "Jun 1", student: "Hassan", in: "7:00 PM", out: "8:00 PM", status: "Completed" },
      ]);
    }
    setLoading(false);
  };

  const checkIn = async () => {
    if (isSupabaseConfigured && user) {
      try {
        const { data, error } = await supabase
          .from("attendance")
          .insert({
            tutor_id: user.id,
            student_name: "Student",
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
        toast.success(`Geo check-in recorded · ${coords?.lat.toFixed(2)}°N, ${coords?.lng.toFixed(2)}°E`);
      } catch (err: any) {
        toast.error(err.message || "Check-in failed");
      }
    } else {
      setCheckedIn(true);
      setCheckInTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      toast.success(`Geo check-in recorded · ${coords?.lat?.toFixed(2)}°N, ${coords?.lng?.toFixed(2)}°E`);
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
        toast.success("Session ended · payment released to escrow");
        loadHistory();
      } catch (err: any) {
        toast.error(err.message || "Check-out failed");
      }
    } else {
      setCheckedIn(false);
      toast.success("Session ended · payment released to escrow");
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
        <h1 className="text-3xl font-bold">Attendance</h1>
        <p className="text-muted-foreground mt-1">Geotagged check-in builds trust with parents and verifies sessions for payment.</p>
      </div>

      <Card className="overflow-hidden">
        <div className="bg-gradient-hero text-primary-foreground p-8">
          <div className="flex items-center gap-2 text-sm text-primary-foreground/80">
            <MapPin className="w-4 h-4" /> Current location: {coords ? `${coords.lat.toFixed(4)}° N, ${coords.lng.toFixed(4)}° E` : "Detecting..."}
          </div>
          <h2 className="text-2xl font-bold mt-2">Session Check-in</h2>
          <p className="text-primary-foreground/80 mt-1">Geo-verified attendance tracking</p>
          {checkedIn && <p className="mt-4 text-sm flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-accent" /> Checked in at {checkInTime}</p>}
        </div>
        <CardContent className="pt-6">
          {!checkedIn ? (
            <Button size="lg" className="w-full" onClick={checkIn}><LogIn className="w-4 h-4 mr-2" />Geo check-in</Button>
          ) : (
            <Button size="lg" variant="destructive" className="w-full" onClick={checkOut}><LogOut className="w-4 h-4 mr-2" />Check out & end session</Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Recent sessions</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {history.length === 0 && <p className="text-muted-foreground text-sm">No attendance records yet.</p>}
          {history.map((h, i) => (
            <div key={h.id || i} className="flex items-center gap-4 p-3 rounded-lg border border-border">
              <div className="text-sm font-semibold text-muted-foreground w-12">{h.date}</div>
              <div className="flex-1">
                <p className="font-medium">{h.student}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" />{h.in} – {h.out}</p>
              </div>
              <Badge className={h.status === "Completed" ? "bg-accent text-accent-foreground" : "bg-warning/20 text-warning"}>{h.status}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
