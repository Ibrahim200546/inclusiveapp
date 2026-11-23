import { act, fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter, Outlet, Route, Routes } from "react-router-dom"
import { expect, it, vi } from "vitest"
import ContactPage from "@/pages/landing/ContactPage"

const { insert } = vi.hoisted(() => ({ insert: vi.fn() }))
vi.mock("@/lib/supabase", () => ({ supabase: { from: () => ({ insert }) } }))

it("prevents concurrent submissions, retains a failed draft and confirms only successful submission", async () => {
  let complete!: (response: { error: string | null }) => void
  insert.mockImplementationOnce(() => new Promise(resolve => { complete = resolve }))
    .mockResolvedValueOnce({ error: null })
  render(<MemoryRouter initialEntries={["/contact"]}><Routes><Route element={<Outlet context={{ locale: "ru" }} />}><Route path="/contact" element={<ContactPage />} /></Route></Routes></MemoryRouter>)
  fireEvent.change(screen.getByLabelText("Полное имя"), { target: { value: "Тест" } })
  fireEvent.change(screen.getByLabelText("Электронная почта"), { target: { value: "test@example.invalid" } })
  fireEvent.change(screen.getByLabelText("Сообщение"), { target: { value: "Черновик проверки" } })
  const submit = screen.getByRole("button", { name: "Отправить сообщение" })
  const form = submit.closest("form")!
  fireEvent.submit(form)
  fireEvent.submit(form)
  expect(insert).toHaveBeenCalledTimes(1)
  expect(screen.getByRole("button", { name: "Отправляем…" })).toBeDisabled()
  await act(async () => complete({ error: "test failure" }))
  expect(screen.getByRole("alert")).toHaveTextContent("Сообщение не отправлено")
  expect(screen.getByLabelText("Сообщение")).toHaveValue("Черновик проверки")
  fireEvent.submit(form)
  expect(await screen.findByRole("status")).toHaveTextContent("Ваше сообщение принято")
  expect(insert).toHaveBeenCalledTimes(2)
  fireEvent.click(screen.getByRole("button", { name: "Отправить ещё сообщение" }))
  expect(screen.getByLabelText("Сообщение")).toHaveValue("")
})
