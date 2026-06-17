const config = {
  API_BASE_URL: __DEV__ 
    ? 'http://localhost:3000' 
    : 'https://your-production-api.com',
  
  API_TIMEOUT: 10000,
};

export default config;
