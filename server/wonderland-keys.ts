const validKeys: Set<string> = new Set(
  (process.env.WONDERLAND_KEYS || '')
    .split(',')
    .map(k => k.trim())
    .filter(Boolean)
);

export function validateWonderlandKey(key: string): boolean {
  if (validKeys.size === 0) {
    return true;
  }
  return validKeys.has(key);
}

export function addWonderlandKey(key: string): void {
  validKeys.add(key);
}
