"use client"

import { useState, useCallback, useEffect, useRef } from "react"

export function useLocalStorage<T>(key: string, initialValue: T) {
  const initialValueRef = useRef(initialValue)

  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") return initialValue
    try {
      const item = window.localStorage.getItem(key)
      return item ? (JSON.parse(item) as T) : initialValue
    } catch {
      return initialValue
    }
  })

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key !== key || e.storageArea !== localStorage) return
      try {
        setStoredValue(e.newValue ? (JSON.parse(e.newValue) as T) : initialValueRef.current)
      } catch {
        // ignore malformed JSON from other tabs
      }
    }
    window.addEventListener("storage", handler)
    return () => window.removeEventListener("storage", handler)
  }, [key])

  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      setStoredValue((prev) => {
        const valueToStore = value instanceof Function ? value(prev) : value
        if (typeof window !== "undefined") {
          try {
            window.localStorage.setItem(key, JSON.stringify(valueToStore))
          } catch {
            window.dispatchEvent(new CustomEvent("storageQuotaExceeded"))
          }
        }
        return valueToStore
      })
    },
    [key]
  )

  return [storedValue, setValue] as const
}
