import { beforeEach, expect, it, vi } from "vitest"
import { saveOrShareFile } from "../fileExport"
const mocks = vi.hoisted(() => ({ native: true, write: vi.fn(), remove: vi.fn(), share: vi.fn() }))
vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => mocks.native } }))
vi.mock("@capacitor/filesystem", () => ({ Directory: { Cache: "CACHE" }, Filesystem: { writeFile: mocks.write, deleteFile: mocks.remove } }))
vi.mock("@capacitor/share", () => ({ Share: { share: mocks.share } }))
beforeEach(() => { mocks.native = true; mocks.write.mockReset().mockResolvedValue({ uri: "file:///private/cache/export.pdf" }); mocks.remove.mockReset().mockResolvedValue(undefined); mocks.share.mockReset().mockResolvedValue(undefined) })
it("shares binary PDF from private cache and cleans up afterward", async () => {
  await expect(saveOrShareFile(new Uint8Array([0, 255, 42]), "export.pdf", "application/pdf")).resolves.toBe("shared")
  expect(mocks.write).toHaveBeenCalledWith({ path: "export.pdf", data: "AP8q", directory: "CACHE", recursive: true })
  expect(mocks.share.mock.calls[0][0].files).toEqual(["file:///private/cache/export.pdf"])
  expect(mocks.remove).toHaveBeenCalledWith({ path: "export.pdf", directory: "CACHE" })
})
it("reports a rejected share while still cleaning the temporary financial file", async () => {
  mocks.share.mockRejectedValue(new Error("destination unavailable"))
  await expect(saveOrShareFile("amount,55", "export.csv", "text/csv")).rejects.toThrow("destination unavailable")
  expect(mocks.remove).toHaveBeenCalledTimes(1)
})
it("a failed private write never opens a share sheet", async () => {
  mocks.write.mockRejectedValue(new Error("storage full"))
  await expect(saveOrShareFile("data", "export.csv", "text/csv")).rejects.toThrow("storage full")
  expect(mocks.share).not.toHaveBeenCalled()
})
