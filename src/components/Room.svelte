<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import VideoGrid from './VideoGrid.svelte';
  import Controls from './Controls.svelte';
  import { socket } from '@utils/socket';
  import { peerManager } from '@utils/webrtc';
  import { getRoom, setRoom, setLocalStream, getLocalStream, addPeer, removePeer } from '@/stores/room.svelte';
  import { getUser } from '@/stores/auth.svelte';
  import type { User } from '@/types/index';

  const room = $derived(getRoom());
  const localStream = $derived(getLocalStream());
  const user = $derived(getUser() as User);

  onMount(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
      peerManager.init(stream);
    } catch (err) {
      console.error('Failed to get user media:', err);
    }

    socket.on('room-joined', ({ peers }: { roomId: string; peers: { id: string; displayName: string }[] }) => {
      for (const peer of peers) {
        addPeer({ id: peer.id, stream: null, displayName: peer.displayName, muted: false });
        peerManager.addPeer(peer.id, true);
      }
    });

    socket.on('peer-joined', ({ id, displayName }: { id: string; displayName: string }) => {
      addPeer({ id, stream: null, displayName, muted: false });
      peerManager.addPeer(id, false);
    });

    socket.on('peer-left', ({ id }: { id: string }) => {
      removePeer(id);
      peerManager.removePeer(id);
    });

    socket.on('offer', ({ from, offer }: { from: string; offer: RTCSessionDescriptionInit }) => {
      peerManager.handleOffer(from, offer);
    });

    socket.on('answer', ({ from, answer }: { from: string; answer: RTCSessionDescriptionInit }) => {
      peerManager.handleAnswer(from, answer);
    });

    socket.on('ice-candidate', ({ from, candidate }: { from: string; candidate: RTCIceCandidateInit }) => {
      peerManager.handleIceCandidate(from, candidate);
    });

    if (room) {
      socket.emit('join-room', room.id);
    }
  });

  onDestroy(() => {
    if (room) {
      socket.emit('leave-room', room.id);
    }
    socket.off('room-joined');
    socket.off('peer-joined');
    socket.off('peer-left');
    socket.off('offer');
    socket.off('answer');
    socket.off('ice-candidate');
    peerManager.destroy();
    setLocalStream(null);
  });

  function leaveRoom() {
    if (room) {
      socket.emit('leave-room', room.id);
    }
    peerManager.destroy();
    setLocalStream(null);
    setRoom(null);
  }
</script>

<div class="flex h-screen flex-col bg-gray-900">
  <div class="flex-1 overflow-hidden">
    {#if room}
      <VideoGrid {localStream} localName={user?.displayName ?? 'You'} peers={room.peers} />
    {/if}
  </div>
  <Controls onLeave={leaveRoom} />
</div>
