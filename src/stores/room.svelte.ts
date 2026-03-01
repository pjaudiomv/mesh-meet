import type { RoomState, Peer } from '@/types/index';

let room = $state<RoomState | null>(null);
let localStream = $state<MediaStream | null>(null);
let videoEnabled = $state(true);
let audioEnabled = $state(true);

export function getRoom(): RoomState | null {
  return room;
}

export function getLocalStream(): MediaStream | null {
  return localStream;
}

export function isVideoEnabled(): boolean {
  return videoEnabled;
}

export function isAudioEnabled(): boolean {
  return audioEnabled;
}

export function setRoom(r: RoomState | null): void {
  room = r;
}

export function setLocalStream(s: MediaStream | null): void {
  localStream = s;
}

export function setVideoEnabled(v: boolean): void {
  videoEnabled = v;
}

export function setAudioEnabled(v: boolean): void {
  audioEnabled = v;
}

export function addPeer(peer: Peer): void {
  if (!room) return;
  if (room.peers.some((p) => p.id === peer.id)) return;
  room.peers.push(peer);
}

export function removePeer(peerId: string): void {
  if (!room) return;
  const idx = room.peers.findIndex((p) => p.id === peerId);
  if (idx !== -1) room.peers.splice(idx, 1);
}

export function updatePeerStream(peerId: string, stream: MediaStream): void {
  if (!room) return;
  const peer = room.peers.find((p) => p.id === peerId);
  if (peer) {
    peer.stream = stream;
  }
}
