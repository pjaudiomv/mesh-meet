import type { Server } from 'socket.io';
import { joinRoom, leaveRoom, getRoomParticipants, findRoomsForSocket, isRoomExpired } from './rooms.js';

export function configureSocket(io: Server): void {
  // Auth: require a display name passed in socket handshake auth
  io.use((socket, next) => {
    const displayName = (socket.handshake.auth.displayName as string)?.trim();
    if (!displayName) {
      return next(new Error('Display name is required'));
    }
    socket.data.displayName = displayName;
    next();
  });

  io.on('connection', (socket) => {
    const displayName = socket.data.displayName as string;
    console.log(`[socket] connected: ${displayName} (${socket.id})`);

    socket.on('join-room', (roomId: string) => {
      if (isRoomExpired(roomId)) {
        socket.emit('room-error', { code: 'ROOM_EXPIRED', message: 'This meeting has ended.' });
        console.log(`[socket] ${displayName} tried to join expired room ${roomId}`);
        return;
      }

      joinRoom(roomId, { socketId: socket.id, displayName });
      socket.join(roomId);

      const participants = getRoomParticipants(roomId)
        .filter((p) => p.socketId !== socket.id)
        .map((p) => ({ id: p.socketId, displayName: p.displayName }));

      console.log(`[socket] ${displayName} joined room ${roomId} — existing peers: [${participants.map((p) => p.displayName).join(', ')}]`);

      socket.emit('room-joined', { roomId, peers: participants });
      socket.to(roomId).emit('peer-joined', { id: socket.id, displayName });
    });

    socket.on('leave-room', (roomId: string) => {
      leaveRoom(roomId, socket.id);
      socket.leave(roomId);
      socket.to(roomId).emit('peer-left', { id: socket.id });
      console.log(`[socket] ${displayName} left room ${roomId}`);
    });

    socket.on('offer', ({ to, offer }: { to: string; offer: RTCSessionDescriptionInit }) => {
      console.log(`[socket] offer: ${socket.id} → ${to}`);
      io.to(to).emit('offer', { from: socket.id, offer });
    });

    socket.on('answer', ({ to, answer }: { to: string; answer: RTCSessionDescriptionInit }) => {
      console.log(`[socket] answer: ${socket.id} → ${to}`);
      io.to(to).emit('answer', { from: socket.id, answer });
    });

    socket.on('ice-candidate', ({ to, candidate }: { to: string; candidate: RTCIceCandidateInit }) => {
      io.to(to).emit('ice-candidate', { from: socket.id, candidate });
    });

    socket.on('chat-message', ({ roomId, text }: { roomId: string; text: string }) => {
      const trimmed = text?.trim();
      if (!trimmed || trimmed.length > 2000 || !socket.rooms.has(roomId)) return;
      socket.to(roomId).emit('chat-message', {
        from: displayName,
        text: trimmed,
        timestamp: Date.now(),
      });
    });

    socket.on('disconnect', () => {
      console.log(`[socket] disconnected: ${displayName} (${socket.id})`);
      const roomIds = findRoomsForSocket(socket.id);
      for (const roomId of roomIds) {
        leaveRoom(roomId, socket.id);
        socket.to(roomId).emit('peer-left', { id: socket.id });
      }
    });
  });
}
