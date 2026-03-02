<script lang="ts">
  import { isAudioEnabled, isVideoEnabled, setAudioEnabled, setVideoEnabled, getLocalStream } from '@/stores/room.svelte';

  interface Props {
    onLeave: () => void;
    onChat: () => void;
    unreadCount: number;
    onChangeMic: (deviceId: string) => void;
    onChangeCamera: (deviceId: string) => void;
  }

  let { onLeave, onChat, unreadCount, onChangeMic, onChangeCamera }: Props = $props();

  let showMicPicker = $state(false);
  let showCamPicker = $state(false);
  let audioDevices = $state<MediaDeviceInfo[]>([]);
  let videoDevices = $state<MediaDeviceInfo[]>([]);
  let activeMicId = $state('');
  let activeCamId = $state('');

  function toggleAudio() {
    const stream = getLocalStream();
    const next = !isAudioEnabled();
    setAudioEnabled(next);
    if (stream) for (const t of stream.getAudioTracks()) t.enabled = next;
  }

  function toggleVideo() {
    const stream = getLocalStream();
    const next = !isVideoEnabled();
    setVideoEnabled(next);
    if (stream) for (const t of stream.getVideoTracks()) t.enabled = next;
  }

  async function openMicPicker(e: MouseEvent) {
    e.stopPropagation();
    showCamPicker = false;
    const devices = await navigator.mediaDevices.enumerateDevices();
    audioDevices = devices.filter((d) => d.kind === 'audioinput');
    showMicPicker = !showMicPicker;
  }

  async function openCamPicker(e: MouseEvent) {
    e.stopPropagation();
    showMicPicker = false;
    const devices = await navigator.mediaDevices.enumerateDevices();
    videoDevices = devices.filter((d) => d.kind === 'videoinput');
    showCamPicker = !showCamPicker;
  }

  function selectMic(e: MouseEvent, deviceId: string) {
    e.stopPropagation();
    activeMicId = deviceId;
    showMicPicker = false;
    onChangeMic(deviceId);
  }

  function selectCam(e: MouseEvent, deviceId: string) {
    e.stopPropagation();
    activeCamId = deviceId;
    showCamPicker = false;
    onChangeCamera(deviceId);
  }

  function deviceLabel(device: MediaDeviceInfo, i: number): string {
    return device.label || (device.kind === 'audioinput' ? `Microphone ${i + 1}` : `Camera ${i + 1}`);
  }

  function dismissPickers() {
    showMicPicker = false;
    showCamPicker = false;
  }
</script>

<svelte:window onclick={dismissPickers} />

<!-- Safe area padding so controls clear the iOS home indicator -->
<div class="pb-safe bg-gray-800">
  <div class="flex items-center justify-around px-2 py-3 sm:justify-center sm:gap-6 sm:px-6">
    <!-- ── Mic group ── -->
    <div class="relative flex flex-col items-center gap-1">
      <div class="flex items-end gap-0.5">
        <button
          onclick={toggleAudio}
          class="flex h-12 w-12 items-center justify-center rounded-full transition active:scale-95 {isAudioEnabled()
            ? 'bg-gray-700 text-white hover:bg-gray-600'
            : 'bg-red-600 text-white hover:bg-red-500'}"
          aria-label={isAudioEnabled() ? 'Mute microphone' : 'Unmute microphone'}
        >
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
        </button>
        <button onclick={openMicPicker} class="mb-0.5 rounded p-1 text-gray-500 transition hover:text-gray-300 active:scale-95" aria-label="Choose microphone" title="Choose microphone">
          <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 15l7-7 7 7" />
          </svg>
        </button>
      </div>
      <span class="text-[10px] text-gray-500">{isAudioEnabled() ? 'Mic' : 'Muted'}</span>

      {#if showMicPicker}
        <div class="absolute bottom-full left-0 z-50 mb-3 w-60 overflow-hidden rounded-xl bg-gray-700 shadow-2xl ring-1 ring-white/10">
          <p class="px-3 pt-2.5 pb-1 text-[10px] font-semibold tracking-widest text-gray-400 uppercase">Microphone</p>
          {#each audioDevices as device, i (device.deviceId)}
            <button onclick={(e) => selectMic(e, device.deviceId)} class="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-white transition hover:bg-gray-600 active:bg-gray-500">
              <span class="flex h-4 w-4 shrink-0 items-center justify-center">
                {#if activeMicId === device.deviceId}
                  <svg class="h-3.5 w-3.5 text-blue-400" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                  </svg>
                {/if}
              </span>
              <span class="flex-1 truncate">{deviceLabel(device, i)}</span>
            </button>
          {/each}
        </div>
      {/if}
    </div>

    <!-- ── Camera group ── -->
    <div class="relative flex flex-col items-center gap-1">
      <div class="flex items-end gap-0.5">
        <button
          onclick={toggleVideo}
          class="flex h-12 w-12 items-center justify-center rounded-full transition active:scale-95 {isVideoEnabled()
            ? 'bg-gray-700 text-white hover:bg-gray-600'
            : 'bg-red-600 text-white hover:bg-red-500'}"
          aria-label={isVideoEnabled() ? 'Turn off camera' : 'Turn on camera'}
        >
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
        </button>
        <button onclick={openCamPicker} class="mb-0.5 rounded p-1 text-gray-500 transition hover:text-gray-300 active:scale-95" aria-label="Choose camera" title="Choose camera">
          <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 15l7-7 7 7" />
          </svg>
        </button>
      </div>
      <span class="text-[10px] text-gray-500">{isVideoEnabled() ? 'Camera' : 'Off'}</span>

      {#if showCamPicker}
        <div class="absolute bottom-full left-0 z-50 mb-3 w-60 overflow-hidden rounded-xl bg-gray-700 shadow-2xl ring-1 ring-white/10">
          <p class="px-3 pt-2.5 pb-1 text-[10px] font-semibold tracking-widest text-gray-400 uppercase">Camera</p>
          {#each videoDevices as device, i (device.deviceId)}
            <button onclick={(e) => selectCam(e, device.deviceId)} class="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-white transition hover:bg-gray-600 active:bg-gray-500">
              <span class="flex h-4 w-4 shrink-0 items-center justify-center">
                {#if activeCamId === device.deviceId}
                  <svg class="h-3.5 w-3.5 text-blue-400" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                  </svg>
                {/if}
              </span>
              <span class="flex-1 truncate">{deviceLabel(device, i)}</span>
            </button>
          {/each}
        </div>
      {/if}
    </div>

    <!-- ── Chat ── -->
    <div class="relative flex flex-col items-center gap-1">
      <button onclick={onChat} class="flex h-12 w-12 items-center justify-center rounded-full bg-gray-700 text-white transition hover:bg-gray-600 active:scale-95" aria-label="Chat">
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      </button>
      {#if unreadCount > 0}
        <span class="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      {/if}
      <span class="text-[10px] text-gray-500">Chat</span>
    </div>

    <!-- ── Leave ── -->
    <div class="flex flex-col items-center gap-1">
      <button onclick={onLeave} class="flex h-12 items-center justify-center gap-1.5 rounded-full bg-red-600 px-5 text-white transition hover:bg-red-500 active:scale-95" aria-label="Leave meeting">
        <svg class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
        <span class="text-sm font-medium">Leave</span>
      </button>
      <span class="text-[10px] text-gray-500">Leave</span>
    </div>
  </div>
</div>
