-- Add actions column to coach_messages table
-- This column will store actions as JSONB for the coach functionality

ALTER TABLE public.coach_messages 
ADD COLUMN actions JSONB;

-- Add comment to document the column
COMMENT ON COLUMN public.coach_messages.actions IS 'Stores coach actions as JSONB array for embedded action functionality';
