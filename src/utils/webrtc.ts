import { socket } from './socket';
import { updatePeerStream } from '@/stores/room.svelte';

const ICE_SERVERS: RTCIceServer[] = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];

export class PeerManager {
  private connections = new Map<string, RTCPeerConnection>();
  private localStream: MediaStream | null = null;

  init(stream: MediaStream): void {
    this.localStream = stream;
  }

  addPeer(peerId: string, isInitiator: boolean): void {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    this.connections.set(peerId, pc);

    if (this.localStream) {
      for (const track of this.localStream.getTracks()) {
        pc.addTrack(track, this.localStream);
      }
    }

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
  }

  async handleOffer(peerId: string, offer: RTCSessionDescriptionInit): Promise<void> {
    let pc = this.connections.get(peerId);
    if (!pc) {
      this.addPeer(peerId, false);
      pc = this.connections.get(peerId)!;
    }
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit('answer', { to: peerId, answer: pc.localDescription });
  }

  async handleAnswer(peerId: string, answer: RTCSessionDescriptionInit): Promise<void> {
    const pc = this.connections.get(peerId);
    if (pc) {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    }
  }

  async handleIceCandidate(peerId: string, candidate: RTCIceCandidateInit): Promise<void> {
    const pc = this.connections.get(peerId);
    if (pc) {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    }
  }

  removePeer(peerId: string): void {
    const pc = this.connections.get(peerId);
    if (pc) {
      pc.close();
      this.connections.delete(peerId);
    }
  }

  destroy(): void {
    for (const pc of this.connections.values()) {
      pc.close();
    }
    this.connections.clear();
    if (this.localStream) {
      for (const track of this.localStream.getTracks()) {
        track.stop();
      }
      this.localStream = null;
    }
  }
}

export const peerManager = new PeerManager();
