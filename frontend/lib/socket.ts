import AsyncStorage from '@react-native-async-storage/async-storage';
import { io, Socket } from 'socket.io-client';
import config from './config';

const SOCKET_URL = config.API_BASE_URL;

class SocketService {
  private socket: Socket | null = null;
  private tokenRefreshHandler: (() => Promise<string | null>) | null = null;

  get isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  onTokenRefresh(handler: () => Promise<string | null>) {
    this.tokenRefreshHandler = handler;
  }

  async connect() {
    if (this.socket?.connected) return;

    const token = await AsyncStorage.getItem('accessToken');
    if (!token) return;

    this.disconnect();

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 15000,
    });

    this.socket.on('connect_error', async (err) => {
      if (err.message?.includes('Invalid token') || err.message?.includes('jwt expired')) {
        let newToken = await AsyncStorage.getItem('accessToken');
        if ((!newToken || newToken === token) && this.tokenRefreshHandler) {
          newToken = await this.tokenRefreshHandler();
        }
        if (newToken && this.socket) {
          this.socket.auth = { token: newToken };
        } else {
          this.disconnect();
        }
      }
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
  }

  on(event: string, callback: (...args: any[]) => void) {
    this.socket?.on(event, callback);
  }

  off(event: string, callback: (...args: any[]) => void) {
    this.socket?.off(event, callback);
  }

  emit(event: string, ...args: any[]) {
    this.socket?.emit(event, ...args);
  }
}

export const socketService = new SocketService();
