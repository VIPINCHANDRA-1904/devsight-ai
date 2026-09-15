-- ══════════════════════════════════════════════════════════
-- DEVSIGHTAI — Supabase Auth & Profiles Integration
-- ══════════════════════════════════════════════════════════
-- Run this SQL in the Supabase Dashboard SQL Editor.
-- Integrates with Supabase's built-in auth.users service.
-- ══════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────
-- 1. PROFILES TABLE — Application user profiles linked to auth.users
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'developer'
        CHECK (role IN ('developer', 'devops', 'qa', 'manager', 'admin')),
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookup by email or role
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- ──────────────────────────────────────────────
-- 2. ROW LEVEL SECURITY (RLS) FOR PROFILES
-- ──────────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all profiles (needed for team member views and assignment)
CREATE POLICY "Allow authenticated read on profiles" ON public.profiles
    FOR SELECT TO authenticated USING (true);

-- Allow public read so client can query role if needed
CREATE POLICY "Allow anon read on profiles" ON public.profiles
    FOR SELECT TO anon USING (true);

-- Allow users to update only their own profile (wrapped in SELECT for InitPlan performance optimization)
DROP POLICY IF EXISTS "Allow users to update own profile" ON public.profiles;
CREATE POLICY "Allow users to update own profile" ON public.profiles
    FOR UPDATE TO authenticated
    USING ((select auth.uid()) = id)
    WITH CHECK ((select auth.uid()) = id);

-- Allow service_role key full access
CREATE POLICY "Allow service_role full access on profiles" ON public.profiles
    FOR ALL TO service_role USING (true);

-- ──────────────────────────────────────────────
-- 3. AUTOMATIC PROFILE CREATION TRIGGER
-- ──────────────────────────────────────────────
-- Automatically creates a public.profiles record whenever a new user signs up in auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'role', 'developer')
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
        role = COALESCE(EXCLUDED.role, public.profiles.role),
        updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Revoke public execution of this trigger function so it cannot be invoked via RPC API
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;

-- Drop trigger if already exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
