"use client"

import { useState, useCallback, useEffect, useRef } from "react"

const SAME_TAB_EVENT = "tracker-storage-change"

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
  const currentRef = useRef(storedValue)

  const replaceFromStorage = useCallback((raw: string | null) => {
    try {
      const next = raw ? (JSON.parse(raw) as T) : initialValueRef.current
      currentRef.current = next
      setStoredValue(next)
    } catch {
      // The storage recovery banner reports malformed persisted data.
    }
  }, [])

  useEffect(() => {
    replaceFromStorage(localStorage.getItem(key))
    const handler = (e: StorageEvent) => {
      if (e.key !== key || e.storageArea !== localStorage) return
      replaceFromStorage(e.newValue)
    }
    const sameTabHandler = (event: Event) => {
      const detail = (event as CustomEvent<{ key: string; value: string }>).detail
      if (detail?.key === key) replaceFromStorage(detail.value)
    }
    window.addEventListener("storage", handler)
    window.addEventListener(SAME_TAB_EVENT, sameTabHandler)
    return () => {
      window.removeEventListener("storage", handler)
      window.removeEventListener(SAME_TAB_EVENT, sameTabHandler)
    }
  }, [key, replaceFromStorage])

  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      const valueToStore = value instanceof Function ? value(currentRef.current) : value
      if (JSON.stringify(valueToStore) === JSON.stringify(currentRef.current)) return
      try {
        const serialized = JSON.stringify(valueToStore)
        window.localStorage.setItem(key, serialized)
        currentRef.current = valueToStore
        setStoredValue(valueToStore)
        window.dispatchEvent(new CustomEvent(SAME_TAB_EVENT, { detail: { key, value: serialized } }))
      } catch (error) {
        const quotaExceeded = error instanceof DOMException && error.name === "QuotaExceededError"
        window.dispatchEvent(new CustomEvent(quotaExceeded ? "storage-quota-exceeded" : "storage-write-failed"))
      }
    },
    [key]
  )

  return [storedValue, setValue] as const
}
