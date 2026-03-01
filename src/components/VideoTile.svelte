<script lang="ts">
  interface Props {
    stream: MediaStream | null;
    displayName: string;
    isLocal?: boolean;
    muted?: boolean;
  }

  let { stream, displayName, isLocal = false, muted = false }: Props = $props();

  let videoEl = $state<HTMLVideoElement | undefined>(undefined);

  $effect(() => {
    if (videoEl && stream) {
      videoEl.srcObject = stream;
    }
  });
</script>

<div class="relative flex aspect-video items-center justify-center overflow-hidden rounded-lg bg-gray-800">
  {#if stream}
    <video bind:this={videoEl} autoplay playsinline muted={isLocal || muted} class="h-full w-full object-cover"></video>
  {:else}
    <div class="flex flex-col items-center gap-2 text-gray-400">
      <svg class="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="1.5"
          d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
        />
      </svg>
      <span class="text-sm">Connecting…</span>
    </div>
  {/if}

  <div class="absolute bottom-2 left-2 flex items-center gap-1 rounded bg-black/50 px-2 py-1">
    <span class="text-xs text-white">{displayName}{isLocal ? ' (you)' : ''}</span>
    {#if muted && !isLocal}
      <svg class="h-3 w-3 text-red-400" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
      </svg>
    {/if}
  </div>
</div>
