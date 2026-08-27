import { describe, it, expect } from "vitest"
import { encryptData, decryptData, computeChecksum, verifyChecksum } from "../crypto"

describe("crypto backup helpers", () => {
  it("round-trips encrypted data with the correct password", async () => {
    const plaintext = JSON.stringify({ transactions: [{ amount: 12.5 }] })
    const encrypted = await encryptData(plaintext, "correct horse battery staple")

    expect(encrypted).not.toContain(plaintext)
    await expect(decryptData(encrypted, "correct horse battery staple")).resolves.toBe(plaintext)
  })

  it("rejects an incorrect password", async () => {
    const encrypted = await encryptData("private financial data", "right-password")

    await expect(decryptData(encrypted, "wrong-password")).rejects.toThrow(
      "Incorrect password or corrupted file"
    )
  })

  it("rejects corrupted ciphertext", async () => {
    const encrypted = await encryptData("private financial data", "password")
    const corrupted = encrypted.slice(0, -2) + "xx"

    await expect(decryptData(corrupted, "password")).rejects.toThrow()
  })

  it("detects checksum changes", async () => {
    const original = JSON.stringify({ transactions: [] })
    const checksum = await computeChecksum(original)

    await expect(verifyChecksum(original, checksum)).resolves.toBe(true)
    await expect(verifyChecksum(JSON.stringify({ transactions: [{ id: "changed" }] }), checksum))
      .resolves.toBe(false)
  })
})
