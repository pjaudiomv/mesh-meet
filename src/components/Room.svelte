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

  let socketError = $state('');
  let copied = $state(false);

  async function copyRoomId() {
    if (!room) return;
    const url = `${window.location.origin}?room=${room.id}`;
    await navigator.clipboard.writeText(url);
    copied = true;
    setTimeout(() => (copied = false), 2000);
  }

  onMount(() => {
    // Register listeners FIRST — before any async work so no events are missed
    socket.on('connect', () => console.log('[room] socket connected', socket.id));
    socket.on('connect_error', (err) => {
      console.error('[room] socket connect_error:', err.message);
      socketError = `Connection error: ${err.message}`;
    });

    socket.on('room-joined', ({ peers }: { roomId: string; peers: { id: string; displayName: string }[] }) => {
      console.log('[room] room-joined, existing peers:', peers);
      for (const peer of peers) {
        addPeer({ id: peer.id, stream: null, displayName: peer.displayName, muted: false });
        peerManager.addPeer(peer.id, true);
      }
    });

    socket.on('peer-joined', ({ id, displayName }: { id: string; displayName: string }) => {
      console.log('[room] peer-joined:', displayName, id);
      addPeer({ id, stream: null, displayName, muted: false });
      peerManager.addPeer(id, false);
    });

    socket.on('peer-left', ({ id }: { id: string }) => {
      console.log('[room] peer-left:', id);
      removePeer(id);
      peerManager.removePeer(id);
    });

    socket.on('offer', ({ from, offer }: { from: string; offer: RTCSessionDescriptionInit }) => {
      console.log('[room] received offer from', from);
      peerManager.handleOffer(from, offer);
    });

    socket.on('answer', ({ from, answer }: { from: string; answer: RTCSessionDescriptionInit }) => {
      console.log('[room] received answer from', from);
      peerManager.handleAnswer(from, answer);
    });

    socket.on('ice-candidate', ({ from, candidate }: { from: string; candidate: RTCIceCandidateInit }) => {
      peerManager.handleIceCandidate(from, candidate);
    });

    // Get media then join — ensures peerManager has tracks before the offer is sent
    async function initAndJoin() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setLocalStream(stream);
        peerManager.init(stream);
        console.log('[room] got local media');
      } catch (err) {
        console.error('[room] getUserMedia failed:', err);
      }

      if (!room) return;
      console.log('[room] joining room', room.id, '— socket connected:', socket.connected);

      if (socket.connected) {
        socket.emit('join-room', room.id);
      } else {
        socket.once('connect', () => {
          if (room) socket.emit('join-room', room.id);
        });
        if (!socket.active) socket.connect();
      }
    }

    initAndJoin();
  });

  onDestroy(() => {
    if (room) {
      socket.emit('leave-room', room.id);
    }
    socket.off('connect');
    socket.off('connect_error');
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
  <!-- Header bar with room ID -->
  <div class="flex items-center justify-between bg-gray-800 px-4 py-2">
    <span class="text-sm text-gray-400">Room:</span>
    <div class="flex items-center gap-2">
      <span class="max-w-xs truncate font-mono text-xs text-gray-300">{room?.id ?? ''}</span>
      <button onclick={copyRoomId} class="rounded p-1 text-gray-400 transition hover:bg-gray-700 hover:text-white" title="Copy invite link">
        {#if copied}
          <svg class="h-4 w-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        {:else}
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
        {/if}
      </button>
    </div>
    {#if socketError}
      <span class="text-xs text-red-400">{socketError}</span>
    {/if}
  </div>

  <div class="flex-1 overflow-hidden">
    {#if room}
      <VideoGrid {localStream} localName={user?.displayName ?? 'You'} peers={room.peers} />
    {/if}
  </div>
  <Controls onLeave={leaveRoom} />
</div>
