-- profiles
ALTER TABLE profiles ADD COLUMN nrc_url TEXT;

-- cars
ALTER TABLE cars 
ADD COLUMN car_number TEXT UNIQUE,
ADD COLUMN has_ac BOOLEAN DEFAULT false;

-- drivers
ALTER TABLE drivers 
ADD COLUMN license_number TEXT UNIQUE,
ADD COLUMN nrc TEXT,
ADD COLUMN postal_code TEXT,
ADD COLUMN location TEXT,
ADD COLUMN leave BOOLEAN DEFAULT false;

ALTER TABLE drivers 
ADD CONSTRAINT check_driver_status 
CHECK (status IN ('available', 'offline'));

-- bookings
ALTER TABLE bookings 
ADD COLUMN note TEXT;


