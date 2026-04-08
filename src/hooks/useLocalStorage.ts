import { useState } from 'react'
export function useLocalStorage<T>(key: string, defaultValue: T): [T, (val: T) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key)
      return item !== null ? (JSON.parse(item) as T) : defaultValue
    } catch {
      return defaultValue
    }
  })

  const setValue = (val: T): void => {
    try {
      setStoredValue(val)
      window.localStorage.setItem(key, JSON.stringify(val))
    } catch {
    }
  }

  return [storedValue, setValue]
}
