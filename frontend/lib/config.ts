const getBaseUrl = (): string => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) return envUrl;

  if (__DEV__) {
    return 'http://10.0.2.2:3000';
  }

  return 'https://car-rental-api.onrender.com';
};

const config = {
  API_BASE_URL: getBaseUrl(),

  API_TIMEOUT: 10000,
};

export default config;
