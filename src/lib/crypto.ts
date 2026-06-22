// AES-256-GCM encryption and SHA-256 integrity via built-in Web Crypto API.
// No external dependencies.

const PBKDF2_ITERATIONS = 250_000
const SALT_BYTES = 16
const IV_BYTES = 12

// TypeScript's DOM lib types Uint8Array buffers as ArrayBufferLike; slice() gives a concrete ArrayBuffer.
function toBuffer(typed: Uint8Array): ArrayBuffer {
  return typed.slice().buffer as ArrayBuffer
}

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    toBuffer(new TextEncoder().encode(password)),
    "PBKDF2",
    false,
    ["deriveKey"]
  )
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: toBuffer(salt), iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  )
}

export async function encryptData(plaintext: string, password: string): Promise<string> {
  const salt = new Uint8Array(SALT_BYTES)
  const iv = new Uint8Array(IV_BYTES)
  crypto.getRandomValues(salt)
  crypto.getRandomValues(iv)

  const key = await deriveKey(password, salt)
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: toBuffer(iv) },
    key,
    toBuffer(new TextEncoder().encode(plaintext))
  )
  // Pack: salt (16) + iv (12) + ciphertext → base64
  const encBytes = new Uint8Array(encrypted)
  const combined = new Uint8Array(SALT_BYTES + IV_BYTES + encBytes.length)
  combined.set(salt, 0)
  combined.set(iv, SALT_BYTES)
  combined.set(encBytes, SALT_BYTES + IV_BYTES)
  return btoa(Array.from(combined, (b) => String.fromCharCode(b)).join(""))
}

export async function decryptData(ciphertext: string, password: string): Promise<string> {
  let combined: Uint8Array
  try {
    combined = Uint8Array.from(atob(ciphertext), (c) => c.charCodeAt(0))
  } catch {
    throw new Error("Corrupted backup file")
  }
  if (combined.length < SALT_BYTES + IV_BYTES + 1) throw new Error("Corrupted backup file")

  const salt = combined.slice(0, SALT_BYTES)
  const iv = combined.slice(SALT_BYTES, SALT_BYTES + IV_BYTES)
  const data = combined.slice(SALT_BYTES + IV_BYTES)
  const key = await deriveKey(password, salt)
  try {
    const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: toBuffer(iv) }, key, toBuffer(data))
    return new TextDecoder().decode(decrypted)
  } catch {
    throw new Error("Incorrect password or corrupted file")
  }
}

export async function computeChecksum(data: string): Promise<string> {
  const buffer = await crypto.subtle.digest("SHA-256", toBuffer(new TextEncoder().encode(data)))
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

export async function verifyChecksum(data: string, expected: string): Promise<boolean> {
  return (await computeChecksum(data)) === expected
}
