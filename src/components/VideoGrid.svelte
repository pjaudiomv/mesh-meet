<script lang="ts">
  import VideoTile from './VideoTile.svelte';
  import type { Peer } from '@/types/index';

  interface Props {
    localStream: MediaStream | null;
    localName: string;
    peers: Peer[];
  }

  let { localStream, localName, peers }: Props = $props();

  const totalCount = $derived(peers.length + 1);

  const gridClass = $derived.by(() => {
    if (totalCount === 1) return 'grid-cols-1';
    if (totalCount <= 4) return 'grid-cols-2';
    return 'grid-cols-3';
  });
</script>

<div class="grid h-full gap-2 p-2 {gridClass}">
  <VideoTile stream={localStream} displayName={localName} isLocal={true} />
  {#each peers as peer (peer.id)}
    <VideoTile stream={peer.stream} displayName={peer.displayName} muted={peer.muted} />
  {/each}
</div>
