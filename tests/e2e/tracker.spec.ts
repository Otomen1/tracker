import { expect, test } from "@playwright/test"

const description = "Persistence regression purchase"

test.beforeEach(async ({ page }) => {
  await page.goto("/")
  await page.evaluate(() => {
    localStorage.clear()
    localStorage.setItem("tracker_onboarded", "1")
  })
})

test("a deleted transaction stays deleted after focus, navigation, and refresh", async ({ page }) => {
  page.on("pageerror", (error) => console.error("Browser page error:", error.message))
  page.on("console", (message) => {
    if (message.type() === "error") console.error("Browser console error:", message.text())
  })
  await page.goto("/transactions")
  await page.waitForLoadState("networkidle")
  await page.getByRole("button", { name: "Add Transaction", exact: true }).click()
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
