import { expect, test } from "@playwright/test"

for (const [pagePath, width, grade, screen] of [
  ["/materials", 320, "0-1", "grade0Menu"],
  ["/program", 1280, "4", "grade4Menu"],
] as const) {
  test(`${pagePath} (${width}px) opens the correct catalog in the landing locale`, async ({ page }) => {
    await page.setViewportSize({ width, height: 850 })
    // Seed before the first landing mount can synchronize these keys. Do not
    // seed the trainer: its locale must come from the actual landing handoff.
    await page.addInitScript((landingPath) => {
      if (window !== window.top || location.pathname !== landingPath) return
      localStorage.setItem("locale", "kk")
      localStorage.setItem("profileLang", "ru")
    }, pagePath)
    await page.goto(pagePath)
    await expect(page.locator("html")).toHaveAttribute("lang", "kk")
    await expect.poll(() => page.evaluate(() => localStorage.getItem("profileLang"))).toBe("kk")
    const link = page.locator(`a[href="/original/index2.html?grade=${grade}&lang=kk"]`)
    await expect(link).toBeVisible()
    await link.click()
    await expect(page.locator(`#${screen}`)).toHaveClass(/\bactive\b/)
    await expect(page.locator("html")).toHaveAttribute("lang", "kk")
  })
}
