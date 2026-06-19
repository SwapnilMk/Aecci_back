import express from 'express';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import uploadRoutes from './routes/upload.routes';
import userRoutes from './routes/user.routes';
import { errorHandler } from './middlewares/error.middleware';
import { corsConfig } from './config/cors.config';
import { config } from './config/config';

dotenv.config();

// Initialize BullMQ Workers
import './queues/email.queue';

const app = express();
const PORT = config.PORT;

// Middleware
app.use(corsConfig);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/users', userRoutes);

// Error Handling Middleware
app.use(errorHandler);

import { prisma } from './config/db.config';

// Start server
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  try {
    await prisma.$connect();
    console.log('MongoDB connected successfully via Prisma');
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
  }
});
