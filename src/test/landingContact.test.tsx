import { render, screen } from "@testing-library/react"
import { MemoryRouter, Outlet, Route, Routes } from "react-router-dom"
import { expect, it } from "vitest"
import ContactPage from "@/pages/landing/ContactPage"

it.each([
  ["ru", "Контакты", "Открыть на GitHub", "На сайте нет формы отправки сообщений."],
  ["kk", "Байланыс", "GitHub-та ашу", "Сайтта хабарлама жіберу формасы жоқ."],
])("offers a public project link without collecting personal data (%s)", (locale, title, link, notice) => {
  const { container } = render(<MemoryRouter initialEntries={["/contact"]}><Routes><Route element={<Outlet context={{ locale }} />}><Route path="/contact" element={<ContactPage />} /></Route></Routes></MemoryRouter>)
  expect(screen.getByRole("heading", { name: title })).toBeInTheDocument()
  expect(screen.getByRole("link", { name: link })).toHaveAttribute("href", "https://github.com/Ibrahim200546/inclusiveapp")
  expect(screen.getByText(text => text.startsWith(notice))).toBeInTheDocument()
  expect(container.querySelector("form, input, textarea")).toBeNull()
})
