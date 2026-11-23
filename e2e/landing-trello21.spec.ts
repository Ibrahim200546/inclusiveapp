import { expect, test } from "@playwright/test"

for (const [pagePath, width, grade, screen] of [
  ["/materials", 320, "0-1", "grade0Menu"],
  ["/program", 1280, "4", "grade4Menu"],
] as const) {
  test(`${pagePath} (${width}px) opens the correct catalog in the landing locale`, async ({ page }) => {
    await page.setViewportSize({ width, height: 850 })
    await page.goto(pagePath)
    await page.evaluate(() => { localStorage.setItem("locale", "kk"); localStorage.setItem("profileLang", "ru") })
    await page.reload()
    await expect(page.locator("html")).toHaveAttribute("lang", "kk")
    await expect.poll(() => page.evaluate(() => localStorage.getItem("profileLang"))).toBe("kk")
    const link = page.locator(`a[href="/original/index2.html?grade=${grade}&lang=kk"]`)
    await expect(link).toBeVisible()
    await link.click()
    await expect(page.locator(`#${screen}`)).toHaveClass(/\bactive\b/)
    await expect(page.locator("html")).toHaveAttribute("lang", "kk")
  })
}
