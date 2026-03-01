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
  room.peers.set(peer.id, peer);
}

export function removePeer(peerId: string): void {
  if (!room) return;
  room.peers.delete(peerId);
}

export function updatePeerStream(peerId: string, stream: MediaStream): void {
  if (!room) return;
  const peer = room.peers.get(peerId);
  if (peer) {
    // Replace the entry rather than mutating in place so Svelte's Map proxy
    // signals a change to all derived values watching peers.values()
    room.peers.set(peerId, { ...peer, stream });
  }
}
