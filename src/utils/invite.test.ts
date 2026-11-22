import { describe, expect, it } from '@jest/globals';
import { looksLikeInviteBlob, parseInviteCode } from './invite';

describe('parseInviteCode', () => {
  it('reads the code from an invite link', () => {
    expect(parseInviteCode('https://splitsnap.app/invite/bb81fc3a')).toBe('BB81FC3A');
  });

  it('reads the code from a full share message', () => {
    expect(parseInviteCode('SplitSnap grubuma katıl: https://splitsnap.app/invite/BB81FC3A')).toBe('BB81FC3A');
  });

  it('takes the last path segment of another URL', () => {
    expect(parseInviteCode('https://example.com/join/BB81FC3A?ref=x')).toBe('BB81FC3A');
  });

  it('takes the last token of "Kod:" text', () => {
    expect(parseInviteCode('Kod: bb81fc3a')).toBe('BB81FC3A');
  });

  it('normalises a bare code', () => {
    expect(parseInviteCode('  bb81fc3a ')).toBe('BB81FC3A');
    expect(parseInviteCode('')).toBe('');
  });
});

describe('looksLikeInviteBlob', () => {
  it('tells pasted text from typing', () => {
    expect(looksLikeInviteBlob('https://splitsnap.app/invite/X')).toBe(true);
    expect(looksLikeInviteBlob('Kod: X')).toBe(true);
    expect(looksLikeInviteBlob('BB81')).toBe(false);
  });
});
