// Configuration file for the application
export const config = {
  api: {
    baseUrl: (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:3000/api',
    timeout: Number((import.meta as any).env?.VITE_API_TIMEOUT) || 10000,
  },
  app: {
    name: (import.meta as any).env?.VITE_APP_NAME || 'MaxDelivery Partner',
    version: (import.meta as any).env?.VITE_APP_VERSION || '1.0.0',
    environment: (import.meta as any).env?.VITE_APP_ENVIRONMENT || 'development',
  },
};

export default config;
