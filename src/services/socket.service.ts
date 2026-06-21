import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';

export class SocketService {
  private io: SocketIOServer;

  constructor(server: HttpServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: '*', // Adjust to match CORS config if needed
        methods: ['GET', 'POST']
      }
    });

    this.initialize();
  }

  private initialize() {
    this.io.on('connection', (socket: Socket) => {
      console.log(`Socket connected: ${socket.id}`);

      // Handle joining a specific deal room session
      socket.on('join-room', (data: { sessionId: string; userId: string; userName: string }) => {
        const { sessionId, userId, userName } = data;
        if (!sessionId) return;
        
        socket.join(sessionId);
        
        // Broadcast to the room that a user joined
        socket.to(sessionId).emit('user-joined', { userId, userName });
      });

      // Handle leaving the room
      socket.on('leave-room', (sessionId: string) => {
        if (!sessionId) return;
        socket.leave(sessionId);
      });

      // Handle Raise Hand
      socket.on('raise-hand', (data: { sessionId: string; userId: string; userName: string }) => {
        const { sessionId, userId, userName } = data;
        if (!sessionId) return;
        
        // Broadcast to everyone in the room (including the sender, or we could use socket.to)
        this.io.to(sessionId).emit('hand-raised', { userId, userName, timestamp: Date.now() });
      });

      // Handle Lower Hand
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
}
