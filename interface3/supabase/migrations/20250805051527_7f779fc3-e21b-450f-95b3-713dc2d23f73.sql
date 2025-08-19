-- Create feedbackinterface3 table for anonymous session feedback
CREATE TABLE public.feedbackinterface3 (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  feedback_text TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on feedbackinterface3 table
ALTER TABLE public.feedbackinterface3 ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anonymous users to insert feedback
CREATE POLICY "Enable insert for anonymous feedback" 
ON public.feedbackinterface3 
FOR INSERT 
WITH CHECK (true);

-- Create policy to allow reading feedback (for admin purposes)
CREATE POLICY "Enable read access for feedback" 
ON public.feedbackinterface3 
FOR SELECT 
USING (true);