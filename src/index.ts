import express from 'express';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import uploadRoutes from './routes/upload.routes';
import userRoutes from './routes/user.routes';
import sessionRoutes from './routes/session.routes';
import paymentRoutes from './routes/payment.routes';
import partnerRoutes from './routes/partner.routes';
import reportRoutes from './routes/report.routes';
import serviceRoutes from './routes/service.routes';
import { errorHandler } from './middlewares/error.middleware';
import { corsConfig } from './config/cors.config';
import { config } from './config/config';

dotenv.config();

// Initialize BullMQ Workers
import './queues/email.queue';
import './queues/invoice.queue';

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
app.use('/api/sessions', sessionRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/partners', partnerRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/services', serviceRoutes);

// Error Handling Middleware
app.use(errorHandler);

import { prisma } from './config/db.config';
import http from 'http';
import { SocketService } from './services/socket.service';

const server = http.createServer(app);

// Initialize WebSockets
new SocketService(server);

// Start server
server.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  try {
    await prisma.$connect();
    console.log('MongoDB connected successfully via Prisma');
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
  }
});
