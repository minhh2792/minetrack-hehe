export const FAVORITE_SERVERS_KEY = 'minetrack_favorite_servers'
export const HIDDEN_SERVERS_KEY = 'minetrack_hidden_servers'
export const SHOW_FAVORITES_KEY = 'minetrack_show_favorites'
export const SORT_OPTION_KEY = 'minetrack_sort_option_index'

export function getLocalStorage<T>(key: string): T | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : null
  } catch {
    return null
  }
}

export function setLocalStorage<T>(key: string, value: T): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // ignore
  }
}

export function removeLocalStorage(key: string): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.removeItem(key)
  } catch {
    // ignore
  }
}
