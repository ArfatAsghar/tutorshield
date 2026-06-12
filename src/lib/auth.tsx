import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { AuthChangeEvent, Session, User as SupabaseUser } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export type Role = "parent" | "tutor";
export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  verified?: boolean;
  avatar?: string;
}

interface AuthCtx {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  signup: (data: { name: string; email: string; password: string; role: Role }) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUser: (patch: Partial<User>) => void;
}

const Ctx = createContext<AuthCtx | null>(null);
const KEY = "tutorshield_user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const buildUserFromProfile = (
    id: string,
    email: string,
    metadata: SupabaseUser["user_metadata"] | undefined,
    profile?: { name?: string | null; role?: string | null; avatar?: string | null; verified?: boolean | null } | null
  ): User => ({
    id,
    email,
    name: profile?.name || metadata?.name || email.split("@")[0] || "",
    role: (profile?.role as Role) || (metadata?.role as Role) || "parent",
    avatar: profile?.avatar || undefined,
    verified: profile?.verified ?? false,
  });

  const fetchAndSetUserProfile = async (id: string, email: string, metadata?: SupabaseUser["user_metadata"]) => {
    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("name, role, avatar, verified")
        .eq("id", id)
        .single();

      if (profile && !error) {
        setUser(buildUserFromProfile(id, email, metadata, profile));
      } else {
        setUser(buildUserFromProfile(id, email, metadata));
      }
    } catch {
      setUser(buildUserFromProfile(id, email, metadata));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSupabaseConfigured) {
      supabase.auth.getSession().then(({ data: { session } }: { data: { session: Session | null } }) => {
        if (session?.user) {
          fetchAndSetUserProfile(session.user.id, session.user.email || "", session.user.user_metadata);
        } else {
          setUser(null);
          setLoading(false);
        }
      });

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (_event: AuthChangeEvent, session: Session | null) => {
        if (session?.user) {
          await fetchAndSetUserProfile(session.user.id, session.user.email || "", session.user.user_metadata);
        } else {
          setUser(null);
          setLoading(false);
        }
      });

      return () => subscription.unsubscribe();
    }

    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setUser(JSON.parse(raw));
    } catch {
      // localStorage may be unavailable in private browsing
    }
    setLoading(false);
  }, []);

  const persistMock = (u: User | null) => {
    setUser(u);
    if (u) localStorage.setItem(KEY, JSON.stringify(u));
    else localStorage.removeItem(KEY);
  };

  const login: AuthCtx["login"] = async (email, password) => {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
      if (!data.user) throw new Error("No user returned");

      const { data: profile } = await supabase
        .from("profiles")
        .select("name, role, avatar, verified")
        .eq("id", data.user.id)
        .single();

      const u = buildUserFromProfile(data.user.id, data.user.email || "", data.user.user_metadata, profile);
      setUser(u);
      return u;
    }

    const role: Role = email.includes("tutor") ? "tutor" : "parent";
    const u: User = {
      id: crypto.randomUUID(),
      name: email.split("@")[0].replace(/[._]/g, " "),
      email,
      role,
      verified: role === "tutor",
    };
    persistMock(u);
    return u;
  };

  const signup: AuthCtx["signup"] = async ({ name, email, password, role }) => {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name, role } },
      });
      if (error) throw new Error(error.message);
      if (!data.user) throw new Error("No user returned");

      const u: User = { id: data.user.id, email: data.user.email || "", name, role, verified: false };

      if (data.session) {
        await fetchAndSetUserProfile(data.user.id, data.user.email || "", data.user.user_metadata);
      } else {
        setUser(u);
      }

      return u;
    }

    const u: User = { id: crypto.randomUUID(), name, email, role, verified: false };
    persistMock(u);
    return u;
  };

  const logout = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
      setUser(null);
    } else {
      persistMock(null);
    }
  };

  const refreshUser = async () => {
    if (!isSupabaseConfigured || !user) return;
    await fetchAndSetUserProfile(user.id, user.email);
  };

  const updateUser = (patch: Partial<User>) => {
    if (!user) return;
    const next = { ...user, ...patch };
    if (isSupabaseConfigured) {
      setUser(next);
    } else {
      persistMock(next);
    }
  };

  return (
    <Ctx.Provider value={{ user, loading, login, signup, logout, refreshUser, updateUser }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be inside AuthProvider");
  return c;
}
