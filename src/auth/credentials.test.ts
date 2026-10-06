import { describe, expect, it } from 'vitest';
import { isValidUsername, normalizeJoinCode, normalizeName, normalizeUsername, suggestUsername } from './credentials';

describe('credentials', () => {
  it('normalizes what children type', () => {
    expect(normalizeJoinCode(' python 25 ')).toBe('PYTHON25');
    expect(normalizeUsername('  Kuba7 ')).toBe('kuba7');
    expect(normalizeName('  Ania   Nowak ')).toBe('Ania Nowak');
  });

  it('suggests ASCII usernames from Polish names', () => {
    expect(suggestUsername('Łucja Żółć')).toBe('lucja-zolc');
    expect(suggestUsername('  Zoë  ')).toBe('zoe');
    expect(suggestUsername('Kuba 7!')).toBe('kuba-7');
    expect(suggestUsername('Ąę')).toBe('ae');
  });

  it('keeps suggestions within the length limit without a trailing dash', () => {
    const suggestion = suggestUsername(`${'a'.repeat(29)} b`);
    expect(suggestion).toBe('a'.repeat(29));
    expect(isValidUsername(suggestion)).toBe(true);
  });

  it('accepts only usernames the database accepts', () => {
    expect(isValidUsername('ola')).toBe(true);
    expect(isValidUsername('kuba_7-b')).toBe(true);
    expect(isValidUsername('ab')).toBe(false);
    expect(isValidUsername('-ola')).toBe(false);
    expect(isValidUsername('Ola')).toBe(false);
    expect(isValidUsername('żaba')).toBe(false);
  });
});
