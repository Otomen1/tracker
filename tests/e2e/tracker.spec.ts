import { expect, test } from "@playwright/test"

const description = "Persistence regression purchase"

test.beforeEach(async ({ page }) => {
  await page.goto("/")
  await page.evaluate(() => {
    localStorage.clear()
    localStorage.setItem("tracker_onboarded", "1")
  })
  await page.reload()
})

test("a deleted transaction stays deleted after focus, navigation, and refresh", async ({ page }) => {
  page.on("pageerror", (error) => console.error("Browser page error:", error.message))
  page.on("console", (message) => {
    if (message.type() === "error") console.error("Browser console error:", message.text())
  })
  await page.goto("/transactions")
  await page.waitForLoadState("networkidle")
  await page.getByRole("button", { name: "Add Transaction", exact: true }).click()
  await expect(page.getByRole("dialog")).toBeVisible()
  await page.getByLabel("Amount", { exact: true }).fill("12.50")
  await page.getByRole("combobox", { name: "Category", exact: true }).click()
  await page.getByRole("option", { name: "Food" }).click()
  await page.getByLabel("Description", { exact: true }).fill(description)
  await page.getByRole("button", { name: "Add Transaction", exact: true }).last().click()
  await expect(page.getByText(description)).toBeVisible()

  await page.getByRole("button", { name: `Details for ${description}` }).click()
  await page.getByRole("button", { name: `Delete ${description}` }).click()
  await page.getByRole("button", { name: "Delete", exact: true }).click()
  await expect(page.getByText(description)).toHaveCount(0)

  await page.evaluate(() => window.dispatchEvent(new Event("focus")))
  await page.goto("/analytics")
  await page.goto("/transactions")
  await page.reload()

  await expect(page.getByText(description)).toHaveCount(0)
  await expect.poll(() => page.evaluate(() => localStorage.getItem("tracker_transactions"))).toBe("[]")
})

test("first-use dashboard presents one primary transaction action", async ({ page }) => {
  await page.goto("/")
  await expect(page.getByRole("heading", { name: "Your transaction history starts here" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Add first transaction" })).toHaveCount(1)
  await expect(page.getByText("Income", { exact: true })).toHaveCount(0)
})

test("empty analytics replaces charts with one guided state", async ({ page }) => {
  await page.goto("/analytics")
  await expect(page.getByRole("heading", { name: "Your analytics will appear here" })).toBeVisible()
  await expect(page.getByRole("img", { name: /chart/i })).toHaveCount(0)
  await expect(page.getByRole("link", { name: "Add transaction" })).toBeVisible()
})

test("settings routes to backup and returns to the index", async ({ page }) => {
  await page.goto("/settings")
  await page.getByRole("navigation", { name: "Settings sections" }).getByRole("link", { name: "Backup & restore" }).click()
  await expect(page).toHaveURL(/\/settings\/backup$/)
  await expect(page.getByRole("button", { name: "Create encrypted backup" })).toBeVisible()
  await page.getByRole("link", { name: "← Settings", exact: true }).click()
  await expect(page).toHaveURL(/\/settings$/)
})

test("settings exposes accounts and finance on a small screen", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto("/settings")
  await page.getByRole("navigation", { name: "Settings sections" }).getByRole("link", { name: "Categories & budgets" }).click()
  await expect(page.getByRole("heading", { name: "Categories & budgets" })).toBeVisible()
  await expect(page.getByRole("link", { name: "Manage categories" })).toBeVisible()
})

test("mobile PWA keeps primary controls clear of navigation", async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 0) >= 640, "Mobile layout only")
  await page.goto("/settings")
  await expect(page.getByRole("button", { name: "Add Transaction" })).toHaveCount(0)

  await page.goto("/transactions")
  await expect(page.getByLabel("Transaction type")).toBeHidden()
  await expect(page.getByLabel("From date")).toBeHidden()
  await page.getByRole("button", { name: "Filters" }).click()
  await expect(page.getByLabel("Transaction type")).toBeVisible()
  await expect(page.getByLabel("From date")).toBeVisible()
})

test("transaction form uses a mobile bottom sheet", async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 0) >= 640, "Mobile layout only")
  await page.goto("/transactions")
  await page.getByRole("button", { name: "Add Transaction", exact: true }).click()
  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()
  const positioning = await dialog.evaluate((element) => {
    const style = getComputedStyle(element)
    return { position: style.position, bottom: style.bottom }
  })
  expect(positioning).toEqual({ position: "fixed", bottom: "0px" })
  await expect(page.getByRole("button", { name: "Add Transaction", exact: true }).last()).toBeVisible()
})

for (const width of [320, 375, 768, 1024, 1440]) {
  test(`dashboard remains usable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto("/")
    await expect(page.locator("main")).toBeVisible()
    await expect(page.getByRole("button", { name: "Add first transaction" })).toBeVisible()
  })
}

for (const route of ["/", "/transactions", "/analytics", "/settings"]) {
  test(`${route} renders without a page error`, async ({ page }, testInfo) => {
    await page.goto(route)
    await expect(page.locator("main")).toBeVisible()
    await expect(page.getByText("Something went wrong")).toHaveCount(0)
    await page.screenshot({
      path: testInfo.outputPath(`${route === "/" ? "dashboard" : route.slice(1)}.png`),
      fullPage: true,
    })
  })
}


test("custom card source setup has no asset fields", async ({ page }) => {
  await page.goto("/settings/accounts")
  await page.getByRole("button", { name: "Add account", exact: true }).click()
  const form = page.getByRole("form", { name: "New account" })
  await form.getByLabel("Account name", { exact: true }).fill("Personal card")
  await form.getByLabel("Account kind", { exact: true }).selectOption("credit_card")
  await expect(form.getByLabel(/Opening|Credit limit|Statement/)).toHaveCount(0)
  await form.getByRole("button", { name: "Create account" }).click()
  await expect(page.getByRole("heading", { name: "Personal card" })).toBeVisible()
  await expect(page.getByText(/Automatic notification capture is not configured/)).toBeVisible()
  await page.reload()
  await expect(page.getByRole("heading", { name: "Personal card" })).toBeVisible()
})

test("rapid submit saves once and a card repayment remains an editable transfer", async ({ page }) => {
  await page.evaluate(() => {
    const base = { currency: "MYR", openingBalance: 0, isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" }
    localStorage.setItem("tracker_accounts", JSON.stringify([{ ...base, id: "bank", name: "Bank", kind: "bank" }, { ...base, id: "card", name: "Card", kind: "credit_card" }]))
  })
  await page.goto("/transactions")
  await page.reload()
  await page.getByRole("button", { name: "Add Transaction", exact: true }).click()
  await page.getByLabel("Amount", { exact: true }).fill("50")
  await page.getByRole("combobox", { name: "Account", exact: true }).click()
  await page.getByRole("option", { name: "Card", exact: true }).click()
  await page.getByRole("combobox", { name: "Category", exact: true }).click()
  await page.getByRole("option", { name: "Food", exact: true }).click()
  await page.getByLabel("Description", { exact: true }).fill("Card purchase")
  await page.getByRole("form", { name: "Transaction editor" }).evaluate((form: HTMLFormElement) => { form.requestSubmit(); form.requestSubmit() })
  await expect(page.getByRole("dialog")).toHaveCount(0)
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("tracker_transactions") ?? "[]").length)).toBe(1)
  await page.getByRole("button", { name: "Add Transaction", exact: true }).click()
  await page.getByRole("button", { name: "transfer", exact: true }).click()
  await page.getByLabel("Amount", { exact: true }).fill("40")
  await page.getByLabel("From account", { exact: true }).selectOption("bank")
  await page.getByLabel("To account", { exact: true }).selectOption("card")
  await page.getByLabel("Description", { exact: true }).fill("Card repayment")
  await page.getByRole("button", { name: "Add Transaction", exact: true }).last().click()
  await page.getByRole("button", { name: "Details for Card repayment", exact: true }).click()
  await page.getByRole("button", { name: "Edit Card repayment", exact: true }).click()
  await page.getByLabel("Amount", { exact: true }).fill("45")
  await page.getByRole("button", { name: "Save Changes", exact: true }).click()
  await expect(page.getByRole("dialog")).toHaveCount(0)
  const entries = await page.evaluate(() => JSON.parse(localStorage.getItem("tracker_transactions") ?? "[]"))
  expect(entries).toHaveLength(2)
  expect(entries.find((t: { type: string }) => t.type === "transfer")).toMatchObject({ amount: 45, fromAccountId: "bank", toAccountId: "card", categoryId: "" })
})
