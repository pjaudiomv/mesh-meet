let displayName = $state<string | null>(null);
let peerId = $state<string | null>(null);

export function getDisplayName(): string | null {
  return displayName;
}

export function getPeerId(): string | null {
  return peerId;
}

export function setDisplayName(name: string): void {
  displayName = name.trim() || null;
  // Generate a fresh peer ID for each session so each browser tab is distinct
  peerId = displayName ? crypto.randomUUID() : null;
}
