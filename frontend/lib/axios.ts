import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import config from './config';

const API_BASE_URL = config.API_BASE_URL;

type AuthFailedHandler = () => void;

class ApiClient {
  private client: AxiosInstance;
  private cachedAccessToken: string | null = null;
  private cachedRefreshToken: string | null = null;
  private authFailedListeners: AuthFailedHandler[] = [];

  onAuthFailed(handler: AuthFailedHandler) {
    this.authFailedListeners.push(handler);
  }

  private notifyAuthFailed() {
    this.authFailedListeners.forEach((fn) => fn());
  }

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor - Add JWT token
    this.client.interceptors.request.use(
      async (config) => {
        const token = this.cachedAccessToken || await this.getToken();
        if (token) {
          console.log(`[Axios] Attaching token (${token.substring(0, 10)}...${token.substring(token.length - 5)})`);
          config.headers.Authorization = `Bearer ${token}`;
        } else {
          console.warn('[Axios] No token available — skipping Authorization header');
          console.warn(`[Axios] cachedAccessToken: ${!!this.cachedAccessToken}`);
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor - Handle token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // If 401 and not already retrying
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshToken = this.cachedRefreshToken || await this.getRefreshToken();
            if (refreshToken) {
              // OLD: sent refresh token in body
              // const response = await this.client.post('/auth/refresh', { refreshToken });
              // NEW: backend expects refresh token in Authorization header
              const response = await this.client.post('/auth/refresh', null, {
                headers: { Authorization: `Bearer ${refreshToken}` },
              });

              const { accessToken, refreshToken: newRefresh } = response.data;
              await this.setTokens(accessToken, newRefresh);

              // Retry original request with new token
              originalRequest.headers.Authorization = `Bearer ${accessToken}`;
              return this.client(originalRequest);
            }
          } catch (refreshError) {
            // Refresh failed, logout user
            await this.clearTokens();
            this.notifyAuthFailed();
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  // Token management methods
  private async getToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('accessToken');
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  }

  private async getRefreshToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('refreshToken');
    } catch (error) {
      console.error('Error getting refresh token:', error);
      return null;
    }
  }

  // OLD: private setToken — saved only accessToken
  // private async setToken(token: string): Promise<void> { ... }
  // OLD: private clearTokens — was private
  // private async clearTokens(): Promise<void> { ... }

  // NEW: public setTokens — saves both access + refresh
  public async setTokens(accessToken: string, refreshToken: string): Promise<void> {
    this.cachedAccessToken = accessToken;
    this.cachedRefreshToken = refreshToken;
    try {
      await AsyncStorage.multiSet([
        ['accessToken', accessToken],
        ['refreshToken', refreshToken],
      ]);
    } catch (error) {
      console.error('Error setting tokens:', error);
    }
  }

  // NEW: public clearTokens — for store/axios interceptor use
  public async clearTokens(): Promise<void> {
    this.cachedAccessToken = null;
    this.cachedRefreshToken = null;
    try {
      await AsyncStorage.multiRemove(['accessToken', 'refreshToken']);
    } catch (error) {
      console.error('Error clearing tokens:', error);
    }
  }

  // Expose the axios instance
  public getClient(): AxiosInstance {
    return this.client;
  }
}

// OLD: export default apiClient; (single export)
// NEW: also export tokenManager for store to call setTokens/clearTokens
const apiClientInstance = new ApiClient();
export const apiClient = apiClientInstance.getClient();
export { apiClientInstance as tokenManager };
export default apiClient;
