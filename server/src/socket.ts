import type { Server } from 'socket.io';
import type { SessionRequest } from './types.js';
import { joinRoom, leaveRoom, getRoomParticipants, findRoomsForSocket } from './rooms.js';

export function configureSocket(io: Server): void {
  io.use((socket, next) => {
    const req = socket.request as SessionRequest;
    const user = req.session?.user;
    if (user) {
      console.log(`[socket] auth OK: ${user.displayName} (${socket.id})`);
      next();
    } else {
      console.warn(`[socket] auth FAILED: no session.user — session keys: ${Object.keys(req.session ?? {}).join(', ')}`);
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const req = socket.request as SessionRequest;
    const sessionUser = req.session.user;
    console.log(`[socket] connected: ${sessionUser.displayName} (${socket.id})`);

    socket.on('join-room', (roomId: string) => {
      joinRoom(roomId, {
        socketId: socket.id,
        userId: sessionUser.id,
        displayName: sessionUser.displayName,
      });

      socket.join(roomId);

      const participants = getRoomParticipants(roomId)
        .filter((p) => p.socketId !== socket.id)
        .map((p) => ({ id: p.socketId, displayName: p.displayName }));

      console.log(`[socket] ${sessionUser.displayName} joined room ${roomId} — existing peers: [${participants.map((p) => p.displayName).join(', ')}]`);

      socket.emit('room-joined', { roomId, peers: participants });

      socket.to(roomId).emit('peer-joined', {
        id: socket.id,
        displayName: sessionUser.displayName,
      });
    });

    socket.on('leave-room', (roomId: string) => {
      leaveRoom(roomId, socket.id);
      socket.leave(roomId);
      socket.to(roomId).emit('peer-left', { id: socket.id });
      console.log(`[socket] ${sessionUser.displayName} left room ${roomId}`);
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

    socket.on('disconnect', () => {
      console.log(`[socket] disconnected: ${sessionUser.displayName} (${socket.id})`);
      const roomIds = findRoomsForSocket(socket.id);
      for (const roomId of roomIds) {
        leaveRoom(roomId, socket.id);
        socket.to(roomId).emit('peer-left', { id: socket.id });
      }
    });
  });
}
