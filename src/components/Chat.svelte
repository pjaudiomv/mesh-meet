<script lang="ts">
  import { tick } from 'svelte';
  import type { ChatMessage } from '@/types/index';

  interface Props {
    messages: ChatMessage[];
    onSend: (text: string) => void;
    onClose: () => void;
  }

  let { messages, onSend, onClose }: Props = $props();

  let text = $state('');
  let listEl = $state<HTMLElement | undefined>(undefined);

  function send() {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    text = '';
  }

  $effect(() => {
    // Track messages.length to re-run when messages change
    const count = messages.length;
    tick().then(() => {
      if (listEl && count >= 0) listEl.scrollTop = listEl.scrollHeight;
    });
  });

  function formatTime(ts: number): string {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
</script>

<div class="flex w-80 shrink-0 flex-col border-l border-gray-700 bg-gray-800">
  <!-- Header -->
  <div class="flex items-center justify-between border-b border-gray-700 px-4 py-3">
    <span class="font-semibold text-white">Chat</span>
    <button onclick={onClose} class="rounded p-1 text-gray-400 hover:bg-gray-700 hover:text-white" title="Close chat">
      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  </div>

  <!-- Messages -->
  <div bind:this={listEl} class="flex-1 space-y-3 overflow-y-auto p-3">
    {#if messages.length === 0}
      <p class="mt-8 text-center text-sm text-gray-500">No messages yet. Say hello!</p>
    {/if}
    {#each messages as msg (msg.id)}
      <div class="flex flex-col {msg.isLocal ? 'items-end' : 'items-start'}">
        <div class="mb-1 flex items-baseline gap-2">
          {#if !msg.isLocal}
            <span class="text-xs font-semibold text-blue-400">{msg.from}</span>
          {/if}
          <span class="text-xs text-gray-500">{formatTime(msg.timestamp)}</span>
        </div>
        <div class="max-w-[85%] rounded-lg px-3 py-2 text-sm break-words {msg.isLocal ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-100'}">
          {msg.text}
        </div>
      </div>
    {/each}
  </div>

  <!-- Input -->
  <div class="border-t border-gray-700 p-3">
    <div class="flex gap-2">
      <input
        bind:value={text}
        placeholder="Send a message…"
        onkeydown={(e: KeyboardEvent) => e.key === 'Enter' && !e.shiftKey && send()}
        class="flex-1 rounded-lg bg-gray-700 px-3 py-2 text-sm text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button onclick={send} disabled={!text.trim()} class="rounded-lg bg-blue-600 p-2 text-white transition hover:bg-blue-700 disabled:opacity-40" title="Send">
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
      </button>
    </div>
  </div>
</div>
