import { render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes, useOutletContext } from "react-router-dom"
import { afterEach, expect, it, vi } from "vitest"
import LandingRouteLayout from "@/components/landing/LandingRouteLayout"

vi.mock("@/components/landing/LandingNavigation", () => ({ LandingNavigation: () => null }))
vi.mock("@/components/landing/LandingFooter", () => ({ LandingFooter: () => null }))

function LocaleProbe() {
  const { locale } = useOutletContext<{ locale: string }>()
  return <span>{locale}</span>
}

afterEach(() => localStorage.clear())

it.each([
  ["kk", "ru", "kk"],
  [null, "kk", "kk"],
  ["invalid", "ru", "ru"],
  [null, null, "ru"],
])("aligns landing and trainer locales (%s, %s)", (locale, profile, expected) => {
  if (locale) localStorage.setItem("locale", locale)
  if (profile) localStorage.setItem("profileLang", profile)
  render(<MemoryRouter initialEntries={["/materials"]}><Routes><Route element={<LandingRouteLayout />}><Route path="/materials" element={<LocaleProbe />} /></Route></Routes></MemoryRouter>)
  expect(screen.getByText(expected)).toBeInTheDocument()
  expect(localStorage.getItem("locale")).toBe(expected)
  expect(localStorage.getItem("profileLang")).toBe(expected)
  expect(document.documentElement.lang).toBe(expected)
})
