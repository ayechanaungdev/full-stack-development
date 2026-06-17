CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create a profile once the email is confirmed (or immediately if auto-confirm is on)
  IF NEW.email_confirmed_at IS NOT NULL THEN
    INSERT INTO public.profiles (
      id, 
      full_name, 
      phone, 
      role, 
      avatar_url, 
      nrc, 
      gender, 
      postal_code, 
      location
    )
    VALUES (
      NEW.id, 
      NEW.raw_user_meta_data->>'full_name', 
      NEW.raw_user_meta_data->>'phone',
      NEW.raw_user_meta_data->>'role',
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'nrc',
      NEW.raw_user_meta_data->>'gender',
      NEW.raw_user_meta_data->>'postal_code',
      NEW.raw_user_meta_data->>'location'
    )
    ON CONFLICT (id) DO UPDATE SET
      full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
      phone = COALESCE(public.profiles.phone, EXCLUDED.phone),
      avatar_url = COALESCE(public.profiles.avatar_url, EXCLUDED.avatar_url),
      role = COALESCE(public.profiles.role, EXCLUDED.role, 'renter'),
      nrc = COALESCE(public.profiles.nrc, EXCLUDED.nrc),
      gender = COALESCE(public.profiles.gender, EXCLUDED.gender),
      postal_code = COALESCE(public.profiles.postal_code, EXCLUDED.postal_code),
      location = COALESCE(public.profiles.location, EXCLUDED.location);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- The trigger needs to run on both INSERT (for Google users) and UPDATE (for Email users)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
