import type { RoomState, Peer } from '@/types/index';

let room = $state<RoomState | null>(null);
let localStream = $state<MediaStream | null>(null);
let videoEnabled = $state(true);
let audioEnabled = $state(true);

// Streams that arrived via ontrack before the peer was added to the store.
// Applied immediately when addPeer is called. Not reactive — plain cache only.
// eslint-disable-next-line svelte/prefer-svelte-reactivity
const pendingStreams = new Map<string, MediaStream>();

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
  if (!r) pendingStreams.clear();
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
  if (pendingStreams.has(peer.id)) {
    peer.stream = pendingStreams.get(peer.id)!;
    pendingStreams.delete(peer.id);
  }
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
  } else {
    // Peer not yet in the store — cache the stream so addPeer can apply it.
    pendingStreams.set(peerId, stream);
  }
}
