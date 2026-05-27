-- 01_schema.sql
-- Provisioning schema for EduForge backend migration

-- Enable UUID generation extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles Table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT,
    bio TEXT DEFAULT '',
    role_title TEXT DEFAULT 'Learner',
    profile_image_url TEXT DEFAULT '',
    location TEXT DEFAULT '',
    timezone TEXT DEFAULT '',
    website TEXT DEFAULT '',
    verified BOOLEAN DEFAULT true,
    skills TEXT[] DEFAULT '{}'::TEXT[],
    socials JSONB DEFAULT '{}'::jsonb
);

-- 2. User Stats Table
CREATE TABLE public.user_stats (
    profile_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    xp_score INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    watch_time_seconds INTEGER DEFAULT 0,
    streak INTEGER DEFAULT 0,
    streak_dates TEXT[] DEFAULT '{}'::TEXT[]
);

-- 3. Notes Table
CREATE TABLE public.notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    video_id TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    is_private BOOLEAN DEFAULT false NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_profile_video_note UNIQUE (profile_id, video_id)
);

-- 4. Roadmaps Table
CREATE TABLE public.roadmaps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    skill TEXT NOT NULL,
    nodes JSONB NOT NULL,
    edges JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Activity Table
CREATE TABLE public.activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    video_id TEXT NOT NULL,
    title TEXT NOT NULL,
    channel_title TEXT,
    status TEXT DEFAULT 'Watched',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for performance optimizations
CREATE INDEX idx_notes_profile_video ON public.notes(profile_id, video_id);
CREATE INDEX idx_roadmaps_profile ON public.roadmaps(profile_id);
CREATE INDEX idx_activity_profile ON public.activity(profile_id);
CREATE INDEX idx_user_stats_xp ON public.user_stats(xp_score DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Profiles Policies
CREATE POLICY "Public profiles are viewable by everyone" 
ON public.profiles FOR SELECT 
USING (true);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);

-- User Stats Policies
CREATE POLICY "Stats are viewable by everyone" 
ON public.user_stats FOR SELECT 
USING (true);

CREATE POLICY "Users can update their own stats" 
ON public.user_stats FOR UPDATE 
USING (auth.uid() = profile_id);

CREATE POLICY "Users can insert their own stats" 
ON public.user_stats FOR INSERT 
WITH CHECK (auth.uid() = profile_id);

-- Notes Policies
CREATE POLICY "Users can view their own notes or public notes" 
ON public.notes FOR SELECT 
USING (auth.uid() = profile_id OR NOT is_private);

CREATE POLICY "Users can insert their own notes" 
ON public.notes FOR INSERT 
WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can update their own notes" 
ON public.notes FOR UPDATE 
USING (auth.uid() = profile_id);

CREATE POLICY "Users can delete their own notes" 
ON public.notes FOR DELETE 
USING (auth.uid() = profile_id);

-- Roadmaps Policies
CREATE POLICY "Users can view their own roadmaps" 
ON public.roadmaps FOR SELECT 
USING (auth.uid() = profile_id);

CREATE POLICY "Users can insert their own roadmaps" 
ON public.roadmaps FOR INSERT 
WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can update their own roadmaps" 
ON public.roadmaps FOR UPDATE 
USING (auth.uid() = profile_id);

CREATE POLICY "Users can delete their own roadmaps" 
ON public.roadmaps FOR DELETE 
USING (auth.uid() = profile_id);

-- Activity Policies
CREATE POLICY "Users can view their own activity logs" 
ON public.activity FOR SELECT 
USING (auth.uid() = profile_id);

CREATE POLICY "Users can insert their own activity logs" 
ON public.activity FOR INSERT 
WITH CHECK (auth.uid() = profile_id);

-- Trigger to automatically create a profile and user_stats row on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
  counter INTEGER := 1;
BEGIN
  -- Generate a base username from metadata or email
  base_username := LOWER(COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)));
  final_username := base_username;

  -- Ensure username only contains alphanumeric characters and underscores
  final_username := regexp_replace(final_username, '[^a-z0-9_]', '', 'g');
  
  -- Guarantee length requirements
  IF length(final_username) < 3 THEN
    final_username := final_username || 'user';
  END IF;
  IF length(final_username) > 20 THEN
    final_username := substring(final_username from 1 for 20);
  END IF;
  
  base_username := final_username;

  -- Resolve duplicate username collisions
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) LOOP
    final_username := substring(base_username from 1 for (20 - length(counter::text) - 1)) || '_' || counter;
    counter := counter + 1;
  END LOOP;

  -- Insert profile, fallback to metadata values
  INSERT INTO public.profiles (
    id, 
    username, 
    display_name, 
    profile_image_url, 
    verified, 
    skills, 
    socials
  )
  VALUES (
    new.id,
    final_username,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', final_username),
    COALESCE(new.raw_user_meta_data->>'avatar_url', ''),
    true,
    '{}'::TEXT[],
    '{}'::JSONB
  )
  ON CONFLICT (id) DO NOTHING;

  -- Insert user stats
  INSERT INTO public.user_stats (
    profile_id, 
    xp_score, 
    level, 
    watch_time_seconds, 
    streak, 
    streak_dates
  )
  VALUES (
    new.id, 
    0, 
    1, 
    0, 
    1, 
    ARRAY[current_date::text]
  )
  ON CONFLICT (profile_id) DO NOTHING;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
