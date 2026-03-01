<script lang="ts">
  import { Button, Card, Input, Label } from 'flowbite-svelte';
  import { v4 as uuidv4 } from 'uuid';
  import { socket } from '@utils/socket';
  import { setRoom } from '@/stores/room.svelte';
  import { getUser } from '@/stores/auth.svelte';
  import type { User } from '@/types/index';

  let joinRoomId = $state('');
  let pendingRoomId = $state(''); // generated but not yet entered
  let pendingRoomUrl = $state('');
  let copied = $state(false);
  let error = $state('');

  const user = $derived(getUser() as User);

  function handleLogout() {
    window.location.href = '/api/auth/logout';
  }

  function generateRoom() {
    const roomId = uuidv4();
    pendingRoomId = roomId;
    pendingRoomUrl = `${window.location.origin}?room=${roomId}`;
    copied = false;
  }

  async function copyUrl() {
    await navigator.clipboard.writeText(pendingRoomUrl);
    copied = true;
    setTimeout(() => (copied = false), 2000);
  }

  function startRoom() {
    enterRoom(pendingRoomId);
  }

  function joinRoom() {
    let id = joinRoomId.trim();
    // Accept full URLs — extract the ?room= param if present
    try {
      const url = new URL(id);
      const param = url.searchParams.get('room');
      if (param) id = param;
    } catch {
      // not a URL, use as-is
    }
    if (!id) {
      error = 'Please enter a room ID or link';
      return;
    }
    error = '';
    enterRoom(id);
  }

  function enterRoom(roomId: string) {
    if (!socket.connected) {
      socket.connect();
    }
    setRoom({ id: roomId, peers: [] });
  }

  $effect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      joinRoomId = roomParam;
    }
  });
</script>

<div class="flex min-h-screen flex-col items-center justify-center bg-gray-50 dark:bg-gray-900">
  <div class="w-full max-w-md px-4">
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">MeshMeet</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400">Welcome, {user?.displayName}</p>
      </div>
      <Button color="light" size="sm" onclick={handleLogout}>Sign out</Button>
    </div>

    <Card class="mb-4 p-6">
      <h2 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Create a room</h2>

      {#if !pendingRoomId}
        <Button color="blue" class="w-full" onclick={generateRoom}>
          <svg class="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Create New Room
        </Button>
      {:else}
        <div class="mb-4 rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
          <p class="mb-2 text-xs font-semibold text-blue-700 dark:text-blue-300">Share this link with others:</p>
          <div class="mb-2 flex items-center gap-2">
            <p class="min-w-0 flex-1 font-mono text-xs break-all text-blue-600 dark:text-blue-400">{pendingRoomUrl}</p>
            <button onclick={copyUrl} class="shrink-0 rounded p-1.5 text-blue-600 transition hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-800" title="Copy link">
              {#if copied}
                <svg class="h-4 w-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
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
        <div class="flex gap-2">
          <Button color="light" class="flex-1" onclick={generateRoom}>New Link</Button>
          <Button color="blue" class="flex-1" onclick={startRoom}>
            <svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Start Room
          </Button>
        </div>
      {/if}
    </Card>

    <Card class="p-6">
      <h2 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Join a room</h2>
      <div class="flex flex-col gap-3">
        <div>
          <Label for="room-id" class="mb-1">Room ID or link</Label>
          <Input id="room-id" bind:value={joinRoomId} placeholder="Paste a room ID or link" />
        </div>
        {#if error}
          <p class="text-sm text-red-500">{error}</p>
        {/if}
        <Button color="green" onclick={joinRoom}>
          <svg class="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
          Join Room
        </Button>
      </div>
    </Card>
  </div>
</div>
