import api, { ApiError } from "./api";

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
  role?: string;
  avatar_url?: string;
  nrc?: string;
  nrc_url?: string;
  gender?: string;
  postal_code?: string;
  location?: string;
  is_active?: boolean;
  is_blacklist?: boolean;
  created_at?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface SignupPayload {
  fullName: string;
  email: string;
  password: string;
  phone: string;
  gender: string;
  township: string;
  address: string;
  nrcState: string;
  nrcTownship: string;
  nrcType: string;
  nrcNumber: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export interface BookingPayload {
  carId: number;
  startDate: string;
  endDate: string;
  totalPrice: number;
  userId?: number;
}

export interface InquiryPayload {
  userId: number;
  carId: number;
  message: string;
}

export const authService = {
  login: (payload: LoginPayload) =>
    api.post<{ accessToken: string; refreshToken: string; user: UserProfile }>(
      "auth/login",
      payload,
    ),
  signup: (payload: SignupPayload) =>
    api.post<UserProfile>("auth/signup", payload),
  refresh: (refreshToken: string) =>
    api.post<AuthTokens>("auth/refresh", null, refreshToken),
  logout: (token: string) =>
    api.post<{ message: string }>("auth/logout", null, token),
};

export const userService = {
  getProfile: (id: string, token?: string) =>
    api.get<UserProfile>(`users/${id}`, token),
  updateProfile: (id: string, body: Partial<UserProfile>, token?: string) =>
    api.patch<UserProfile>(`users/${id}`, body, token),
};

export const bookingService = {
  createBooking: (payload: BookingPayload, token?: string) =>
    api.post<{ id: number }>("bookings", payload, token),
  getBookings: (token?: string) => api.get<any[]>("bookings", token),
  updateStatus: (bookingId: number, status: string, token?: string) =>
    api.patch(`bookings/${bookingId}/status`, { status }, token),
};

export const carService = {
  getCars: () => api.get<any[]>("cars"),
  getCar: (id: string) => api.get<any>(`cars/${id}`),
  createCar: (body: any, token?: string) => api.post<any>("cars", body, token),
  updateCar: (id: string, body: any, token?: string) =>
    api.patch<any>(`cars/${id}`, body, token),
  deleteCar: (id: string, token?: string) =>
    api.delete<any>(`cars/${id}`, token),
};

export const inquiryService = {
  createInquiry: (payload: InquiryPayload, token?: string) =>
    api.post<{ id: number }>("inquiries", payload, token),
};

export const storageService = {
  // Server-side base64 upload
  uploadBase64: (
    filename: string,
    contentBase64: string,
    contentType?: string,
    token?: string,
    bucket?: string,
  ) =>
    api.post<{ publicUrl: string }>(
      "uploads",
      { filename, contentBase64, contentType, bucket },
      token,
    ),

  // Request a signed upload URL (client will PUT the file to the returned URL)
  getSignedUrl: (
    filename: string,
    contentType?: string,
    expiresInSeconds?: number,
    token?: string,
    bucket?: string,
  ) =>
    api.post<{ uploadUrl: string; publicUrl: string }>(
      "uploads/signed-url",
      { filename, contentType, expiresInSeconds, bucket },
      token,
    ),
};

export type BackendError = ApiError;

export default {
  authService,
  userService,
  bookingService,
  carService,
  inquiryService,
  storageService,
};
