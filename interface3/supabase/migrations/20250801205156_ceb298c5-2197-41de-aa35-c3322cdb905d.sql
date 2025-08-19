-- Fix the existing function's search path
CREATE OR REPLACE FUNCTION public.set_eligibility()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.eligible := NEW.age >= 18;
  RETURN NEW;
END;
$$;