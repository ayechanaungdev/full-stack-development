const config = {
  API_BASE_URL: process.env.EXPO_PUBLIC_API_URL || (__DEV__
    ? 'http://10.0.2.2:3000'
    : 'https://your-production-api.com'),

  API_TIMEOUT: 10000,
};

export default config;
