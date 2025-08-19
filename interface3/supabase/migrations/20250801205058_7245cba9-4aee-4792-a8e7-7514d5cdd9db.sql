-- Add unique constraint to prevent duplicate votes with same token
ALTER TABLE public.votes ADD CONSTRAINT unique_token_vote UNIQUE (token);

-- Add index for faster token lookups
CREATE INDEX idx_votes_token ON public.votes(token);

-- Add a status column to track vote completion
ALTER TABLE public.votes ADD COLUMN status TEXT DEFAULT 'completed' CHECK (status IN ('completed', 'pending'));

-- Create function to check if token has been used
CREATE OR REPLACE FUNCTION public.check_token_used(token_value TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.votes 
    WHERE token = token_value
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;