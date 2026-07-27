/**
 * Extracts a group invite code from arbitrary pasted text.
 *
 * Handles, in priority order:
 *  1. The full share message or invite URL (".../invite/BB81FC3A")
 *  2. Any other URL — its last path segment, when it looks like a code
 *  3. "Kod: BB81FC3A" style text — the last alphanumeric token
 *  4. The plain code itself ("bb81fc3a")
 *
 * Returns the normalized upper-case code, or '' when nothing usable is found.
 */
export function parseInviteCode(raw: string): string {
  if (!raw) return '';
  const text = raw.trim();

  const inviteMatch = text.match(/invite\/([A-Za-z0-9]+)/i);
  if (inviteMatch) return inviteMatch[1].toUpperCase();

  const urlMatch = text.match(/https?:\/\/\S+/i);
  if (urlMatch) {
    const segment = urlMatch[0].split(/[/?#]/).filter(Boolean).pop();
    if (segment && /^[A-Za-z0-9]+$/.test(segment)) return segment.toUpperCase();
  }

  const tokens = text.match(/[A-Za-z0-9]{4,}/g);
  if (tokens?.length) return tokens[tokens.length - 1].toUpperCase();

  return text.toUpperCase();
}

/**
 * Whether the input looks like a pasted blob (a link or multi-token text)
 * rather than someone typing a bare code character by character.
 */
export function looksLikeInviteBlob(value: string): boolean {
  return /invite\/|https?:\/\/|\s/.test(value);
}
