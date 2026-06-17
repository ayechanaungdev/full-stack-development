-- 1. Create Profiles Table (Linked to Auth)
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT,
    phone TEXT,
    role TEXT CHECK (role IN ('renter', 'car_owner', 'admin')),
    avatar_url TEXT,
    nrc TEXT,
    nrc_url TEXT,
    gender TEXT,
    postal_code TEXT, -- township
    location TEXT, -- detail address
    is_active BOOLEAN DEFAULT true,
    is_blacklist BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expo_push_token TEXT
);


-- 1.1 *Validating General Phone No. Format
ALTER TABLE profiles 
DROP CONSTRAINT IF EXISTS check_myanmar_phone_format;

ALTER TABLE profiles
ADD CONSTRAINT check_myanmar_phone_format
CHECK (
    phone ~ '^[0-9]+$' 
    AND (
        phone LIKE '0%' 
        AND length(phone) >= 8 
        AND length(phone) <= 11
    )
);

-- 2. Create Cars Table
CREATE TABLE public.cars (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES public.profiles(id),
    brand TEXT NOT NULL,
    model TEXT NOT NULL,
    car_type TEXT,
    car_number TEXT UNIQUE,
    price_per_day NUMERIC NOT NULL CHECK (price_per_day > 0),
    seats NUMERIC,
    has_ac BOOLEAN DEFAULT TRUE,
    status TEXT CHECK (status IN ('Available', 'Unavailable','Pending')),
    postal_code VARCHAR(10),
    location TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
);

-- 3. Create Drivers Table
CREATE TABLE public.drivers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES public.profiles(id),
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    photo_url TEXT,
    license_number TEXT,
    license_img_url TEXT,
    nrc TEXT,
    gender TEXT NOT NULL,
    postal_code TEXT,
    location TEXT,
    status TEXT CHECK (status IN ('available', 'offline')), -- 'offline' = 'leave' status
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create Car Images Table
CREATE TABLE public.car_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    car_id UUID REFERENCES public.cars(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create Bookings Table
CREATE TABLE public.bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES public.profiles(id),
    owner_id UUID REFERENCES public.profiles(id),
    car_id UUID REFERENCES public.cars(id),
    driver_id UUID REFERENCES public.drivers(id),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    pickup_time TIME,
    dropoff_time TIME,
    pickup_location TEXT,
    dropoff_location TEXT,
    total_price NUMERIC NOT NULL,
    status TEXT CHECK (status IN ('pending', 'approved','cancelled', 'rejected', 'completed')),
    note TEXT,
    is_read BOOLEAN DEFAULT false
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
);

-- 6. Create Reviews Table
CREATE TABLE public.reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    car_id UUID REFERENCES public.cars(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Create Messages Table
CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID REFERENCES public.profiles(id),
    receiver_id UUID REFERENCES public.profiles(id),
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Create Notifications Table
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    receiver_id UUID REFERENCES public.profiles(id),
    sender_id UUID REFERENCES public.profiles(id),
    reference_id UUID NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    type TEXT CHECK (type IN ('booking', 'message', 'system','admin-inquiry','admin-car','owner-car')),
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Create Audit Logs Table
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    action TEXT NOT NULL,
    old_value JSONB,
    new_value JSONB,
    changed_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Create Wishlist Table
CREATE TABLE public.wishlist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    car_id UUID REFERENCES public.cars(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(customer_id, car_id)
);

-- 11. Create Daily Reports Table

CREATE TABLE daily_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES public.profiles(id),
    total_completed INTEGER,
    booking_ids JSONB,
    report_url TEXT,
    status TEXT,
    is_read BOOLEAN DEFAULT false
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
);

-- 12. Create Inquiries Table
CREATE TABLE public.inquiries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submitted_user_id UUID REFERENCES public.profiles(id),
    type TEXT CHECK (type IN ('service_issue', 'car_issue', 'driver_issue', 'customer_issue', 'app_issue', 'other')),
    booking_id UUID REFERENCES public.bookings(id) NULL,
    content TEXT NOT NULL,
    status TEXT CHECK (status IN ('opened', 'in_checked', 'resolved', 'closed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
 
