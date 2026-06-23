import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { config } from '../config/config';

export class SocketService {
  private io: SocketIOServer;

  constructor(server: HttpServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: config.CORS_ORIGIN,
        methods: ['GET', 'POST'],
        credentials: true,
      }
    });

    this.initialize();
  }

  private initialize() {
    this.io.on('connection', (socket: Socket) => {
      console.log(`Socket connected: ${socket.id}`);

      socket.on('join-room', (data: { sessionId: string; userId: string; userName: string }) => {
        const { sessionId, userId, userName } = data;
        if (!sessionId) return;
        socket.join(sessionId);
        socket.to(sessionId).emit('user-joined', { userId, userName });
      });

      socket.on('leave-room', (sessionId: string) => {
        if (!sessionId) return;
        socket.leave(sessionId);
      });

      socket.on('raise-hand', (data: { sessionId: string; userId: string; userName: string }) => {
        const { sessionId, userId, userName } = data;
        if (!sessionId) return;
        this.io.to(sessionId).emit('hand-raised', { userId, userName, timestamp: Date.now() });
      });

      socket.on('lower-hand', (data: { sessionId: string; userId: string }) => {
        const { sessionId, userId } = data;
        if (!sessionId) return;
        this.io.to(sessionId).emit('hand-lowered', { userId });
      });

      socket.on('disconnect', () => {
        console.log(`Socket disconnected: ${socket.id}`);
      });
    });
  }

  getIO(): SocketIOServer {
    return this.io;
  }
}
