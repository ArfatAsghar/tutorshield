-- ====================================================================
-- TutorShield Database Schema and Triggers Setup Script
-- Copy and run this script inside your Supabase SQL Editor
-- ====================================================================

-- 1. Create Profiles Table (Public Profile Data)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('parent', 'tutor')),
    avatar TEXT,
    verified BOOLEAN DEFAULT FALSE,
    username_last_changed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Create Tutors Table (Tutor Specific Professional Metadata)
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

-- Enable RLS on tutors
ALTER TABLE public.tutors ENABLE ROW LEVEL SECURITY;

-- 3. Create Attendance Table (Geotagged Check-ins)
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

-- Enable RLS on attendance
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- 4. Create Progress Reports Table
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

-- Enable RLS on progress_reports
ALTER TABLE public.progress_reports ENABLE ROW LEVEL SECURITY;

-- 5. Create Reviews Table
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tutor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    parent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    parent_name TEXT NOT NULL,
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on reviews
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- 6. Create Messages Table (Recipient-Aware, WebSocket Sync Enabled)
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 7. Create Payments Table (Escrow and Earnings Log)
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

-- Enable RLS on payments
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- 8. Create Tutor Locations Table (Live Geotracking)
CREATE TABLE IF NOT EXISTS public.tutor_locations (
    tutor_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    latitude NUMERIC NOT NULL,
    longitude NUMERIC NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on tutor_locations
ALTER TABLE public.tutor_locations ENABLE ROW LEVEL SECURITY;


-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

-- Profiles Policies
DROP POLICY IF EXISTS "Allow public read access to profiles" ON public.profiles;
CREATE POLICY "Allow public read access to profiles" ON public.profiles
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow users to update their own profile" ON public.profiles;
CREATE POLICY "Allow users to update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Tutors Policies
DROP POLICY IF EXISTS "Allow public read access to tutors" ON public.tutors;
CREATE POLICY "Allow public read access to tutors" ON public.tutors
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow tutors to upsert their own row" ON public.tutors;
CREATE POLICY "Allow tutors to upsert their own row" ON public.tutors
    FOR ALL USING (auth.uid() = id);

-- Attendance Policies
DROP POLICY IF EXISTS "Allow tutors to manage their attendance" ON public.attendance;
CREATE POLICY "Allow tutors to manage their attendance" ON public.attendance
    FOR ALL USING (auth.uid() = tutor_id);

DROP POLICY IF EXISTS "Allow users to view attendance list" ON public.attendance;
CREATE POLICY "Allow users to view attendance list" ON public.attendance
    FOR SELECT USING (true);

-- Progress Reports Policies
DROP POLICY IF EXISTS "Allow read access to progress reports" ON public.progress_reports;
CREATE POLICY "Allow read access to progress reports" ON public.progress_reports
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow tutors to insert progress reports" ON public.progress_reports;
CREATE POLICY "Allow tutors to insert progress reports" ON public.progress_reports
    FOR INSERT WITH CHECK (auth.uid() = tutor_id);

-- Reviews Policies
DROP POLICY IF EXISTS "Allow read access to reviews" ON public.reviews;
CREATE POLICY "Allow read access to reviews" ON public.reviews
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow parents to insert reviews" ON public.reviews;
CREATE POLICY "Allow parents to insert reviews" ON public.reviews
    FOR INSERT WITH CHECK (auth.uid() = parent_id);

-- Messages Policies
DROP POLICY IF EXISTS "Allow read access to messages" ON public.messages;
CREATE POLICY "Allow read access to messages" ON public.messages
    FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

DROP POLICY IF EXISTS "Allow authenticated users to send messages" ON public.messages;
CREATE POLICY "Allow authenticated users to send messages" ON public.messages
    FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Payments Policies
DROP POLICY IF EXISTS "Allow users to view their related payments" ON public.payments;
CREATE POLICY "Allow users to view their related payments" ON public.payments
    FOR SELECT USING (auth.uid() = tutor_id OR auth.uid() = parent_id);

-- Tutor Locations Policies
DROP POLICY IF EXISTS "Allow public read access to locations" ON public.tutor_locations;
CREATE POLICY "Allow public read access to locations" ON public.tutor_locations
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow tutors to update their own location" ON public.tutor_locations;
CREATE POLICY "Allow tutors to update their own location" ON public.tutor_locations
    FOR ALL USING (auth.uid() = tutor_id);


-- ====================================================================
-- AUTOMATION TRIGGER (Copy signup metadata to profiles)
-- ====================================================================

-- Function to handle user profile creation upon signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, name, role, avatar, verified)
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
        COALESCE(new.raw_user_meta_data->>'role', 'parent'),
        CASE 
            WHEN COALESCE(new.raw_user_meta_data->>'role', 'parent') = 'tutor' 
            THEN 'https://api.dicebear.com/9.x/notionists/svg?seed=Anya'
            ELSE 'https://api.dicebear.com/9.x/notionists/svg?seed=Jack'
        END,
        FALSE
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to run handle_new_user function on insert into auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ====================================================================
-- ENABLE REALTIME WEBSOCKET SUBSCRIPTIONS
-- ====================================================================

-- Enable full identity replica for messaging and locations tracking
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.tutor_locations REPLICA IDENTITY FULL;

-- Add tables to the realtime publication
DROP PUBLICATION IF EXISTS supabase_realtime CASCADE;
CREATE PUBLICATION supabase_realtime FOR TABLE public.messages, public.tutor_locations;
