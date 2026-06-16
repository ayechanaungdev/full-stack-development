-- ============================================
-- SEED DATA FOR CAR RENTAL SYSTEM
-- ============================================
-- Replace these placeholders with the actual UUIDs from your Database/Dashboard:
-- RENTER1_UUID: <paste renter 1 UUID (Renter One)>
-- RENTER2_UUID: <paste renter 2 UUID (Renter Two)>
-- CAR1_UUID:    <paste car 1 UUID (Car 1)>
-- CAR2_UUID:    <paste car 2 UUID (Car 2)>
-- CAR3_UUID:    <paste car 3 UUID (Car 3)>
-- DRIVER1_UUID: <paste driver 1 UUID (Driver 1)>
-- DRIVER2_UUID: <paste driver 2 UUID (Driver 2)>

INSERT INTO public.bookings (customer_id, car_id, driver_id, start_date, end_date, total_price, pickup_location, dropoff_location, pickup_time, dropoff_time, status, created_at) VALUES
  ('<RENTER1_UUID>', '<CAR1_UUID>', '<DRIVER1_UUID>', CURRENT_DATE + INTERVAL '2 days', CURRENT_DATE + INTERVAL '4 days', 120000, 'Yangon Downtown', 'Insein', '09:00', '18:00', 'pending', NOW()),
  ('<RENTER1_UUID>', '<CAR2_UUID>', '<DRIVER2_UUID>', CURRENT_DATE + INTERVAL '3 days', CURRENT_DATE + INTERVAL '5 days', 150000, 'Bahan', 'Mayangone', '08:00', '17:00', 'approved', NOW()),
  ('<RENTER2_UUID>', '<CAR3_UUID>', '<DRIVER1_UUID>', CURRENT_DATE - INTERVAL '8 days', CURRENT_DATE - INTERVAL '6 days', 90000, 'Mandalay Center', 'Amarapura', '10:00', '16:00', 'completed', NOW()),
  ('<RENTER2_UUID>', '<CAR1_UUID>', '<DRIVER2_UUID>', CURRENT_DATE + INTERVAL '1 day', CURRENT_DATE + INTERVAL '2 days', 110000, 'Sanchaung', 'Hlaing', '09:00', '18:00', 'rejected', NOW()),
  ('<RENTER1_UUID>', '<CAR2_UUID>', '<DRIVER1_UUID>', CURRENT_DATE + INTERVAL '2 days', CURRENT_DATE + INTERVAL '3 days', 100000, 'Kamayut', 'Bahan', '07:30', '15:30', 'pending', NOW()),
  ('<RENTER2_UUID>', '<CAR3_UUID>', '<DRIVER2_UUID>', CURRENT_DATE + INTERVAL '4 days', CURRENT_DATE + INTERVAL '6 days', 180000, 'North Dagon', 'South Dagon', '09:00', '19:00', 'approved', NOW()),
  ('<RENTER1_UUID>', '<CAR1_UUID>', '<DRIVER1_UUID>', CURRENT_DATE - INTERVAL '13 days', CURRENT_DATE - INTERVAL '12 days', 80000, 'Yangon Airport', 'Downtown', '11:00', '14:00', 'completed', NOW()),
  ('<RENTER1_UUID>', '<CAR2_UUID>', '<DRIVER1_UUID>', CURRENT_DATE, CURRENT_DATE + INTERVAL '1 day', 95000, 'Insein', 'Hlaing Thar Yar', '08:00', '13:00', 'rejected', NOW()),
  ('<RENTER2_UUID>', '<CAR3_UUID>', '<DRIVER2_UUID>', CURRENT_DATE + INTERVAL '2 days', CURRENT_DATE + INTERVAL '5 days', 200000, 'Mawlamyine Rd', 'Yangon Port', '10:00', '20:00', 'pending', NOW()),
  ('<RENTER2_UUID>', '<CAR1_UUID>', '<DRIVER2_UUID>', CURRENT_DATE + INTERVAL '5 days', CURRENT_DATE + INTERVAL '7 days', 170000, 'Botahtaung', 'Yankin', '09:00', '18:00', 'approved', NOW());


-- ============================================
-- 5. REVIEWS SEED DATA (10 rows)
-- ============================================
INSERT INTO public.reviews (car_id, user_id, rating, comment, created_at) VALUES
  ('<CAR1_UUID>', '<RENTER1_UUID>', 5, 'Excellent experience. Very clean car and smooth ride.', NOW()),
  ('<CAR2_UUID>', '<RENTER2_UUID>', 4, 'Good service but pickup was slightly late.', NOW()),
  ('<CAR3_UUID>', '<RENTER2_UUID>', 5, 'Perfect condition car. Highly recommended!', NOW()),
  ('<CAR1_UUID>', '<RENTER2_UUID>', 3, 'Average experience, car was okay but not very clean.', NOW()),
  ('<CAR2_UUID>', '<RENTER1_UUID>', 2, 'Driver was late and communication was poor.', NOW()),
  ('<CAR3_UUID>', '<RENTER1_UUID>', 5, 'Amazing service, will book again.', NOW()),
  ('<CAR1_UUID>', '<RENTER2_UUID>', 4, 'Smooth drive and friendly driver.', NOW()),
  ('<CAR2_UUID>', '<RENTER1_UUID>', 1, 'Very bad experience, car had issues.', NOW()),
  ('<CAR3_UUID>', '<RENTER2_UUID>', 5, 'Outstanding condition and great support.', NOW()),
  ('<CAR1_UUID>', '<RENTER1_UUID>', 4, 'Overall good experience, satisfied with service.', NOW());