-- Function to check if a phone number is already registered.
-- It checks BOTH:
--   1. auth.users raw_user_meta_data (catches unverified/pending signups)
--   2. public.profiles (catches verified users)
-- Returns: true if phone exists, false if available.
-- SECURITY DEFINER is required to read the auth schema from the client.
CREATE OR REPLACE FUNCTION public.check_phone_exists(phone_to_check TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  found_in_auth BOOLEAN;
  found_in_profiles BOOLEAN;
BEGIN
  -- Check auth.users metadata (covers users who signed up but haven't verified yet)
  SELECT EXISTS (
    SELECT 1
    FROM auth.users
    WHERE raw_user_meta_data->>'phone' = phone_to_check
  ) INTO found_in_auth;

  -- Check profiles table (covers verified users)
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE phone = phone_to_check
  ) INTO found_in_profiles;

  RETURN found_in_auth OR found_in_profiles;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
