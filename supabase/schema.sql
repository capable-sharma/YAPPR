-- ==========================================
-- YAPPR SUPABASE SCHEMA
-- ==========================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- ENUMS
-- ==========================================
CREATE TYPE user_role AS ENUM ('guest', 'free', 'premium', 'admin');
CREATE TYPE session_mode AS ENUM ('topic', 'debate', 'interview', 'vocab');
CREATE TYPE interview_category AS ENUM ('behavioral', 'product_management', 'consulting', 'engineering', 'mba', 'finance', 'sales');

-- ==========================================
-- TABLES
-- ==========================================

-- PROFILES
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    role user_role DEFAULT 'guest'::user_role NOT NULL,
    onboarding_completed BOOLEAN DEFAULT FALSE,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_practice_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- USAGE TRACKING (Limits & Quotas)
CREATE TABLE usage_tracking (
    user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    impromptu_count_today INTEGER DEFAULT 0,
    interview_count_today INTEGER DEFAULT 0,
    vocab_count_today INTEGER DEFAULT 0,
    last_reset_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- VOCABULARY LIBRARY
CREATE TABLE vocabulary_words (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    word TEXT UNIQUE NOT NULL,
    ipa TEXT,
    part_of_speech TEXT,
    definition TEXT NOT NULL,
    example_sentence TEXT NOT NULL,
    category TEXT NOT NULL,
    difficulty_level INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SESSIONS
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    mode session_mode NOT NULL,
    prompt TEXT NOT NULL,
    category TEXT,
    audio_url TEXT,
    transcript TEXT,
    duration_sec NUMERIC,
    wpm INTEGER,
    word_count INTEGER,
    clarity_score INTEGER,
    flow_score INTEGER,
    presence_score INTEGER,
    grammar_score INTEGER,
    content_score INTEGER,
    overall_score INTEGER,
    verdict TEXT,
    strengths JSONB DEFAULT '[]'::jsonb,
    weaknesses JSONB DEFAULT '[]'::jsonb,
    counter_points JSONB DEFAULT '[]'::jsonb,
    better_angle TEXT,
    ideal_rewrite TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- INTERVIEW SESSIONS (Multi-round)
CREATE TABLE interview_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    category interview_category NOT NULL,
    framework_used TEXT,
    status TEXT DEFAULT 'in_progress',
    overall_feedback TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- INTERVIEW MESSAGES
CREATE TABLE interview_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES interview_sessions(id) ON DELETE CASCADE,
    role TEXT CHECK (role IN ('interviewer', 'candidate')) NOT NULL,
    content TEXT NOT NULL,
    audio_url TEXT,
    duration_sec NUMERIC,
    scores JSONB,
    feedback TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE vocabulary_words ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_messages ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read and update their own profile
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Usage: Users can view their own usage
CREATE POLICY "Users can view own usage" ON usage_tracking FOR SELECT USING (auth.uid() = user_id);

-- Vocab: Anyone can read vocab words
CREATE POLICY "Anyone can view vocab words" ON vocabulary_words FOR SELECT USING (true);

-- Sessions: Users can CRUD their own sessions
CREATE POLICY "Users can manage own sessions" ON sessions FOR ALL USING (auth.uid() = user_id);

-- Interview: Users can manage own interviews
CREATE POLICY "Users can manage own interview sessions" ON interview_sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own interview messages" ON interview_messages FOR ALL USING (
    EXISTS (SELECT 1 FROM interview_sessions s WHERE s.id = session_id AND s.user_id = auth.uid())
);

-- ==========================================
-- TRIGGERS
-- ==========================================

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, role)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    'free'
  );
  
  INSERT INTO public.usage_tracking (user_id) VALUES (new.id);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Auto-update updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_modtime BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_usage_modtime BEFORE UPDATE ON usage_tracking FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_interview_sessions_modtime BEFORE UPDATE ON interview_sessions FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ==========================================
-- STORAGE
-- ==========================================
INSERT INTO storage.buckets (id, name, public) VALUES ('audio_recordings', 'audio_recordings', false) ON CONFLICT DO NOTHING;

CREATE POLICY "Users can upload own audio" ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'audio_recordings' AND (auth.uid()::text = (storage.foldername(name))[1])
);
CREATE POLICY "Users can view own audio" ON storage.objects FOR SELECT USING (
    bucket_id = 'audio_recordings' AND (auth.uid()::text = (storage.foldername(name))[1])
);
