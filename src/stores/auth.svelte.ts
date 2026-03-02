let displayName = $state<string | null>(null);

export function getDisplayName(): string | null {
  return displayName;
}

export function setDisplayName(name: string): void {
  displayName = name.trim() || null;
}
