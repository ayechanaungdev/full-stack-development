-- ============================================
-- SEED DATA FOR CAR RENTAL SYSTEM
-- ============================================
-- Replace these with actual UUIDs from Supabase Auth Dashboard:
-- OWNER1_UUID:  <paste owner1@cra.test UUID>
-- OWNER2_UUID:  <paste owner2@cra.test UUID>
-- RENTER1_UUID: <paste renter1@cra.test UUID>
-- RENTER2_UUID: <paste renter2@cra.test UUID>

-- ============================================
-- 1. UPDATE PROFILES (auto-created by auth trigger)
-- ============================================
UPDATE profiles SET
  full_name = 'Aung Ko Ko',
  phone = '09222222222',
  nrc = '12/DEF(N)234567',
  gender = 'Male',
  postal_code = '11051',
  role = 'car_owner',
  is_active = true
WHERE id = '<OWNER1_UUID>';

UPDATE profiles SET
  full_name = 'Mya Mya Win',
  phone = '09333333333',
  nrc = '12/GHI(N)345678',
  gender = 'Female',
  postal_code = '05011',
  role = 'car_owner',
  is_active = true
WHERE id = '<OWNER2_UUID>';

UPDATE profiles SET
  full_name = 'Kyaw Zin Htet',
  phone = '09444444444',
  nrc = '12/JKL(N)456789',
  gender = 'Male',
  postal_code = '11041',
  role = 'renter',
  is_active = true
WHERE id = '<RENTER1_UUID>';

UPDATE profiles SET
  full_name = 'Su Su Htwe',
  phone = '09555555555',
  nrc = '12/MNO(N)567890',
  gender = 'Female',
  postal_code = '11051',
  role = 'renter',
  is_active = true
WHERE id = '<RENTER2_UUID>';

-- ============================================
-- 2. INSERT CARS
-- ============================================
INSERT INTO cars (owner_id, brand, model, price_per_day, seats, car_type, status, location, postal_code, description, car_number, has_ac) VALUES
  ('<OWNER1_UUID>', 'Toyota', 'Vios 2022', 45000, 5, 'Sedan', 'Available', 'Yangon, Hlaing Township', '11031', 'Well-maintained sedan, perfect for city driving. AC, Bluetooth, USB charging.', 'CAR001', true),
  ('<OWNER1_UUID>', 'Honda', 'Fit 2021', 40000, 5, 'Hatchback', 'Available', 'Yangon, Kamaryut Township', '11031', 'Compact hatchback, fuel-efficient. Ideal for daily commutes.', 'CAR002', true),
  ('<OWNER1_UUID>', 'Toyota', 'Hilux 2023', 80000, 5, 'Pickup', 'Unavailable', 'Yangon, Insein Township', '11031', 'Pickup truck for heavy-duty trips. 4WD, spacious cargo bed.', 'CAR003', true),
  ('<OWNER2_UUID>', 'Suzuki', 'Swift 2022', 35000, 5, 'Hatchback', 'Available', 'Mandalay, Chan Aye Thar Zan', '05551', 'Budget-friendly city car. Great fuel economy.', 'CAR004', true),
  ('<OWNER2_UUID>', 'Toyota', 'Alphard 2023', 120000, 7, 'Van', 'Available', 'Mandalay, Maha Aung Myay', '05011', 'Premium 7-seater van. Luxury interior, ideal for family trips.', 'CAR005', true);

-- ============================================
-- 3. INSERT DRIVERS (for Owner 1)
-- ============================================
INSERT INTO drivers (owner_id, name, phone, gender, status, license_number, nrc, postal_code, location) VALUES
  ('<OWNER1_UUID>', 'Min Thu', '09666666666', 'Male', 'available', 'LIC009', 'NRC009', '11051', 'Yangon, Hlaing Township'),
  ('<OWNER1_UUID>', 'Zaw Win', '09777777777', 'Male', 'available', 'LIC010', 'NRC010', '11051', 'Yangon, Hlaing Township');
