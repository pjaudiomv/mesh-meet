<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { RealtimeChannel } from '@supabase/supabase-js';
  import VideoGrid from './VideoGrid.svelte';
  import Controls from './Controls.svelte';
  import Chat from './Chat.svelte';
  import { supabase } from '@utils/supabase';
  import { peerManager } from '@utils/webrtc';
  import { getRoom, setRoom, setLocalStream, getLocalStream, addPeer, removePeer } from '@/stores/room.svelte';
  import { getDisplayName, getPeerId } from '@/stores/auth.svelte';
  import type { ChatMessage } from '@/types/index';

  const room = $derived(getRoom());
  const localStream = $derived(getLocalStream());
  const displayName = $derived(getDisplayName() ?? 'You');
  const myPeerId = $derived(getPeerId() ?? '');

  let copied = $state(false);
  let chatOpen = $state(false);
  let messages = $state<ChatMessage[]>([]);
  let unreadCount = $state(0);

  let channel: RealtimeChannel | null = null;
  // Track which peer IDs we've already set up connections for
  let knownPeers = new Set<string>();

  async function copyRoomId() {
    if (!room) return;
    const url = `${window.location.origin}?room=${room.id}`;
    await navigator.clipboard.writeText(url);
    copied = true;
    setTimeout(() => (copied = false), 2000);
  }

  function toggleChat() {
    chatOpen = !chatOpen;
    if (chatOpen) unreadCount = 0;
  }

  function sendMessage(text: string) {
    if (!channel) return;
    channel.send({ type: 'broadcast', event: 'chat', payload: { from: displayName, text, timestamp: Date.now() } });
    messages.push({ id: crypto.randomUUID(), from: displayName, text, timestamp: Date.now(), isLocal: true });
  }

  onMount(() => {
    const currentRoom = getRoom();
    if (!currentRoom) return;

    // Signaling callbacks wired to Supabase Broadcast
    const signaling = {
      sendOffer: (to: string, offer: RTCSessionDescriptionInit) => channel?.send({ type: 'broadcast', event: 'offer', payload: { to, from: myPeerId, offer } }),
      sendAnswer: (to: string, answer: RTCSessionDescriptionInit) => channel?.send({ type: 'broadcast', event: 'answer', payload: { to, from: myPeerId, answer } }),
      sendIceCandidate: (to: string, candidate: RTCIceCandidateInit) => channel?.send({ type: 'broadcast', event: 'ice', payload: { to, from: myPeerId, candidate } })
    };

    channel = supabase.channel(`room:${currentRoom.id}`, {
      config: {
        broadcast: { self: false },
        presence: { key: myPeerId }
      }
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        if (!channel) return;
        const state = channel.presenceState<{ displayName: string }>();
        const currentIds = new Set(Object.keys(state).filter((k) => k !== myPeerId));

        // New peers since last sync
        for (const [id, presences] of Object.entries(state)) {
          if (id === myPeerId || knownPeers.has(id)) continue;
          const name = presences[0].displayName;
          console.log('[room] peer joined:', name, id);
          addPeer({ id, stream: null, displayName: name, muted: false });
          // Lexicographically smaller peer ID is the initiator — deterministic, no server needed
          peerManager.addPeer(id, myPeerId < id);
        }

        // Peers that left
        for (const id of knownPeers) {
          if (!currentIds.has(id)) {
            console.log('[room] peer left:', id);
            removePeer(id);
            peerManager.removePeer(id);
          }
        }

        knownPeers = currentIds;
      })
      .on('broadcast', { event: 'offer' }, ({ payload }) => {
        if (payload.to !== myPeerId) return;
        console.log('[room] received offer from', payload.from);
        peerManager.handleOffer(payload.from, payload.offer);
      })
      .on('broadcast', { event: 'answer' }, ({ payload }) => {
        if (payload.to !== myPeerId) return;
        console.log('[room] received answer from', payload.from);
        peerManager.handleAnswer(payload.from, payload.answer);
      })
      .on('broadcast', { event: 'ice' }, ({ payload }) => {
        if (payload.to !== myPeerId) return;
        peerManager.handleIceCandidate(payload.from, payload.candidate);
      })
      .on('broadcast', { event: 'chat' }, ({ payload }: { payload: { from: string; text: string; timestamp: number } }) => {
        messages.push({ id: crypto.randomUUID(), from: payload.from, text: payload.text, timestamp: payload.timestamp, isLocal: false });
        if (!chatOpen) unreadCount += 1;
      });

    async function initAndJoin() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setLocalStream(stream);
        peerManager.init(stream, signaling);
        console.log('[room] got local media');
      } catch (err) {
        console.error('[room] getUserMedia failed:', err);
      }

      await new Promise<void>((resolve) => {
        channel!.subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await channel!.track({ displayName });
            console.log('[room] subscribed to channel, presence tracked');
            resolve();
          }
        });
      });
    }

    initAndJoin();
  });

  onDestroy(() => {
    if (channel) {
      channel.untrack();
      supabase.removeChannel(channel);
      channel = null;
    }
    peerManager.destroy();
    setLocalStream(null);
  });

  async function handleChangeDevice(kind: 'audio' | 'video', deviceId: string) {
    const currentStream = getLocalStream();
    if (!currentStream) return;
    try {
      const constraints = kind === 'audio' ? { audio: { deviceId: { exact: deviceId } }, video: false } : { audio: false, video: { deviceId: { exact: deviceId } } };
      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      const newTrack = kind === 'audio' ? newStream.getAudioTracks()[0] : newStream.getVideoTracks()[0];
      // Swap track in all active peer connections without renegotiation
      peerManager.replaceTrack(kind, newTrack);
      // Build updated stream for local preview (keep the other kind's track)
      const otherTracks = kind === 'audio' ? currentStream.getVideoTracks() : currentStream.getAudioTracks();
      const updatedStream = new MediaStream([...otherTracks, newTrack]);
      // Stop old track to release hardware
      (kind === 'audio' ? currentStream.getAudioTracks() : currentStream.getVideoTracks()).forEach((t) => t.stop());
      setLocalStream(updatedStream);
      peerManager.updateStream(updatedStream);
    } catch (err) {
      console.error('[room] Failed to change device:', err);
    }
  }

  function leaveRoom() {
    if (channel) {
      channel.untrack();
      supabase.removeChannel(channel);
      channel = null;
    }
    peerManager.destroy();
    setLocalStream(null);
    setRoom(null);
  }
</script>

<div class="flex h-dvh flex-col bg-gray-900">
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
  </div>

  <!-- Main content: video + optional chat -->
  <div class="flex min-h-0 flex-1 overflow-hidden">
    <!-- Video: hidden on mobile when chat is open so chat can fill the space -->
    <div class="h-full flex-1 overflow-hidden {chatOpen ? 'hidden sm:block' : ''}">
      {#if room}
        <VideoGrid {localStream} localName={displayName} peers={room.peers} />
      {/if}
    </div>

    {#if chatOpen}
      <!-- Mobile: fills full area. sm+: fixed-width sidebar alongside video -->
      <div class="flex h-full w-full flex-col sm:w-80 sm:flex-none sm:shrink-0">
        <Chat {messages} onSend={sendMessage} onClose={toggleChat} />
      </div>
    {/if}
  </div>

  <Controls onLeave={leaveRoom} onChat={toggleChat} {unreadCount} onChangeMic={(id) => handleChangeDevice('audio', id)} onChangeCamera={(id) => handleChangeDevice('video', id)} />
</div>
