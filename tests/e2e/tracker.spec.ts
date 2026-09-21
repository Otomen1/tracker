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
  await expect(page.getByRole("heading", { name: "Your financial picture starts here" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Add first transaction" })).toHaveCount(1)
  await expect(page.getByText("Income", { exact: true })).toHaveCount(0)
})

test("empty analytics replaces charts with one guided state", async ({ page }) => {
  await page.goto("/analytics")
  await expect(page.getByRole("heading", { name: "Your analytics will appear here" })).toBeVisible()
  await expect(page.getByRole("img", { name: /chart/i })).toHaveCount(0)
  await expect(page.getByRole("link", { name: "Add transaction" })).toBeVisible()
})

test("settings section navigation moves to the selected section", async ({ page }) => {
  await page.goto("/settings")
  if ((page.viewportSize()?.width ?? 0) >= 1024) {
    await page.getByRole("navigation", { name: "Settings sections" }).getByRole("button", { name: "Data & Backup" }).click()
  } else {
    await page.getByRole("combobox", { name: "Settings section" }).click()
    await page.getByRole("option", { name: "Data & Backup" }).click()
  }
  await expect(page.locator("#data-backup")).toBeInViewport({ timeout: 10_000 })
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
