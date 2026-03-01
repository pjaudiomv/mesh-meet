<script lang="ts">
  import { Button } from 'flowbite-svelte';
  import { isAudioEnabled, isVideoEnabled, setAudioEnabled, setVideoEnabled, getLocalStream } from '@/stores/room.svelte';

  interface Props {
    onLeave: () => void;
    onChat: () => void;
    unreadCount: number;
  }

  let { onLeave, onChat, unreadCount }: Props = $props();

  function toggleAudio() {
    const stream = getLocalStream();
    const next = !isAudioEnabled();
    setAudioEnabled(next);
    if (stream) {
      for (const track of stream.getAudioTracks()) {
        track.enabled = next;
      }
    }
  }

  function toggleVideo() {
    const stream = getLocalStream();
    const next = !isVideoEnabled();
    setVideoEnabled(next);
    if (stream) {
      for (const track of stream.getVideoTracks()) {
        track.enabled = next;
      }
    }
  }
</script>

<div class="flex items-center justify-center gap-4 bg-gray-800 p-4">
  <Button color={isAudioEnabled() ? 'light' : 'red'} class="rounded-full p-3" onclick={toggleAudio} title={isAudioEnabled() ? 'Mute microphone' : 'Unmute microphone'}>
    {#if isAudioEnabled()}
      <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
      </svg>
    {:else}
      <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
          clip-rule="evenodd"
        />
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
      </svg>
    {/if}
  </Button>

  <Button color={isVideoEnabled() ? 'light' : 'red'} class="rounded-full p-3" onclick={toggleVideo} title={isVideoEnabled() ? 'Turn off camera' : 'Turn on camera'}>
    {#if isVideoEnabled()}
      <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
        />
      </svg>
    {:else}
      <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
      </svg>
    {/if}
  </Button>

  <!-- Chat button with unread badge -->
  <div class="relative">
    <Button color="light" class="rounded-full p-3" onclick={onChat} title="Chat">
      <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        />
      </svg>
    </Button>
    {#if unreadCount > 0}
      <span class="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
        {unreadCount > 9 ? '9+' : unreadCount}
      </span>
    {/if}
  </div>

  <Button color="red" class="rounded-full px-6 py-3" onclick={onLeave}>
    <svg class="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z"
      />
    </svg>
    Leave
  </Button>
</div>
