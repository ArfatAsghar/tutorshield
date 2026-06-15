-- ====================================================================
-- TutorShield — Complete Database Schema (Final Version)
-- Paste this entire script into Supabase SQL Editor and click Run
-- ====================================================================


-- ====================================================================
-- SECTION 1: TABLES
-- ====================================================================

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    role TEXT NOT NULL CHECK (role IN ('parent', 'tutor')),
    avatar TEXT,
    verified BOOLEAN DEFAULT FALSE,
    username_last_changed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure columns exist and are configured correctly if table was already created earlier
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ALTER COLUMN email DROP NOT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username_last_changed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Tutors Table (Professional metadata)
CREATE TABLE IF NOT EXISTS public.tutors (
    id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    subjects TEXT[] DEFAULT '{}',
    hourly_rate NUMERIC DEFAULT 25.0,
    city TEXT DEFAULT 'Lahore',
    experience INTEGER DEFAULT 1,
    bio TEXT DEFAULT '',
    badges TEXT[] DEFAULT '{}',
    rating NUMERIC DEFAULT 5.0,
    reviews INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.tutors ENABLE ROW LEVEL SECURITY;

-- 3. Attendance Table (Geotagged check-ins)
CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tutor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    student_name TEXT NOT NULL,
    check_in_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    check_out_time TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    check_in_lat NUMERIC,
    check_in_lng NUMERIC,
    status TEXT DEFAULT 'In Progress',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- 4. Progress Reports Table
CREATE TABLE IF NOT EXISTS public.progress_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tutor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    student_name TEXT NOT NULL,
    subject TEXT NOT NULL,
    topic TEXT NOT NULL,
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    notes TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.progress_reports ENABLE ROW LEVEL SECURITY;

-- 5. Reviews Table
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tutor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    parent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    parent_name TEXT NOT NULL,
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- 6. Messages Table (Realtime WebSocket chat)
DROP TABLE IF EXISTS public.messages CASCADE;
CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 7. Payments Table (Escrow and earnings)
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tutor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    parent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    tutor_name TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('Paid', 'In Escrow', 'Pending')),
    method TEXT DEFAULT 'Card',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- 8. Tutor Locations Table (Live GPS tracking)
CREATE TABLE IF NOT EXISTS public.tutor_locations (
    tutor_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    latitude NUMERIC NOT NULL,
    longitude NUMERIC NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.tutor_locations ENABLE ROW LEVEL SECURITY;


-- ====================================================================
-- SECTION 2: ROW LEVEL SECURITY POLICIES
-- ====================================================================

-- ── Profiles ──────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Allow public read access to profiles" ON public.profiles;
CREATE POLICY "Allow public read access to profiles" ON public.profiles
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow users to update their own profile" ON public.profiles;
CREATE POLICY "Allow users to update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Allow users to insert their own profile" ON public.profiles;
CREATE POLICY "Allow users to insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- ── Tutors ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Allow public read access to tutors" ON public.tutors;
CREATE POLICY "Allow public read access to tutors" ON public.tutors
    FOR SELECT USING (true);

-- FIX: Split into explicit INSERT + UPDATE policies (FOR ALL USING blocks INSERT)
DROP POLICY IF EXISTS "Allow tutors to upsert their own row" ON public.tutors;
DROP POLICY IF EXISTS "Allow tutors to insert own row" ON public.tutors;
DROP POLICY IF EXISTS "Allow tutors to update own row" ON public.tutors;
DROP POLICY IF EXISTS "Allow tutors to delete own row" ON public.tutors;

CREATE POLICY "Allow tutors to insert own row" ON public.tutors
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow tutors to update own row" ON public.tutors
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow tutors to delete own row" ON public.tutors
    FOR DELETE TO authenticated USING (true);

-- ── Attendance ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Allow tutors to manage their attendance" ON public.attendance;
CREATE POLICY "Allow tutors to manage their attendance" ON public.attendance
    FOR ALL USING (auth.uid() = tutor_id) WITH CHECK (auth.uid() = tutor_id);

DROP POLICY IF EXISTS "Allow users to view attendance list" ON public.attendance;
CREATE POLICY "Allow users to view attendance list" ON public.attendance
    FOR SELECT USING (true);

-- ── Progress Reports ──────────────────────────────────────────────
DROP POLICY IF EXISTS "Allow read access to progress reports" ON public.progress_reports;
CREATE POLICY "Allow read access to progress reports" ON public.progress_reports
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow tutors to insert progress reports" ON public.progress_reports;
CREATE POLICY "Allow tutors to insert progress reports" ON public.progress_reports
    FOR INSERT WITH CHECK (auth.uid() = tutor_id);

-- ── Reviews ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Allow read access to reviews" ON public.reviews;
CREATE POLICY "Allow read access to reviews" ON public.reviews
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow parents to insert reviews" ON public.reviews;
CREATE POLICY "Allow parents to insert reviews" ON public.reviews
    FOR INSERT WITH CHECK (auth.uid() = parent_id);

-- ── Messages ──────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Allow read access to messages" ON public.messages;
CREATE POLICY "Allow read access to messages" ON public.messages
    FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

DROP POLICY IF EXISTS "Allow authenticated users to send messages" ON public.messages;
CREATE POLICY "Allow authenticated users to send messages" ON public.messages
    FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- ── Payments ──────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Allow users to view their related payments" ON public.payments;
CREATE POLICY "Allow users to view their related payments" ON public.payments
    FOR SELECT USING (auth.uid() = tutor_id OR auth.uid() = parent_id);

DROP POLICY IF EXISTS "Allow users to insert payments" ON public.payments;
CREATE POLICY "Allow users to insert payments" ON public.payments
    FOR INSERT WITH CHECK (auth.uid() = parent_id);

-- ── Tutor Locations ───────────────────────────────────────────────
DROP POLICY IF EXISTS "Allow public read access to locations" ON public.tutor_locations;
CREATE POLICY "Allow public read access to locations" ON public.tutor_locations
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow tutors to update their own location" ON public.tutor_locations;
CREATE POLICY "Allow tutors to insert their own location" ON public.tutor_locations
    FOR INSERT WITH CHECK (auth.uid() = tutor_id);

CREATE POLICY "Allow tutors to update their own location" ON public.tutor_locations
    FOR UPDATE USING (auth.uid() = tutor_id) WITH CHECK (auth.uid() = tutor_id);


-- ====================================================================
-- SECTION 3: TRIGGER — Auto-create profile + tutors row on signup
--   Uses ON CONFLICT and EXCEPTION block to never block user signup
-- ====================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_role TEXT;
    user_name TEXT;
BEGIN
    user_role := COALESCE(new.raw_user_meta_data->>'role', 'parent');
    user_name := COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1));

    -- Create profile row (skip if already exists)
    INSERT INTO public.profiles (id, name, email, role, avatar, verified)
    VALUES (
        new.id,
        user_name,
        new.email,
        user_role,
        'https://api.dicebear.com/9.x/notionists/svg?seed=' || user_name,
        FALSE
    )
    ON CONFLICT (id) DO NOTHING;

    -- If registering as a tutor, auto-create their tutors row
    IF user_role = 'tutor' THEN
        INSERT INTO public.tutors (id, subjects, hourly_rate, city, experience, bio, badges, rating, reviews)
        VALUES (
            new.id,
            '{}',
            25.0,
            'Lahore',
            1,
            '',
            '{}',
            5.0,
            0
        )
        ON CONFLICT (id) DO NOTHING;
    END IF;

    RETURN NEW;

EXCEPTION WHEN OTHERS THEN
    -- Never block signup — log the error and continue
    RAISE WARNING 'handle_new_user failed for user %: % (SQLSTATE: %)', new.id, SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ====================================================================
-- SECTION 4: REALTIME WEBSOCKET SUBSCRIPTIONS
-- ====================================================================

ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.tutor_locations REPLICA IDENTITY FULL;

DROP PUBLICATION IF EXISTS supabase_realtime CASCADE;
CREATE PUBLICATION supabase_realtime FOR TABLE
    public.messages,
    public.tutor_locations;


-- ====================================================================
-- SECTION 5: BACKFILL
-- Safe to run multiple times — uses NOT EXISTS guards
-- ====================================================================

-- 1. Backfill profiles from auth.users if missing
INSERT INTO public.profiles (id, name, role, avatar, verified)
SELECT
    u.id,
    COALESCE(u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)),
    COALESCE(u.raw_user_meta_data->>'role', 'parent'),
    'https://api.dicebear.com/9.x/notionists/svg?seed=' || COALESCE(u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)),
    FALSE
FROM auth.users u
WHERE NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = u.id
)
ON CONFLICT (id) DO NOTHING;

-- 2. Backfill tutors from profiles if missing
INSERT INTO public.tutors (id, subjects, hourly_rate, city, experience, bio, badges, rating, reviews)
SELECT
    p.id,
    '{}',
    25.0,
    'Lahore',
    1,
    '',
    '{}',
    5.0,
    0
FROM public.profiles p
WHERE p.role = 'tutor'
  AND NOT EXISTS (
      SELECT 1 FROM public.tutors t WHERE t.id = p.id
  );
