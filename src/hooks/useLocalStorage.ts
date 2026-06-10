"use client"

import { useState, useCallback, useEffect } from "react"

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") return initialValue
    try {
      const item = window.localStorage.getItem(key)
      return item ? (JSON.parse(item) as T) : initialValue
    } catch {
      return initialValue
    }
  })

  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      setStoredValue((prev) => {
        const valueToStore = value instanceof Function ? value(prev) : value
        if (typeof window !== "undefined") {
          try {
            window.localStorage.setItem(key, JSON.stringify(valueToStore))
          } catch (e) {
            if (e instanceof DOMException && e.name === "QuotaExceededError") {
              window.dispatchEvent(new CustomEvent("storage-quota-exceeded"))
            }
          }
        }
        return valueToStore
      })
    },
    [key]
  )

  useEffect(() => {
    if (typeof window === "undefined") return
    const handleStorage = (e: StorageEvent) => {
      if (e.key !== key) return
      try {
        setStoredValue(e.newValue !== null ? (JSON.parse(e.newValue) as T) : initialValue)
      } catch {
        // ignore parse errors
      }
    }
    window.addEventListener("storage", handleStorage)
    return () => window.removeEventListener("storage", handleStorage)
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps

  return [storedValue, setValue] as const
}
