-- 1. `car-images` (Public Read, Authenticated Upload)
CREATE POLICY "Public Access to Car Images" ON storage.objects FOR SELECT USING (bucket_id = 'car-images');
CREATE POLICY "Authenticated users can upload car images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'car-images' AND auth.role() = 'authenticated');

-- 2. `profiles` (Public Read, Authenticated Upload, Anon Upload for Signup)
CREATE POLICY "Public Access to Profiles" ON storage.objects FOR SELECT USING (bucket_id = 'profiles');
CREATE POLICY "Authenticated users can upload profile images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'profiles' AND auth.role() = 'authenticated');
-- Allow anon users to upload during signup (before email is verified, user isn't authenticated yet)
CREATE POLICY "Allow public upload for signup" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'profiles' AND auth.role() = 'anon');

-- 3. `licenses` (Private Read/Write to self only)
CREATE POLICY "Users can see their own licenses" ON storage.objects FOR SELECT USING (bucket_id = 'licenses' AND auth.uid() = (storage.foldername(name))[1]::uuid);
CREATE POLICY "Users can upload their own licenses" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'licenses' AND auth.role() = 'authenticated');

-- 4. `avatars` (Fully Public Read/Write for Signup Flow)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- This is needed because during Signup with Email OTP, the user is not yet "authenticated"
CREATE POLICY "Anyone can view avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Anyone can upload avatars" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars');
CREATE POLICY "Anyone can update avatars" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars');
CREATE POLICY "Anyone can delete avatars" ON storage.objects FOR DELETE USING (bucket_id = 'avatars');