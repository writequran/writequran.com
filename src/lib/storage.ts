export function getStoragePrefix() {
  if (typeof window === 'undefined') return 'quran_typing_anon';
  const userId = localStorage.getItem('quran_typing_active_user_id');
  return userId ? `quran_typing_user_${userId}` : 'quran_typing_anon';
}

export function getScopedKey(key: string) {
  // We keep 'theme' global if we want, but for full isolation as requested, everything is prefixed:
  return `${getStoragePrefix()}_${key}`;
}

export function getStorage(key: string): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(getScopedKey(key));
}

export function setStorage(key: string, value: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(getScopedKey(key), value);
}

export function removeStorage(key: string) {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(getScopedKey(key));
}

export function setActiveUserId(id: string | null) {
  if (typeof window === 'undefined') return;
  if (id) {
    localStorage.setItem('quran_typing_active_user_id', id);
  } else {
    localStorage.removeItem('quran_typing_active_user_id');
  }
}
