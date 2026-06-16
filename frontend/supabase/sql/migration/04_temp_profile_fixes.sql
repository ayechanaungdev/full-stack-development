-- Allow NULLs to support different auth providers (like Google) while keeping metadata syncable
ALTER TABLE profiles ALTER COLUMN full_name DROP NOT NULL;
ALTER TABLE profiles ALTER COLUMN nrc DROP NOT NULL;
ALTER TABLE profiles ALTER COLUMN gender DROP NOT NULL;
ALTER TABLE profiles ALTER COLUMN postal_code DROP NOT NULL;
