import { v4 as uuidv4 } from 'uuid';

interface RoomParticipant {
  socketId: string;
  userId: string;
  displayName: string;
}

const rooms = new Map<string, Map<string, RoomParticipant>>();

export function createRoom(): string {
  const roomId = uuidv4();
  rooms.set(roomId, new Map());
  return roomId;
}

export function joinRoom(roomId: string, participant: RoomParticipant): boolean {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, new Map());
  }
  const room = rooms.get(roomId)!;
  room.set(participant.socketId, participant);
  return true;
}

export function leaveRoom(roomId: string, socketId: string): void {
  const room = rooms.get(roomId);
  if (!room) return;
  room.delete(socketId);
  if (room.size === 0) {
    rooms.delete(roomId);
  }
}

export function getRoom(roomId: string): Map<string, RoomParticipant> | undefined {
  return rooms.get(roomId);
}

export function getRoomParticipants(roomId: string): RoomParticipant[] {
  const room = rooms.get(roomId);
  if (!room) return [];
  return Array.from(room.values());
}

export function findRoomsForSocket(socketId: string): string[] {
  const result: string[] = [];
  for (const [roomId, room] of rooms) {
    if (room.has(socketId)) {
      result.push(roomId);
    }
  }
  return result;
}
