<script lang="ts">
  import './app.css';
  import Login from '@components/Login.svelte';
  import Lobby from '@components/Lobby.svelte';
  import Room from '@components/Room.svelte';
  import { getDisplayName } from '@/stores/auth.svelte';
  import { getRoom } from '@/stores/room.svelte';
</script>

<svelte:head>
  <title>MeshMeet</title>
</svelte:head>

{#if !getDisplayName()}
  <Login />
{:else if !getRoom()}
  <Lobby />
{:else}
  <Room />
{/if}
