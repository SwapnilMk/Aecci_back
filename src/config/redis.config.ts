import Redis from 'ioredis';
import { config } from './config';

const redisConfig = {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

export const redis = new Redis(config.REDIS_URL, redisConfig);

redis.on('error', (err) => {
  console.error('Redis error:', err);
});

redis.on('connect', () => {
  console.log('Connected to Redis successfully');
});
