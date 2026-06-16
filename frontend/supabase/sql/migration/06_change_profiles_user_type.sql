-- 1. Remove the old constraint first so we can edit the data freely
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_role_check;

-- 2. Update all existing 'user' roles to 'renter' 
-- This ensures all rows comply with the new rule
UPDATE public.profiles 
SET role = 'renter' 
WHERE role = 'user';

-- 3. Now add the new constraint safely
-- Allowed values are now 'renter', 'car_owner', and 'admin'
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('renter', 'car_owner', 'admin'));

-- 4. Add a unique constraint on the phone column to ensure no duplicate phone numbers
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_phone_unique UNIQUE (phone);