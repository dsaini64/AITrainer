-- Create completed_actions table to store user action completions
CREATE TABLE public.completed_actions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,
  type TEXT NOT NULL,
  message_id TEXT,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX idx_completed_actions_user_id ON public.completed_actions(user_id);
CREATE INDEX idx_completed_actions_completed_at ON public.completed_actions(completed_at);

-- Enable RLS
ALTER TABLE public.completed_actions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own completed actions" ON public.completed_actions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own completed actions" ON public.completed_actions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own completed actions" ON public.completed_actions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own completed actions" ON public.completed_actions
  FOR DELETE USING (auth.uid() = user_id);








