import { describe, it, expect } from "vitest"
import {
  applyBulkDelete,
  applyBulkRestore,
  applyBulkRecategorize,
  reconcileSelection,
  getSelectionTypeState,
} from "../transactionBatch"
import { Transaction } from "@/types"

function makeTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: "txn_1",
    type: "expense",
    amount: 10,
    categoryId: "cat_food",
    description: "Test",
    date: "2026-07-01",
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  }
}

describe("applyBulkDelete", () => {
  it("removes only the selected ids when cascade is false", () => {
    const txns = [
      makeTransaction({ id: "a" }),
      makeTransaction({ id: "b" }),
      makeTransaction({ id: "c" }),
    ]
    const result = applyBulkDelete(txns, ["a", "b"], false)
    expect(result.map((t) => t.id)).toEqual(["c"])
  })

  it("also removes generated instances of a selected template when cascade is true", () => {
    const txns = [
      makeTransaction({ id: "template", isRecurring: true }),
      makeTransaction({ id: "instance1", recurringId: "template" }),
      makeTransaction({ id: "instance2", recurringId: "template" }),
      makeTransaction({ id: "unrelated" }),
    ]
    const result = applyBulkDelete(txns, ["template"], true)
    expect(result.map((t) => t.id)).toEqual(["unrelated"])
  })

  it("leaves instances intact when cascade is false, even if the template is deleted", () => {
    const txns = [
      makeTransaction({ id: "template", isRecurring: true }),
      makeTransaction({ id: "instance1", recurringId: "template" }),
    ]
    const result = applyBulkDelete(txns, ["template"], false)
    expect(result.map((t) => t.id)).toEqual(["instance1"])
  })

  it("is a no-op for an empty id list", () => {
    const txns = [makeTransaction({ id: "a" })]
    expect(applyBulkDelete(txns, [], false)).toBe(txns)
  })

  it("handles a 100+ transaction batch", () => {
    const txns = Array.from({ length: 150 }, (_, i) => makeTransaction({ id: `t${i}` }))
    const idsToDelete = txns.slice(0, 120).map((t) => t.id)
    const result = applyBulkDelete(txns, idsToDelete, false)
    expect(result).toHaveLength(30)
  })
})

describe("applyBulkRestore", () => {
  it("restores all captured transactions in one pass", () => {
    const remaining = [makeTransaction({ id: "keep" })]
    const captured = [makeTransaction({ id: "a" }), makeTransaction({ id: "b" })]
    const result = applyBulkRestore(remaining, captured)
    expect(result.map((t) => t.id).sort()).toEqual(["a", "b", "keep"])
  })

  it("preserves original ids, timestamps, and recurring relationships exactly", () => {
    const original = makeTransaction({
      id: "template",
      isRecurring: true,
      recurringDay: 15,
      createdAt: "2020-01-01T00:00:00.000Z",
      updatedAt: "2020-06-01T00:00:00.000Z",
    })
    const result = applyBulkRestore([], [original])
    expect(result[0]).toEqual(original)
  })

  it("does not create duplicates when the same restore is applied twice", () => {
    const captured = [makeTransaction({ id: "a" }), makeTransaction({ id: "b" })]
    const afterFirst = applyBulkRestore([], captured)
    const afterSecond = applyBulkRestore(afterFirst, captured)
    expect(afterSecond).toHaveLength(2)
    expect(afterSecond.map((t) => t.id).sort()).toEqual(["a", "b"])
  })

  it("only restores ids not already present when partially overlapping", () => {
    const existing = [makeTransaction({ id: "a", description: "already back" })]
    const captured = [makeTransaction({ id: "a", description: "original" }), makeTransaction({ id: "b" })]
    const result = applyBulkRestore(existing, captured)
    expect(result).toHaveLength(2)
    expect(result.find((t) => t.id === "a")?.description).toBe("already back")
  })

  it("is a no-op for an empty restore list", () => {
    const txns = [makeTransaction({ id: "a" })]
    expect(applyBulkRestore(txns, [])).toBe(txns)
  })
})

describe("applyBulkRecategorize", () => {
  it("changes only categoryId and updatedAt for selected transactions", () => {
    const txns = [
      makeTransaction({ id: "a", categoryId: "cat_food", description: "Lunch", notes: "extra" }),
      makeTransaction({ id: "b", categoryId: "cat_food" }),
    ]
    const now = "2026-07-10T12:00:00.000Z"
    const result = applyBulkRecategorize(txns, ["a"], "cat_transport", now)
    const a = result.find((t) => t.id === "a")!
    const b = result.find((t) => t.id === "b")!
    expect(a.categoryId).toBe("cat_transport")
    expect(a.updatedAt).toBe(now)
    expect(a.description).toBe("Lunch")
    expect(a.notes).toBe("extra")
    // Unselected transaction is untouched
    expect(b.categoryId).toBe("cat_food")
  })

  it("is a no-op for an empty id list", () => {
    const txns = [makeTransaction({ id: "a" })]
    expect(applyBulkRecategorize(txns, [], "cat_transport", "2026-01-01T00:00:00.000Z")).toBe(txns)
  })

  it("handles a 100+ transaction batch", () => {
    const txns = Array.from({ length: 120 }, (_, i) => makeTransaction({ id: `t${i}`, categoryId: "cat_food" }))
    const ids = txns.slice(0, 100).map((t) => t.id)
    const result = applyBulkRecategorize(txns, ids, "cat_transport", "2026-01-01T00:00:00.000Z")
    expect(result.filter((t) => t.categoryId === "cat_transport")).toHaveLength(100)
    expect(result.filter((t) => t.categoryId === "cat_food")).toHaveLength(20)
  })
})

describe("reconcileSelection", () => {
  it("drops ids no longer present in the visible set", () => {
    const selected = new Set(["a", "b", "c"])
    const result = reconcileSelection(selected, ["a", "c"])
    expect(result).toEqual(new Set(["a", "c"]))
  })

  it("returns the same reference when nothing changes", () => {
    const selected = new Set(["a", "b"])
    const result = reconcileSelection(selected, ["a", "b", "c"])
    expect(result).toBe(selected)
  })

  it("returns the same reference for an empty selection", () => {
    const selected = new Set<string>()
    expect(reconcileSelection(selected, ["a"])).toBe(selected)
  })
})

describe("getSelectionTypeState", () => {
  const txns = [
    { id: "a", type: "expense" as const },
    { id: "b", type: "income" as const },
    { id: "c", type: "expense" as const },
  ]

  it("reports a homogeneous expense selection", () => {
    const state = getSelectionTypeState(txns, new Set(["a", "c"]))
    expect(state).toEqual({ isMixed: false, commonType: "expense" })
  })

  it("reports a homogeneous income selection", () => {
    const state = getSelectionTypeState(txns, new Set(["b"]))
    expect(state).toEqual({ isMixed: false, commonType: "income" })
  })

  it("reports mixed types", () => {
    const state = getSelectionTypeState(txns, new Set(["a", "b"]))
    expect(state.isMixed).toBe(true)
    expect(state.commonType).toBeNull()
  })

  it("reports no common type for an empty selection", () => {
    const state = getSelectionTypeState(txns, new Set())
    expect(state).toEqual({ isMixed: false, commonType: null })
  })
})
