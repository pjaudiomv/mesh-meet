import { socket } from './socket';
import { updatePeerStream } from '@/stores/room.svelte';

const ICE_SERVERS: RTCIceServer[] = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];

export class PeerManager {
  private connections = new Map<string, RTCPeerConnection>();
  private iceCandidateQueue = new Map<string, RTCIceCandidateInit[]>();
  private localStream: MediaStream | null = null;

  init(stream: MediaStream): void {
    this.localStream = stream;
  }

  addPeer(peerId: string, isInitiator: boolean): void {
    // Don't overwrite an existing connection mid-negotiation
    if (this.connections.has(peerId)) return;

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    this.connections.set(peerId, pc);

    // Set up all handlers BEFORE adding tracks so negotiationneeded fires after
    pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        socket.emit('ice-candidate', { to: peerId, candidate });
      }
    };

    pc.ontrack = ({ streams }) => {
      if (streams[0]) {
        updatePeerStream(peerId, streams[0]);
      }
    };

    if (isInitiator) {
      pc.onnegotiationneeded = async () => {
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit('offer', { to: peerId, offer: pc.localDescription });
        } catch (err) {
          console.error('Error creating offer:', err);
        }
      };
    }

    if (this.localStream) {
      for (const track of this.localStream.getTracks()) {
        pc.addTrack(track, this.localStream);
      }
    }
  }

  async handleOffer(peerId: string, offer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.connections.has(peerId)) {
      this.addPeer(peerId, false);
    }
    const pc = this.connections.get(peerId)!;
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    await this.flushIceCandidates(peerId);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit('answer', { to: peerId, answer: pc.localDescription });
  }

  async handleAnswer(peerId: string, answer: RTCSessionDescriptionInit): Promise<void> {
    const pc = this.connections.get(peerId);
    if (pc) {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      await this.flushIceCandidates(peerId);
    }
  }

  async handleIceCandidate(peerId: string, candidate: RTCIceCandidateInit): Promise<void> {
    const pc = this.connections.get(peerId);
    if (!pc) return;

    // Buffer candidates until remote description is set — adding them before
    // setRemoteDescription throws InvalidStateError and drops the candidate
    if (!pc.remoteDescription) {
      const queue = this.iceCandidateQueue.get(peerId) ?? [];
      queue.push(candidate);
      this.iceCandidateQueue.set(peerId, queue);
      return;
    }

    await pc.addIceCandidate(new RTCIceCandidate(candidate));
  }

  private async flushIceCandidates(peerId: string): Promise<void> {
    const pc = this.connections.get(peerId);
    if (!pc) return;
    const queue = this.iceCandidateQueue.get(peerId) ?? [];
    this.iceCandidateQueue.delete(peerId);
    for (const candidate of queue) {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    }
  }

  removePeer(peerId: string): void {
    const pc = this.connections.get(peerId);
    if (pc) {
      pc.close();
      this.connections.delete(peerId);
      this.iceCandidateQueue.delete(peerId);
    }
  }

  destroy(): void {
    for (const pc of this.connections.values()) {
      pc.close();
    }
    this.connections.clear();
    this.iceCandidateQueue.clear();
    if (this.localStream) {
      for (const track of this.localStream.getTracks()) {
        track.stop();
      }
      this.localStream = null;
    }
  }
}

export const peerManager = new PeerManager();
