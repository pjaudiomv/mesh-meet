export interface User {
  id: string;
  displayName: string;
  provider: string;
  avatar?: string;
}

export interface Peer {
  id: string;
  stream: MediaStream | null;
  displayName: string;
  muted: boolean;
}

export interface RoomState {
  id: string;
  peers: Map<string, Peer>;
}
