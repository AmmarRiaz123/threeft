-- Drop the tokens table since we'll use feedback table instead
DROP TABLE IF EXISTS public.tokens;

-- Update the verify_token function to check feedback table
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
  -- Check if token exists in feedback table
  SELECT EXISTS (
    SELECT 1 FROM public.feedback 
    WHERE token = verify_token.token_value
  ) INTO token_exists;
  
  IF NOT token_exists THEN
    RETURN jsonb_build_object(
      'exists', false,
      'used', false,
      'message', 'No such token exists. Please enter a valid token.'
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
      WHEN token_used THEN 'This token has already been used for voting.'
      ELSE 'Token is valid and available for voting.'
    END
  );
END;
$function$