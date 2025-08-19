-- Fix security warning by setting search_path for the function
CREATE OR REPLACE FUNCTION public.check_token_used(token_value TEXT)
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.votes 
    WHERE token = token_value
  );
END;
$$;