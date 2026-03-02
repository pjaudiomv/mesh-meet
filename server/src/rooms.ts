interface RoomParticipant {
  socketId: string;
  displayName: string;
}

const rooms = new Map<string, Map<string, RoomParticipant>>();

// Rooms that once had participants but are now empty are "expired".
// New joins to an expired room are rejected so the meeting link becomes invalid.
const expiredRooms = new Set<string>();

export function joinRoom(roomId: string, participant: RoomParticipant): boolean {
  if (expiredRooms.has(roomId)) return false;
  if (!rooms.has(roomId)) {
    rooms.set(roomId, new Map());
  }
  rooms.get(roomId)!.set(participant.socketId, participant);
  return true;
}

export function leaveRoom(roomId: string, socketId: string): void {
  const room = rooms.get(roomId);
  if (!room) return;
  room.delete(socketId);
  if (room.size === 0) {
    rooms.delete(roomId);
    expiredRooms.add(roomId);
  }
}

export function isRoomExpired(roomId: string): boolean {
  return expiredRooms.has(roomId);
}

export function getRoomParticipants(roomId: string): RoomParticipant[] {
  const room = rooms.get(roomId);
  if (!room) return [];
  return Array.from(room.values());
}

export function findRoomsForSocket(socketId: string): string[] {
  const result: string[] = [];
  for (const [roomId, room] of rooms) {
    if (room.has(socketId)) result.push(roomId);
  }
  return result;
}
