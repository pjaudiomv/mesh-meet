import { updatePeerStream } from '@/stores/room.svelte';

const ICE_SERVERS: RTCIceServer[] = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];

export interface Signaling {
  sendOffer(to: string, offer: RTCSessionDescriptionInit): void;
  sendAnswer(to: string, answer: RTCSessionDescriptionInit): void;
  sendIceCandidate(to: string, candidate: RTCIceCandidateInit): void;
}

export class PeerManager {
  private connections = new Map<string, RTCPeerConnection>();
  private iceCandidateQueue = new Map<string, RTCIceCandidateInit[]>();
  private localStream: MediaStream | null = null;
  private signaling: Signaling | null = null;

  init(stream: MediaStream, signaling: Signaling): void {
    this.localStream = stream;
    this.signaling = signaling;
  }

  addPeer(peerId: string, isInitiator: boolean): void {
    if (this.connections.has(peerId)) return;

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    this.connections.set(peerId, pc);

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        this.signaling?.sendIceCandidate(peerId, candidate.toJSON());
      }
    };

    pc.ontrack = ({ streams }) => {
      if (streams[0]) updatePeerStream(peerId, streams[0]);
    };

    if (isInitiator) {
      pc.onnegotiationneeded = async () => {
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          if (pc.localDescription) this.signaling?.sendOffer(peerId, pc.localDescription);
        } catch (err) {
          console.error('[webrtc] Error creating offer:', err);
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
    if (pc.localDescription) this.signaling?.sendAnswer(peerId, pc.localDescription);
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

  /** Swap a single track in all active peer connections without renegotiation. */
  replaceTrack(kind: 'audio' | 'video', newTrack: MediaStreamTrack): void {
    for (const pc of this.connections.values()) {
      const sender = pc.getSenders().find((s) => s.track?.kind === kind);
      sender?.replaceTrack(newTrack).catch((err) => console.error('[webrtc] replaceTrack failed:', err));
    }
  }

  /** Update the stored local stream reference (used when device changes). */
  updateStream(stream: MediaStream): void {
    this.localStream = stream;
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
    this.signaling = null;
  }
}

export const peerManager = new PeerManager();
