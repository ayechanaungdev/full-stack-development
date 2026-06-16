-- ============================================
-- SEED DATA FOR CAR RENTAL SYSTEM
-- ============================================
-- Replace these with actual UUIDs from Supabase Auth Dashboard:
-- OWNER3_UUID:  <paste owner3@cra.test UUID>
-- OWNER4_UUID:  <paste owner4@cra.test UUID>
-- OWNER5_UUID:  <paste owner5@cra.test UUID>

-- ============================================
-- 1. UPDATE PROFILES (auto-created by auth trigger)
-- ============================================
UPDATE profiles SET
  full_name = 'Owner Three',
  phone = '09444444444',
  nrc = '7/GHI(N)456465',
  gender = 'Male',
  postal_code = '05551',
  role = 'car_owner',
  is_active = true
WHERE id = '<OWNER3_UUID>';
UPDATE profiles SET
  full_name = 'Owner Four',
  phone = '09555555555',
  nrc = '8/GHI(N)456364',
  gender = 'Male',
  postal_code = '83754',
  role = 'car_owner',
  is_active = true
WHERE id = '<OWNER4_UUID>';
UPDATE profiles SET
  full_name = 'Owner Five',
  phone = '09666666666',
  nrc = '5/GHI(N)983433',
  gender = 'Female',
  postal_code = '45456',
  role = 'car_owner',
  is_active = true
WHERE id = '<OWNER5_UUID>';

-- ============================================
-- 2. INSERT CARS
-- ============================================
INSERT INTO cars (owner_id, brand, model, price_per_day, seats, car_type, status, location, postal_code, description, car_number, has_ac) VALUES
  ('<OWNER3_UUID>', 'Mazda', 'CX-5 2022', 60000, 5, 'SUV', 'Available', 'Naypyidaw, Zabuthiri', '05551', 'Stylish SUV with advanced safety features. Comfortable for long drives.', 'CAR001', true),
  ('<OWNER3_UUID>', 'Chevrolet', 'Malibu 2022', 60000, 5, 'Sedan', 'Available', 'Naypyidaw, Zabuthiri', '05551', 'Stylish SUV with advanced safety features. Comfortable for long drives.', 'CAR002', true),
  ('<OWNER4_UUID>', 'Ford', 'Ranger 2023', 75000, 5, 'Pickup', 'Unavailable', 'Yangon, Dagon Township', '11021', 'Rugged pickup truck. Perfect for off-road adventures.', 'CAR003', true),
  ('<OWNER4_UUID>', 'Honda', 'CR-V 2022', 65000, 7, 'SUV', 'Available', 'Yangon, Dagon Township', '11021', 'Reliable SUV with spacious interior. Great for family outings.', 'CAR004', true),
  ('<OWNER5_UUID>', 'Hyundai', 'Tucson 2022', 55000, 7, 'SUV', 'Available', 'Yangon, Bahan Township', '11031', 'Modern SUV with spacious interior. Great for family outings.', 'CAR005', true),
  ('<OWNER5_UUID>', 'Kia', 'Seltos 2022', 50000, 5, 'SUV', 'Available', 'Yangon, Bahan Township', '11031', 'Compact SUV with stylish design. Perfect for city and weekend trips.', 'CAR006', true),
  ('<OWNER5_UUID>', 'Ford', 'F-150 2022', 50000, 5, 'Pickup', 'Available', 'Yangon, Bahan Township', '11031', 'Compact SUV with stylish design. Perfect for city and weekend trips.', 'CAR007', true);

-- ============================================
-- 3. INSERT DRIVERS
-- ============================================
INSERT INTO drivers (owner_id, name, phone, gender, status, license_number, nrc, postal_code, location) VALUES
  ('<OWNER3_UUID>', 'Owner Three - Driver1', '09-999-999-999', 'Male', 'available', 'LIC001', 'NRC001', '05551', 'Naypyidaw, Zabuthiri'),
  ('<OWNER3_UUID>', 'Owner Three - Driver2', '09-999-999-999', 'Male', 'available', 'LIC002', 'NRC002', '05551', 'Naypyidaw, Zabuthiri'),
  ('<OWNER3_UUID>', 'Owner Three - Driver3', '09-999-999-999', 'Male', 'available', 'LIC003', 'NRC003', '05551', 'Naypyidaw, Zabuthiri'),
  ('<OWNER4_UUID>', 'Owner Four - Driver1', '09-000-000-000', 'Male', 'available', 'LIC004', 'NRC004', '11021', 'Yangon, Dagon Township'),
  ('<OWNER4_UUID>', 'Owner Four - Driver2', '09-000-000-000', 'Male', 'available', 'LIC005', 'NRC005', '11021', 'Yangon, Dagon Township'),
  ('<OWNER4_UUID>', 'Owner Four - Driver3', '09-000-000-000', 'Male', 'available', 'LIC006', 'NRC006', '11021', 'Yangon, Dagon Township'),
  ('<OWNER5_UUID>', 'Owner Five - Driver1', '09-111-111-111', 'Female', 'available', 'LIC007', 'NRC007', '11031', 'Yangon, Bahan Township'),
  ('<OWNER5_UUID>', 'Owner Five - Driver2', '09-111-111-111', 'Female', 'available', 'LIC008', 'NRC008', '11031', 'Yangon, Bahan Township');
