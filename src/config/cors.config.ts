import cors from 'cors';
import { config as envConfig } from './config';

export const corsOptions: cors.CorsOptions = {
  origin: envConfig.CORS_ORIGIN,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
};

export const corsConfig = cors(corsOptions);
