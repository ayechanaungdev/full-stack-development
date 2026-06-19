const config = {
  // OLD: localhost — works only on iOS simulator
  // API_BASE_URL: __DEV__ ? 'http://localhost:3000' : 'https://your-production-api.com',
  // For Android emulator use 10.0.2.2, for physical device use your LAN IP
  API_BASE_URL: __DEV__
    ? 'http://10.0.2.2:3000'
    : 'https://your-production-api.com',

  API_TIMEOUT: 10000,
};

export default config;
