// Client-side normalization for login and account forms. The database and
// the teacher-students function enforce the same rules authoritatively.

export const USERNAME_PATTERN = /^[a-z0-9][a-z0-9_-]{1,28}[a-z0-9]$/;
export const USERNAME_MAX = 30;
export const DISPLAY_NAME_MAX = 60;
export const CLASS_NAME_MAX = 80;

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

export function normalizeJoinCode(value: string): string {
  return value.replace(/\s+/g, '').toUpperCase();
}

export function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

export function isValidUsername(value: string): boolean {
  return USERNAME_PATTERN.test(value);
}

const POLISH_LETTERS: Record<string, string> = {
  ą: 'a', ć: 'c', ę: 'e', ł: 'l', ń: 'n', ó: 'o', ś: 's', ź: 'z', ż: 'z',
};

/** Suggests a login name from a display name, e.g. "Łucja K." → "lucja-k". */
export function suggestUsername(displayName: string): string {
  const ascii = displayName
    .toLowerCase()
    .replace(/[ąćęłńóśźż]/g, (letter) => POLISH_LETTERS[letter] ?? letter)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
  return ascii
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, USERNAME_MAX)
    .replace(/-+$/g, '');
}
