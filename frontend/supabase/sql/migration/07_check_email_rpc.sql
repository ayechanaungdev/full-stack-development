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
