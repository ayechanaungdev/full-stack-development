import apiClient from './axios';

class ApiService {
  // Auth endpoints
  async login(email: string, password: string) {
    const response = await apiClient.post('/auth/login', { email, password });
    return response.data;
  }

  async signup(userData: any) {
    const response = await apiClient.post('/auth/signup', userData);
    return response.data;
  }

  async logout() {
    const response = await apiClient.post('/auth/logout');
    return response.data;
  }

  async refreshTokens(refreshToken: string) {
    const response = await apiClient.post('/auth/refresh', { refreshToken });
    return response.data;
  }

  // Cars endpoints
  async getCars() {
    const response = await apiClient.get('/cars');
    return response.data;
  }

  async getCarById(id: number) {
    const response = await apiClient.get(`/cars/${id}`);
    return response.data;
  }

  async createCar(carData: any) {
    const response = await apiClient.post('/cars', carData);
    return response.data;
  }

  async updateCar(id: number, carData: any) {
    const response = await apiClient.patch(`/cars/${id}`, carData);
    return response.data;
  }

  async deleteCar(id: number) {
    const response = await apiClient.delete(`/cars/${id}`);
    return response.data;
  }

  // Users endpoints
  async getUsers() {
    const response = await apiClient.get('/users');
    return response.data;
  }

  async getUserById(id: number) {
    const response = await apiClient.get(`/users/${id}`);
    return response.data;
  }

  async updateUser(id: number, userData: any) {
    const response = await apiClient.patch(`/users/${id}`, userData);
    return response.data;
  }

  // Bookings endpoints
  async getBookings() {
    const response = await apiClient.get('/bookings');
    return response.data;
  }

  async getBookingById(id: number) {
    const response = await apiClient.get(`/bookings/${id}`);
    return response.data;
  }

  async createBooking(bookingData: any) {
    const response = await apiClient.post('/bookings', bookingData);
    return response.data;
  }

  async updateBookingStatus(id: number, status: string) {
    const response = await apiClient.patch(`/bookings/${id}/status`, { status });
    return response.data;
  }

  // Drivers endpoints
  async getDrivers() {
    const response = await apiClient.get('/drivers');
    return response.data;
  }

  async getDriverById(id: number) {
    const response = await apiClient.get(`/drivers/${id}`);
    return response.data;
  }

  async createDriver(driverData: any) {
    const response = await apiClient.post('/drivers', driverData);
    return response.data;
  }

  async updateDriver(id: number, driverData: any) {
    const response = await apiClient.patch(`/drivers/${id}`, driverData);
    return response.data;
  }

  async deleteDriver(id: number) {
    const response = await apiClient.delete(`/drivers/${id}`);
    return response.data;
  }
}

export default new ApiService();
