<script lang="ts">
  import { Button, Card, Input, Label } from 'flowbite-svelte';
  import { setDisplayName } from '@/stores/auth.svelte';
  import { setRoom } from '@/stores/room.svelte';

  // If a ?room= param is in the URL we're in "join" mode
  const params = new URLSearchParams(window.location.search);
  const roomParam = params.get('room');

  let name = $state('');
  let error = $state('');

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) {
      error = 'Please enter your name';
      return;
    }
    setDisplayName(trimmed);
    if (roomParam) {
      // Skip lobby — jump straight into the room
      setRoom({ id: roomParam, peers: [] });
    }
  }
</script>

<div class="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
  <Card class="w-full max-w-sm p-6">
    <div class="mb-6 text-center">
      <h1 class="mb-2 text-2xl font-bold text-gray-900 dark:text-white">MeshMeet</h1>
      {#if roomParam}
        <p class="text-sm text-gray-500 dark:text-gray-400">Enter your name to join the meeting</p>
      {:else}
        <p class="text-sm text-gray-500 dark:text-gray-400">Enter your name to get started</p>
      {/if}
    </div>

    <div class="flex flex-col gap-3">
      <div>
        <Label for="display-name" class="mb-1">Your name</Label>
        <Input id="display-name" bind:value={name} placeholder="e.g. Jane Smith" autofocus onkeydown={(e: KeyboardEvent) => e.key === 'Enter' && submit()} />
        {#if error}
          <p class="mt-1 text-xs text-red-500">{error}</p>
        {/if}
      </div>

      <Button color="blue" class="w-full" onclick={submit}>
        {#if roomParam}
          Join Meeting
        {:else}
          Continue
        {/if}
      </Button>
    </div>
  </Card>
</div>
