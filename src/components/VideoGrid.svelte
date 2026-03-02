<script lang="ts">
  import VideoTile from './VideoTile.svelte';
  import type { Peer } from '@/types/index';

  interface Props {
    localStream: MediaStream | null;
    localName: string;
    peers: Peer[];
  }

  let { localStream, localName, peers }: Props = $props();

  // null = grid view, 'local' = local tile pinned, peer.id = that peer pinned
  let pinnedId = $state<string | null>(null);

  const totalCount = $derived(peers.length + 1);

  const gridClass = $derived.by(() => {
    if (totalCount === 1) return 'grid-cols-1';
    if (totalCount === 2) return 'grid-cols-1 sm:grid-cols-2';
    if (totalCount <= 4) return 'grid-cols-2';
    return 'grid-cols-2 sm:grid-cols-3';
  });

  function togglePin(id: string) {
    pinnedId = pinnedId === id ? null : id;
  }

  const pinnedIsLocal = $derived(pinnedId === 'local');
  const pinnedPeer = $derived(pinnedId && !pinnedIsLocal ? (peers.find((p) => p.id === pinnedId) ?? null) : null);
</script>

{#if pinnedId}
  <!-- Spotlight layout: large main tile + horizontal strip -->
  <div class="flex h-full flex-col gap-2 p-2">
    <!-- Main spotlight tile -->
    <div class="min-h-0 flex-1">
      {#if pinnedIsLocal}
        <VideoTile stream={localStream} displayName={localName} isLocal={true} pinned={true} fill={true} onclick={() => togglePin('local')} />
      {:else if pinnedPeer}
        <VideoTile stream={pinnedPeer.stream} displayName={pinnedPeer.displayName} muted={pinnedPeer.muted} pinned={true} fill={true} onclick={() => togglePin(pinnedPeer.id)} />
      {/if}
    </div>

    <!-- Strip of other participants -->
    <div class="flex shrink-0 gap-2 overflow-x-auto" style="height: 120px;">
      {#if !pinnedIsLocal}
        <div class="h-full shrink-0" style="aspect-ratio: 16/9;">
          <VideoTile stream={localStream} displayName={localName} isLocal={true} fill={true} onclick={() => togglePin('local')} />
        </div>
      {/if}
      {#each peers as peer (peer.id)}
        {#if peer.id !== pinnedId}
          <div class="h-full shrink-0" style="aspect-ratio: 16/9;">
            <VideoTile stream={peer.stream} displayName={peer.displayName} muted={peer.muted} fill={true} onclick={() => togglePin(peer.id)} />
          </div>
        {/if}
      {/each}
    </div>
  </div>
{:else}
  <!-- Grid layout: rows share height equally so tiles fill the container -->
  <div class="grid h-full gap-2 p-2 {gridClass}" style="grid-auto-rows: 1fr;">
    <VideoTile stream={localStream} displayName={localName} isLocal={true} fill={true} onclick={() => togglePin('local')} />
    {#each peers as peer (peer.id)}
      <VideoTile stream={peer.stream} displayName={peer.displayName} muted={peer.muted} fill={true} onclick={() => togglePin(peer.id)} />
    {/each}
  </div>
{/if}
