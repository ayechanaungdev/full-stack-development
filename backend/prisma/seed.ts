import { PrismaClient, BookingStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Clean existing data in reverse dependency order
  await prisma.review.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.wishlist.deleteMany();
  await prisma.message.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.inquiry.deleteMany();
  await prisma.dailyReport.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.carImage.deleteMany();
  await prisma.driver.deleteMany();
  await prisma.car.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.verificationToken.deleteMany();
  await prisma.user.deleteMany();

  const hash = await bcrypt.hash('password123', 10);

  // ── Users ──
  const owner1 = await prisma.user.create({
    data: { email: 'owner1@cra.test', password: hash, name: 'Aung Ko Ko', role: 'car_owner' },
  });
  const owner2 = await prisma.user.create({
    data: { email: 'owner2@cra.test', password: hash, name: 'Mya Mya Win', role: 'car_owner' },
  });
  const owner3 = await prisma.user.create({
    data: { email: 'owner3@cra.test', password: hash, name: 'Owner Three', role: 'car_owner' },
  });
  const owner4 = await prisma.user.create({
    data: { email: 'owner4@cra.test', password: hash, name: 'Owner Four', role: 'car_owner' },
  });
  const owner5 = await prisma.user.create({
    data: { email: 'owner5@cra.test', password: hash, name: 'Owner Five', role: 'car_owner' },
  });
  const renter1 = await prisma.user.create({
    data: { email: 'renter1@cra.test', password: hash, name: 'Kyaw Zin Htet', role: 'renter' },
  });
  const renter2 = await prisma.user.create({
    data: { email: 'renter2@cra.test', password: hash, name: 'Su Su Htwe', role: 'renter' },
  });

  // ── Profiles ──
  const profiles = [
    { id: owner1.id, full_name: 'Aung Ko Ko', phone: '09222222222', nrc: '12/DEF(N)234567', gender: 'Male', postal_code: '11051', is_active: true },
    { id: owner2.id, full_name: 'Mya Mya Win', phone: '09333333333', nrc: '12/GHI(N)345678', gender: 'Female', postal_code: '11111', is_active: true },
    { id: owner3.id, full_name: 'Owner Three', phone: '09777777771', nrc: '7/GHI(N)456465', gender: 'Male', postal_code: '11061', is_active: true },
    { id: owner4.id, full_name: 'Owner Four', phone: '09888888881', nrc: '8/GHI(N)456364', gender: 'Male', postal_code: '11191', is_active: true },
    { id: owner5.id, full_name: 'Owner Five', phone: '09999999991', nrc: '5/GHI(N)983433', gender: 'Female', postal_code: '11201', is_active: true },
    { id: renter1.id, full_name: 'Kyaw Zin Htet', phone: '09444444441', nrc: '12/JKL(N)456789', gender: 'Male', postal_code: '11041', is_active: true },
    { id: renter2.id, full_name: 'Su Su Htwe', phone: '09555555555', nrc: '12/MNO(N)567890', gender: 'Female', postal_code: '11051', is_active: true },
  ];
  for (const p of profiles) {
    await prisma.profile.create({ data: p });
  }

  // ── Cars ──
  // All postal_codes MUST be from yangon-townships.json so location filter works
  const carData = [
    { ownerId: owner1.id, brand: 'Toyota', model: 'Vios 2022', year: 2022, pricePerDay: 45000, seats: 5, car_type: 'Sedan', status: 'Available', location: 'Yangon, Hlaing', postal_code: '11051', description: 'Well-maintained sedan, perfect for city driving. AC, Bluetooth, USB charging.', car_number: 'CAR001', has_ac: true },
    { ownerId: owner1.id, brand: 'Honda', model: 'Fit 2021', year: 2021, pricePerDay: 40000, seats: 5, car_type: 'Hatchback', status: 'Available', location: 'Yangon, Kamayut', postal_code: '11041', description: 'Compact hatchback, fuel-efficient. Ideal for daily commutes.', car_number: 'CAR002', has_ac: true },
    { ownerId: owner1.id, brand: 'Toyota', model: 'Hilux 2023', year: 2023, pricePerDay: 80000, seats: 5, car_type: 'Pickup', status: 'Unavailable', location: 'Yangon, Insein', postal_code: '11011', description: 'Pickup truck for heavy-duty trips. 4WD, spacious cargo bed.', car_number: 'CAR003', has_ac: true },
    { ownerId: owner2.id, brand: 'Suzuki', model: 'Swift 2022', year: 2022, pricePerDay: 35000, seats: 5, car_type: 'Hatchback', status: 'Available', location: 'Yangon, Sanchaung', postal_code: '11111', description: 'Budget-friendly city car. Great fuel economy.', car_number: 'CAR004', has_ac: true },
    { ownerId: owner2.id, brand: 'Toyota', model: 'Alphard 2023', year: 2023, pricePerDay: 120000, seats: 7, car_type: 'Van', status: 'Available', location: 'Yangon, Tamwe', postal_code: '11211', description: 'Premium 7-seater van. Luxury interior, ideal for family trips.', car_number: 'CAR005', has_ac: true },
    { ownerId: owner3.id, brand: 'Mazda', model: 'CX-5 2022', year: 2022, pricePerDay: 60000, seats: 5, car_type: 'SUV', status: 'Available', location: 'Yangon, Mayangon', postal_code: '11061', description: 'Stylish SUV with advanced safety features. Comfortable for long drives.', car_number: 'CAR006', has_ac: true },
    { ownerId: owner3.id, brand: 'Chevrolet', model: 'Malibu 2022', year: 2022, pricePerDay: 60000, seats: 5, car_type: 'Sedan', status: 'Available', location: 'Yangon, Yankin', postal_code: '11081', description: 'Stylish sedan with advanced safety features.', car_number: 'CAR007', has_ac: true },
    { ownerId: owner4.id, brand: 'Ford', model: 'Ranger 2023', year: 2023, pricePerDay: 75000, seats: 5, car_type: 'Pickup', status: 'Unavailable', location: 'Yangon, Dagon', postal_code: '11191', description: 'Rugged pickup truck. Perfect for off-road adventures.', car_number: 'CAR008', has_ac: true },
    { ownerId: owner4.id, brand: 'Honda', model: 'CR-V 2022', year: 2022, pricePerDay: 65000, seats: 7, car_type: 'SUV', status: 'Available', location: 'Yangon, Thingangyun', postal_code: '11071', description: 'Reliable SUV with spacious interior. Great for family outings.', car_number: 'CAR009', has_ac: true },
    { ownerId: owner5.id, brand: 'Hyundai', model: 'Tucson 2022', year: 2022, pricePerDay: 55000, seats: 7, car_type: 'SUV', status: 'Available', location: 'Yangon, Bahan', postal_code: '11201', description: 'Modern SUV with spacious interior. Great for family outings.', car_number: 'CAR010', has_ac: true },
    { ownerId: owner5.id, brand: 'Kia', model: 'Seltos 2022', year: 2022, pricePerDay: 50000, seats: 5, car_type: 'SUV', status: 'Available', location: 'Yangon, Hlaing Tharyar', postal_code: '11401', description: 'Compact SUV with stylish design. Perfect for city and weekend trips.', car_number: 'CAR011', has_ac: true },
    { ownerId: owner5.id, brand: 'Ford', model: 'F-150 2022', year: 2022, pricePerDay: 50000, seats: 5, car_type: 'Pickup', status: 'Available', location: 'Yangon, South Okkalapa', postal_code: '11091', description: 'Sturdy pickup with great performance.', car_number: 'CAR012', has_ac: true },
  ];

  const createdCars = [];
  for (const c of carData) {
    const car = await prisma.car.create({ data: c });
    createdCars.push(car);
    // Create a placeholder car image for each car
    await prisma.carImage.create({
      data: { carId: car.id, image_url: 'https://placehold.co/400x300/16a8e3/white?text=' + encodeURIComponent(c.brand + ' ' + c.model), is_primary: true },
    });
  }

  const [car1, car2, car3] = createdCars;

  // ── Drivers ──
  const driverData = [
    { ownerId: owner1.id, name: 'Min Thu', phone: '09666666666', gender: 'Male', status: 'available', license_number: 'LIC009', nrc: 'NRC009', postal_code: '11051', location: 'Yangon, Hlaing' },
    { ownerId: owner1.id, name: 'Zaw Win', phone: '09777777777', gender: 'Male', status: 'available', license_number: 'LIC010', nrc: 'NRC010', postal_code: '11051', location: 'Yangon, Hlaing' },
    { ownerId: owner3.id, name: 'Owner Three - Driver1', phone: '09-999-999-999', gender: 'Male', status: 'available', license_number: 'LIC001', nrc: 'NRC001', postal_code: '11061', location: 'Yangon, Mayangon' },
    { ownerId: owner3.id, name: 'Owner Three - Driver2', phone: '09-999-999-999', gender: 'Male', status: 'available', license_number: 'LIC002', nrc: 'NRC002', postal_code: '11061', location: 'Yangon, Mayangon' },
    { ownerId: owner3.id, name: 'Owner Three - Driver3', phone: '09-999-999-999', gender: 'Male', status: 'available', license_number: 'LIC003', nrc: 'NRC003', postal_code: '11061', location: 'Yangon, Mayangon' },
    { ownerId: owner4.id, name: 'Owner Four - Driver1', phone: '09-000-000-000', gender: 'Male', status: 'available', license_number: 'LIC004', nrc: 'NRC004', postal_code: '11191', location: 'Yangon, Dagon' },
    { ownerId: owner4.id, name: 'Owner Four - Driver2', phone: '09-000-000-000', gender: 'Male', status: 'available', license_number: 'LIC005', nrc: 'NRC005', postal_code: '11191', location: 'Yangon, Dagon' },
    { ownerId: owner4.id, name: 'Owner Four - Driver3', phone: '09-000-000-000', gender: 'Male', status: 'available', license_number: 'LIC006', nrc: 'NRC006', postal_code: '11191', location: 'Yangon, Dagon' },
    { ownerId: owner5.id, name: 'Owner Five - Driver1', phone: '09-111-111-111', gender: 'Female', status: 'available', license_number: 'LIC007', nrc: 'NRC007', postal_code: '11201', location: 'Yangon, Bahan' },
    { ownerId: owner5.id, name: 'Owner Five - Driver2', phone: '09-111-111-111', gender: 'Female', status: 'available', license_number: 'LIC008', nrc: 'NRC008', postal_code: '11201', location: 'Yangon, Bahan' },
  ];
  const createdDrivers = [];
  for (const d of driverData) {
    const driver = await prisma.driver.create({ data: d });
    createdDrivers.push(driver);
  }
  const [driver1, driver2] = createdDrivers;

  // ── Bookings ──
  const now = new Date();
  const day = (offset: number) => { const d = new Date(now); d.setDate(d.getDate() + offset); return d; };

  const bookingData = [
    { userId: renter1.id, carId: car1.id, driverId: driver1.id, startDate: day(2), endDate: day(4), totalPrice: 120000, pickupLocation: 'Yangon Downtown', dropoffLocation: 'Insein', pickupTime: '09:00', dropoffTime: '18:00', status: BookingStatus.PENDING },
    { userId: renter1.id, carId: car2.id, driverId: driver2.id, startDate: day(3), endDate: day(5), totalPrice: 150000, pickupLocation: 'Bahan', dropoffLocation: 'Mayangone', pickupTime: '08:00', dropoffTime: '17:00', status: BookingStatus.APPROVED },
    { userId: renter2.id, carId: car3.id, driverId: driver1.id, startDate: day(-8), endDate: day(-6), totalPrice: 90000, pickupLocation: 'Mandalay Center', dropoffLocation: 'Amarapura', pickupTime: '10:00', dropoffTime: '16:00', status: BookingStatus.COMPLETED },
    { userId: renter2.id, carId: car1.id, driverId: driver2.id, startDate: day(1), endDate: day(2), totalPrice: 110000, pickupLocation: 'Sanchaung', dropoffLocation: 'Hlaing', pickupTime: '09:00', dropoffTime: '18:00', status: BookingStatus.REJECTED },
    { userId: renter1.id, carId: car2.id, driverId: driver1.id, startDate: day(2), endDate: day(3), totalPrice: 100000, pickupLocation: 'Kamayut', dropoffLocation: 'Bahan', pickupTime: '07:30', dropoffTime: '15:30', status: BookingStatus.PENDING },
    { userId: renter2.id, carId: car3.id, driverId: driver2.id, startDate: day(4), endDate: day(6), totalPrice: 180000, pickupLocation: 'North Dagon', dropoffLocation: 'South Dagon', pickupTime: '09:00', dropoffTime: '19:00', status: BookingStatus.APPROVED },
    { userId: renter1.id, carId: car1.id, driverId: driver1.id, startDate: day(-13), endDate: day(-12), totalPrice: 80000, pickupLocation: 'Yangon Airport', dropoffLocation: 'Downtown', pickupTime: '11:00', dropoffTime: '14:00', status: BookingStatus.COMPLETED },
    { userId: renter1.id, carId: car2.id, driverId: driver1.id, startDate: day(0), endDate: day(1), totalPrice: 95000, pickupLocation: 'Insein', dropoffLocation: 'Hlaing Thar Yar', pickupTime: '08:00', dropoffTime: '13:00', status: BookingStatus.REJECTED },
    { userId: renter2.id, carId: car3.id, driverId: driver2.id, startDate: day(2), endDate: day(5), totalPrice: 200000, pickupLocation: 'Mawlamyine Rd', dropoffLocation: 'Yangon Port', pickupTime: '10:00', dropoffTime: '20:00', status: BookingStatus.PENDING },
    { userId: renter2.id, carId: car1.id, driverId: driver2.id, startDate: day(5), endDate: day(7), totalPrice: 170000, pickupLocation: 'Botahtaung', dropoffLocation: 'Yankin', pickupTime: '09:00', dropoffTime: '18:00', status: BookingStatus.APPROVED },
  ];
  for (const b of bookingData) {
    await prisma.booking.create({ data: b });
  }

  // ── Reviews ──
  const reviewData = [
    { carId: car1.id, userId: renter1.id, rating: 5, comment: 'Excellent experience. Very clean car and smooth ride.' },
    { carId: car2.id, userId: renter2.id, rating: 4, comment: 'Good service but pickup was slightly late.' },
    { carId: car3.id, userId: renter2.id, rating: 5, comment: 'Perfect condition car. Highly recommended!' },
    { carId: car1.id, userId: renter2.id, rating: 3, comment: 'Average experience, car was okay but not very clean.' },
    { carId: car2.id, userId: renter1.id, rating: 2, comment: 'Driver was late and communication was poor.' },
    { carId: car3.id, userId: renter1.id, rating: 5, comment: 'Amazing service, will book again.' },
    { carId: car1.id, userId: renter2.id, rating: 4, comment: 'Smooth drive and friendly driver.' },
    { carId: car2.id, userId: renter1.id, rating: 1, comment: 'Very bad experience, car had issues.' },
    { carId: car3.id, userId: renter2.id, rating: 5, comment: 'Outstanding condition and great support.' },
    { carId: car1.id, userId: renter1.id, rating: 4, comment: 'Overall good experience, satisfied with service.' },
  ];
  for (const r of reviewData) {
    await prisma.review.create({ data: r });
  }

  console.log('Seed complete!');
  console.log(`  Users: 7`);
  console.log(`  Cars: ${createdCars.length}`);
  console.log(`  Drivers: ${createdDrivers.length}`);
  console.log(`  Bookings: ${bookingData.length}`);
  console.log(`  Reviews: ${reviewData.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
