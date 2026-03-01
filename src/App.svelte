<script lang="ts">
  import './app.css';
  import { onMount } from 'svelte';
  import Login from '@components/Login.svelte';
  import Lobby from '@components/Lobby.svelte';
  import Room from '@components/Room.svelte';
  import { fetchUser, getUser, isLoading } from '@/stores/auth.svelte';
  import { getRoom } from '@/stores/room.svelte';

  onMount(() => {
    fetchUser();
  });
</script>

<svelte:head>
  <title>MeshMeet</title>
</svelte:head>

{#if isLoading()}
  <div class="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
    <div class="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
  </div>
{:else if !getUser()}
  <Login />
{:else if !getRoom()}
  <Lobby />
{:else}
  <Room />
{/if}
