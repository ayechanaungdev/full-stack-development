-- Add a unique constraint on the phone column to ensure no duplicate phone numbers
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_phone_unique UNIQUE (phone);