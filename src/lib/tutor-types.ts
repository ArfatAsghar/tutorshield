export interface Tutor {
  id: string;
  name: string;
  subjects: string[];
  rating: number;
  reviews: number;
  hourlyRate: number;
  verified: boolean;
  city: string;
  experience: number;
  bio: string;
  avatar: string;
  badges: string[];
}

export type TutorListItem = Tutor;

type ProfileRow = { name?: string | null; avatar?: string | null; verified?: boolean | null };

function resolveProfile(profiles?: ProfileRow | ProfileRow[] | null): ProfileRow | null {
  if (!profiles) return null;
  return Array.isArray(profiles) ? profiles[0] ?? null : profiles;
}

export function mapTutorRow(row: {
  id: string;
  subjects?: string[] | null;
  rating?: number | string | null;
  reviews?: number | string | null;
  hourly_rate?: number | string | null;
  city?: string | null;
  experience?: number | string | null;
  bio?: string | null;
  badges?: string[] | null;
  profiles?: ProfileRow | ProfileRow[] | null;
}): TutorListItem {
  const profile = resolveProfile(row.profiles);
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
}
