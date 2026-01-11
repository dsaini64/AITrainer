-- Initial database schema for Longevity Coach App
-- This file contains the complete database structure

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types
CREATE TYPE goal_category AS ENUM ('sleep', 'movement', 'nutrition', 'stress', 'body', 'cognitive');
CREATE TYPE habit_level AS ENUM ('starter', 'solid', 'stretch');
CREATE TYPE habit_frequency AS ENUM ('daily', 'weekly', 'custom');
CREATE TYPE metric_type AS ENUM (
  'sleep_duration', 'sleep_efficiency', 'hrv', 'resting_hr', 'steps', 
  'zone2_minutes', 'protein', 'hydration', 'mood', 'energy', 'weight',
  'body_fat', 'muscle_mass', 'vo2_max', 'blood_pressure_systolic',
  'blood_pressure_diastolic', 'glucose', 'ketones'
);
CREATE TYPE data_quality AS ENUM ('high', 'medium', 'low');
CREATE TYPE device_type AS ENUM ('wearable', 'scale', 'app', 'manual');
CREATE TYPE device_status AS ENUM ('connected', 'syncing', 'attention', 'disconnected');
CREATE TYPE coach_message_type AS ENUM ('user', 'coach');
CREATE TYPE coach_mode AS ENUM ('explain', 'plan', 'motivate', 'checkin');
CREATE TYPE coach_action_type AS ENUM ('checklist', 'timer', 'reminder', 'schedule');
CREATE TYPE program_task_type AS ENUM ('nutrition', 'training', 'recovery', 'mindset');
CREATE TYPE unit_system AS ENUM ('metric', 'imperial');
CREATE TYPE time_format AS ENUM ('12h', '24h');

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User preferences
CREATE TABLE public.user_preferences (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  units unit_system DEFAULT 'metric',
  time_format time_format DEFAULT '24h',
  quiet_hours_start TIME DEFAULT '22:00',
  quiet_hours_end TIME DEFAULT '07:00',
  notifications_morning BOOLEAN DEFAULT true,
  notifications_evening BOOLEAN DEFAULT true,
  notifications_nudges BOOLEAN DEFAULT true,
  timezone TEXT DEFAULT 'UTC',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Goals table
CREATE TABLE public.goals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  category goal_category NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  target DECIMAL(10,2) NOT NULL,
  unit TEXT NOT NULL,
  baseline DECIMAL(10,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habits table
CREATE TABLE public.habits (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  goal_id UUID REFERENCES public.goals(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  level habit_level NOT NULL DEFAULT 'starter',
  frequency habit_frequency NOT NULL DEFAULT 'daily',
  target_value DECIMAL(10,2) NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT 'times',
  adherence DECIMAL(5,2) DEFAULT 0 CHECK (adherence >= 0 AND adherence <= 100),
  streak INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Metrics table for health data
CREATE TABLE public.metrics (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  type metric_type NOT NULL,
  value DECIMAL(10,2) NOT NULL,
  unit TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual',
  quality data_quality DEFAULT 'medium',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Daily check-ins
CREATE TABLE public.check_ins (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  mood INTEGER CHECK (mood >= 1 AND mood <= 5),
  energy INTEGER CHECK (energy >= 1 AND energy <= 5),
  soreness INTEGER CHECK (soreness >= 1 AND soreness <= 5),
  cravings BOOLEAN DEFAULT false,
  alcohol_units INTEGER DEFAULT 0 CHECK (alcohol_units >= 0),
  notes TEXT,
  gratitude TEXT,
  win_of_day TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Coach messages
CREATE TABLE public.coach_messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  type coach_message_type NOT NULL,
  content TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  mode coach_mode,
  actions JSONB,
  citations TEXT[],
  is_safety_card BOOLEAN DEFAULT false,
  context_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Coach actions (embedded in messages)
CREATE TABLE public.coach_actions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  message_id UUID REFERENCES public.coach_messages(id) ON DELETE CASCADE NOT NULL,
  type coach_action_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  completed BOOLEAN DEFAULT false,
  due_date TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Devices for health data integration
CREATE TABLE public.devices (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type device_type NOT NULL,
  status device_status DEFAULT 'disconnected',
  last_sync TIMESTAMP WITH TIME ZONE,
  data_quality data_quality DEFAULT 'medium',
  connection_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Programs/Plans
CREATE TABLE public.programs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  duration_weeks INTEGER NOT NULL DEFAULT 4,
  category TEXT NOT NULL,
  adherence DECIMAL(5,2) DEFAULT 0 CHECK (adherence >= 0 AND adherence <= 100),
  is_active BOOLEAN DEFAULT false,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Program weeks
CREATE TABLE public.program_weeks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE NOT NULL,
  week_number INTEGER NOT NULL,
  reading_materials TEXT[],
  review_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(program_id, week_number)
);

-- Program tasks
CREATE TABLE public.program_tasks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  week_id UUID REFERENCES public.program_weeks(id) ON DELETE CASCADE NOT NULL,
  type program_task_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  completed BOOLEAN DEFAULT false,
  due_date DATE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habit completions tracking
CREATE TABLE public.habit_completions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  habit_id UUID REFERENCES public.habits(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  completed BOOLEAN DEFAULT true,
  value DECIMAL(10,2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(habit_id, date)
);

-- Create indexes for performance
CREATE INDEX idx_metrics_user_timestamp ON public.metrics(user_id, timestamp DESC);
CREATE INDEX idx_metrics_type_timestamp ON public.metrics(type, timestamp DESC);
CREATE INDEX idx_coach_messages_user_timestamp ON public.coach_messages(user_id, timestamp DESC);
CREATE INDEX idx_goals_user_active ON public.goals(user_id, is_active);
CREATE INDEX idx_habits_goal_active ON public.habits(goal_id, is_active);
CREATE INDEX idx_check_ins_user_date ON public.check_ins(user_id, date DESC);
CREATE INDEX idx_habit_completions_habit_date ON public.habit_completions(habit_id, date DESC);
CREATE INDEX idx_devices_user_status ON public.devices(user_id, status);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON public.user_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_goals_updated_at BEFORE UPDATE ON public.goals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_habits_updated_at BEFORE UPDATE ON public.habits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_check_ins_updated_at BEFORE UPDATE ON public.check_ins FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_coach_actions_updated_at BEFORE UPDATE ON public.coach_actions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_devices_updated_at BEFORE UPDATE ON public.devices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_programs_updated_at BEFORE UPDATE ON public.programs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_program_tasks_updated_at BEFORE UPDATE ON public.program_tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_completions ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Users can only access their own data
CREATE POLICY "Users can view own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can manage own preferences" ON public.user_preferences FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own goals" ON public.goals FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own habits" ON public.habits FOR ALL USING (auth.uid() = (SELECT user_id FROM public.goals WHERE id = goal_id));
CREATE POLICY "Users can manage own metrics" ON public.metrics FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own check-ins" ON public.check_ins FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own coach messages" ON public.coach_messages FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own coach actions" ON public.coach_actions FOR ALL USING (auth.uid() = (SELECT user_id FROM public.coach_messages WHERE id = message_id));
CREATE POLICY "Users can manage own devices" ON public.devices FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own programs" ON public.programs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own program weeks" ON public.program_weeks FOR ALL USING (auth.uid() = (SELECT user_id FROM public.programs WHERE id = program_id));
CREATE POLICY "Users can manage own program tasks" ON public.program_tasks FOR ALL USING (auth.uid() = (SELECT p.user_id FROM public.programs p JOIN public.program_weeks pw ON p.id = pw.program_id WHERE pw.id = week_id));
CREATE POLICY "Users can manage own habit completions" ON public.habit_completions FOR ALL USING (auth.uid() = user_id);

-- Function to create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email));
  
  INSERT INTO public.user_preferences (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to calculate habit adherence
CREATE OR REPLACE FUNCTION calculate_habit_adherence(habit_uuid UUID, days_back INTEGER DEFAULT 30)
RETURNS DECIMAL AS $$
DECLARE
  total_days INTEGER;
  completed_days INTEGER;
  adherence_rate DECIMAL;
BEGIN
  -- Calculate total expected days based on habit frequency
  SELECT 
    CASE 
      WHEN h.frequency = 'daily' THEN days_back
      WHEN h.frequency = 'weekly' THEN CEIL(days_back / 7.0)
      ELSE days_back -- custom frequency defaults to daily
    END INTO total_days
  FROM public.habits h 
  WHERE h.id = habit_uuid;
  
  -- Count completed days
  SELECT COUNT(*)
  INTO completed_days
  FROM public.habit_completions hc
  WHERE hc.habit_id = habit_uuid 
    AND hc.completed = true
    AND hc.date >= CURRENT_DATE - INTERVAL '1 day' * days_back;
  
  -- Calculate adherence rate
  IF total_days > 0 THEN
    adherence_rate := (completed_days::DECIMAL / total_days::DECIMAL) * 100;
  ELSE
    adherence_rate := 0;
  END IF;
  
  RETURN ROUND(adherence_rate, 2);
END;
$$ LANGUAGE plpgsql;

-- Function to update habit streaks
CREATE OR REPLACE FUNCTION update_habit_streak(habit_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  current_streak INTEGER := 0;
  check_date DATE := CURRENT_DATE;
  habit_freq habit_frequency;
BEGIN
  -- Get habit frequency
  SELECT frequency INTO habit_freq FROM public.habits WHERE id = habit_uuid;
  
  -- Calculate streak based on frequency
  LOOP
    -- Check if habit was completed on check_date
    IF EXISTS (
      SELECT 1 FROM public.habit_completions 
      WHERE habit_id = habit_uuid 
        AND date = check_date 
        AND completed = true
    ) THEN
      current_streak := current_streak + 1;
      
      -- Move to previous period based on frequency
      IF habit_freq = 'daily' THEN
        check_date := check_date - INTERVAL '1 day';
      ELSIF habit_freq = 'weekly' THEN
        check_date := check_date - INTERVAL '7 days';
      ELSE
        check_date := check_date - INTERVAL '1 day'; -- default to daily
      END IF;
    ELSE
      EXIT; -- Break streak
    END IF;
  END LOOP;
  
  -- Update the habit with new streak
  UPDATE public.habits 
  SET streak = current_streak, updated_at = NOW()
  WHERE id = habit_uuid;
  
  RETURN current_streak;
END;
$$ LANGUAGE plpgsql;

-- Sample data for development
INSERT INTO auth.users (id, email, raw_user_meta_data, created_at, updated_at) 
VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'demo@longevitycoach.app',
  '{"name": "Demo User"}',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- The trigger will automatically create the user profile and preferences