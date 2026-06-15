import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { RequireAuth } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { User as UserIcon, Camera, Loader2, Calendar, GraduationCap } from "lucide-react";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — TutorShield" }] }),
  component: () => (
    <RequireAuth>
      <SettingsPage />
    </RequireAuth>
  ),
});

const FEMALE_PRESETS = [
  { name: "Anya", url: "https://api.dicebear.com/9.x/notionists/svg?seed=Anya" },
  { name: "Sara", url: "https://api.dicebear.com/9.x/notionists/svg?seed=Sara" },
  { name: "Maria", url: "https://api.dicebear.com/9.x/notionists/svg?seed=Maria" },
];

const MALE_PRESETS = [
  { name: "Felix", url: "https://api.dicebear.com/9.x/notionists/svg?seed=Felix" },
  { name: "Jack", url: "https://api.dicebear.com/9.x/notionists/svg?seed=Jack" },
  { name: "Oliver", url: "https://api.dicebear.com/9.x/notionists/svg?seed=Oliver" },
];

function SettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("");
  const [lastChanged, setLastChanged] = useState<string | null>(null);
  
  // Tutor fields
  const [subjects, setSubjects] = useState("");
  const [hourlyRate, setHourlyRate] = useState(25);
  const [city, setCity] = useState("");
  const [experience, setExperience] = useState(0);
  const [bio, setBio] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }

    const loadProfile = async () => {
      setLoading(true);
      try {
        if (isSupabaseConfigured) {
          // Load base profile
          const { data: profile, error } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single();

          if (profile && !error) {
            setName(profile.name);
            setAvatar(profile.avatar || "");
            setLastChanged(profile.username_last_changed_at || null);
          }

          // If tutor, load tutor details
          if (user.role === "tutor") {
            const { data: tutor, error: tutorErr } = await supabase
              .from("tutors")
              .select("*")
              .eq("id", user.id)
              .single();

            if (tutor && !tutorErr) {
              setSubjects(tutor.subjects?.join(", ") || "");
              setHourlyRate(tutor.hourly_rate || 25);
              setCity(tutor.city || "");
              setExperience(tutor.experience || 0);
              setBio(tutor.bio || "");
            }
          }
        } else {
          // Fallback static
          setName(user.name);
          setAvatar(user.avatar || "");
        }
      } catch (err) {
        console.error("Error loading settings profile", err);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [user, authLoading]);

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Name cannot be empty");
      return;
    }

    setSaving(true);
    try {
      if (isSupabaseConfigured && user) {
        // Enforce the 14-day lock on name updates
        if (lastChanged) {
          const lastChangedTime = new Date(lastChanged).getTime();
          const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000;
          const nextAllowedTime = lastChangedTime + fourteenDaysMs;
          const now = Date.now();

          if (now < nextAllowedTime) {
            const diffMs = nextAllowedTime - now;
            const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
            toast.error(
              `You can only change your username once every 14 days. Please wait ${diffDays} more day(s).`
            );
            setSaving(false);
            return;
          }
        }

        const nowIso = new Date().toISOString();
        
        const { data: profileCheck } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", user.id)
          .maybeSingle();

        let error;
        if (profileCheck) {
          const res = await supabase
            .from("profiles")
            .update({ name, username_last_changed_at: nowIso })
            .eq("id", user.id);
          error = res.error;
        } else {
          const res = await supabase
            .from("profiles")
            .insert({
              id: user.id,
              name,
              role: user.role || "tutor",
              avatar: avatar || `https://api.dicebear.com/9.x/notionists/svg?seed=${name}`,
              username_last_changed_at: nowIso
            });
          error = res.error;
        }

        if (error) throw error;

        setLastChanged(nowIso);
        toast.success("Name updated successfully!");
      } else {
        toast.success("Name updated (Local Session Only)!");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile name");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateTutorDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isSupabaseConfigured && user) {
        const parsedSubjects = subjects
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);

        // Ensure profile row exists to satisfy foreign key constraint tutors_id_fkey
        const { data: profileCheck } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", user.id)
          .maybeSingle();

        if (!profileCheck) {
          const { error: profileError } = await supabase
            .from("profiles")
            .insert({
              id: user.id,
              name: name || user.name || user.email.split("@")[0],
              role: user.role || "tutor",
              avatar: avatar || `https://api.dicebear.com/9.x/notionists/svg?seed=${name || user.name}`
            });
          if (profileError) throw profileError;
        }

        const { error } = await supabase.from("tutors").upsert({
          id: user.id,
          subjects: parsedSubjects,
          hourly_rate: Number(hourlyRate),
          city: city.trim(),
          experience: Number(experience),
          bio: bio.trim(),
        });

        if (error) throw error;
        toast.success("Tutor profile details saved successfully!");
      } else {
        toast.success("Tutor details saved (Local Session Only)!");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save tutor details");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type and size
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("File size must be under 2MB");
      return;
    }

    setUploading(true);
    try {
      if (isSupabaseConfigured && user) {
        const fileExt = file.name.split(".").pop();
        const filePath = `${user.id}/avatar-${Date.now()}.${fileExt}`;

        // Upload to bucket
        const { error: uploadError } = await supabase.storage
          .from("tutor-avatars")
          .upload(filePath, file, { upsert: true });

        if (uploadError) throw uploadError;

        // Get public URL
        const {
          data: { publicUrl },
        } = supabase.storage.from("tutor-avatars").getPublicUrl(filePath);

        // Update profile
        const { data: profileCheck } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", user.id)
          .maybeSingle();

        let updateError;
        if (profileCheck) {
          const res = await supabase
            .from("profiles")
            .update({ avatar: publicUrl })
            .eq("id", user.id);
          updateError = res.error;
        } else {
          const res = await supabase
            .from("profiles")
            .insert({
              id: user.id,
              name: name || user.name || user.email.split("@")[0],
              role: user.role || "tutor",
              avatar: publicUrl
            });
          updateError = res.error;
        }

        if (updateError) throw updateError;

        setAvatar(publicUrl);
        toast.success("Profile picture updated successfully!");
      } else {
        // Mock upload locally via FileReader
        const reader = new FileReader();
        reader.onloadend = () => {
          setAvatar(reader.result as string);
          toast.success("Profile picture updated locally!");
        };
        reader.readAsDataURL(file);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const handleSelectPreset = async (presetUrl: string) => {
    setUploading(true);
    try {
      if (isSupabaseConfigured && user) {
        const { error } = await supabase
          .from("profiles")
          .update({ avatar: presetUrl })
          .eq("id", user.id);

        if (error) throw error;
        setAvatar(presetUrl);
        toast.success("Profile avatar updated to preset!");
      } else {
        setAvatar(presetUrl);
        toast.success("Profile avatar preset updated locally!");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to set avatar preset");
    } finally {
      setUploading(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Profile Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your identity, photos, and professional details.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Left Column: Avatar Settings */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Profile Picture</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4 text-center">
              <div className="relative group w-28 h-28">
                <div className="w-full h-full rounded-full bg-gradient-trust ring-4 ring-gold/20 flex items-center justify-center overflow-hidden shadow-emerald">
                  {avatar ? (
                    <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="w-12 h-12 text-primary-foreground" />
                  )}
                </div>
                <label className="absolute inset-0 flex items-center justify-center bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                  <Camera className="w-6 h-6" />
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploading} />
                </label>
              </div>

              {uploading && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading image...
                </div>
              )}

              <CardDescription>
                Click picture to upload custom file (max 2MB), or select one of the cool default presets below.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Default Avatars</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-2">Female Presets</p>
                <div className="flex gap-2">
                  {FEMALE_PRESETS.map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => handleSelectPreset(p.url)}
                      className="w-10 h-10 rounded-full border border-border bg-card hover:ring-2 hover:ring-primary overflow-hidden transition-all"
                    >
                      <img src={p.url} alt={p.name} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-2">Male Presets</p>
                <div className="flex gap-2">
                  {MALE_PRESETS.map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => handleSelectPreset(p.url)}
                      className="w-10 h-10 rounded-full border border-border bg-card hover:ring-2 hover:ring-primary overflow-hidden transition-all"
                    >
                      <img src={p.url} alt={p.name} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Profile details form */}
        <div className="md:col-span-2 space-y-6">
          {/* Identity Form */}
          <Card>
            <CardHeader>
              <CardTitle>Personal Details</CardTitle>
              <CardDescription>Update your username. Username can only be updated once every 14 days.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateName} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" disabled value={user?.email || ""} className="bg-muted text-muted-foreground" />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="role">Account Role</Label>
                  <Input id="role" type="text" disabled value={user?.role || ""} className="bg-muted text-muted-foreground capitalize" />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="username">Full Name</Label>
                  <Input id="username" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Ayesha Khan" />
                </div>

                {lastChanged && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5 pt-1">
                    <Calendar className="w-3.5 h-3.5" />
                    Last changed on {new Date(lastChanged).toLocaleDateString()} (14-day lock applies)
                  </p>
                )}

                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Professional Details Form (Tutors Only) */}
          {user?.role === "tutor" && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-6 h-6 text-gold" />
                  <CardTitle>Tutor Settings</CardTitle>
                </div>
                <CardDescription>Professional configurations showing up on the public tutor listing page.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdateTutorDetails} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="subjects">Subjects (comma separated)</Label>
                    <Input id="subjects" required value={subjects} onChange={(e) => setSubjects(e.target.value)} placeholder="Mathematics, Physics, Chemistry" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="hourlyRate">Hourly Rate ($)</Label>
                      <Input id="hourlyRate" type="number" required value={hourlyRate} onChange={(e) => setHourlyRate(Number(e.target.value))} />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="experience">Years of Experience</Label>
                      <Input id="experience" type="number" required value={experience} onChange={(e) => setExperience(Number(e.target.value))} />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="city">City Location</Label>
                    <Input id="city" required value={city} onChange={(e) => setCity(e.target.value)} placeholder="Lahore" />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="bio">Professional Bio</Label>
                    <Textarea id="bio" rows={4} required value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell parents about your qualifications, teaching methodology..." />
                  </div>

                  <Button type="submit" disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...
                      </>
                    ) : (
                      "Save Tutor Profile"
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
