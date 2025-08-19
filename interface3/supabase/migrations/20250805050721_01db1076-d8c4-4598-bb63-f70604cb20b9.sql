-- Create tokens table to store valid tokens
CREATE TABLE public.tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token_value TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Enable RLS on tokens table
ALTER TABLE public.tokens ENABLE ROW LEVEL SECURITY;

-- Create policy to allow read access for token verification
CREATE POLICY "Enable read access for token verification" 
ON public.tokens 
FOR SELECT 
USING (true);

-- Update the check_token_used function to also verify token exists
CREATE OR REPLACE FUNCTION public.verify_token(token_value text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  token_exists boolean;
  token_used boolean;
BEGIN
  -- Check if token exists in tokens table
  SELECT EXISTS (
    SELECT 1 FROM public.tokens 
    WHERE token_value = verify_token.token_value AND is_active = true
  ) INTO token_exists;
  
  IF NOT token_exists THEN
    RETURN jsonb_build_object(
      'exists', false,
      'used', false,
      'message', 'Token does not exist'
    );
  END IF;
  
  -- Check if token has been used (exists in votes table)
  SELECT EXISTS (
    SELECT 1 FROM public.votes 
    WHERE token = verify_token.token_value
  ) INTO token_used;
  
  RETURN jsonb_build_object(
    'exists', true,
    'used', token_used,
    'message', CASE 
      WHEN token_used THEN 'Token has already been used'
      ELSE 'Token is valid and available'
    END
  );
END;
$function$