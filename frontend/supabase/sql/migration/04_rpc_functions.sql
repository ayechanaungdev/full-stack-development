-- Function to check if an email exists in auth.users and its confirmation status
-- Returns: 0 (Available), 1 (Confirmed/Taken), 2 (Unconfirmed/Needs Verify)
-- This is needed because the auth schema is not queryable from the client side.
CREATE OR REPLACE FUNCTION public.check_email_exists(email_to_check TEXT)
RETURNS INT AS $$
DECLARE
  user_status INT;
BEGIN
  SELECT 
    CASE 
      WHEN email_confirmed_at IS NOT NULL THEN 1 
      ELSE 2 
    END INTO user_status
  FROM auth.users 
  WHERE email = email_to_check 
  LIMIT 1;

  RETURN COALESCE(user_status, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


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
