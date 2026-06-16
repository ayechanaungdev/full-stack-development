export interface Profile {
  full_name: string;
  avatar_url: string | null;
  location: string | null;
  postal_code: string | null;
}

export interface LocationOption {
  label: string;
  value: string;
}

export interface Booking {
  id: string,
  status: string;
  start_date: string;
  end_date: string;
  total_price: number;
  cars: {
    brand: string;
    model: string;
    location: string;
    car_images: { image_url: string }[];
  };
}

export interface CarItem {
  id: string;
  brand: string;
  model: string;
  price_per_day: number;
  car_type: string | null;
  seats: number | null;
  has_ac: boolean | null;
  location: string;
  car_images: { image_url: string }[];
  total_bookings?: number;
  average_rating?: number | null;
  postal_code?: string | null;
  review_count?: number;
}
