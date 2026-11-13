import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AlphabetPanel } from './AlphabetPanel';

afterEach(cleanup);
const click = async (element: HTMLElement) => { await act(async () => { fireEvent.click(element); }); };
function setup(locale: 'kk' | 'ru' = 'kk') {
  const audio = { letter: vi.fn().mockResolvedValue('ended'), word: vi.fn().mockResolvedValue('ended'), stop: vi.fn() };
  const wrapper = document.createElement('div'); document.body.append(wrapper);
  const view = render(<AlphabetPanel locale={locale} audio={audio} wrapper={wrapper} />);
  return { audio, ...view, cleanup() { view.unmount(); wrapper.remove(); } };
}
describe('React alphabet', () => {
  it('cycles through letters in focus mode, replays them and restores focus on close', async () => {
    const view = setup();
    const header = screen.getByRole('button', { name: 'Әліппе' });
    await click(header); expect(document.body).toHaveClass('alippe-focus-active');
    expect(view.audio.letter).toHaveBeenLastCalledWith('А');
    await click(document.querySelector('[data-alippe-action="back"]')!); expect(view.audio.letter).toHaveBeenLastCalledWith('Я');
    await click(document.querySelector('[data-alippe-action="next"]')!); expect(view.audio.letter).toHaveBeenLastCalledWith('А');
    await click(document.querySelector('[data-alippe-action="replay"]')!); expect(view.audio.letter).toHaveBeenLastCalledWith('А');
    await click(document.querySelector('[data-alippe-action="toggle"]')!);
    expect(document.body).not.toHaveClass('alippe-focus-active'); expect(header).toHaveFocus();
    await click(header); view.cleanup(); expect(document.body).not.toHaveClass('alippe-focus-active'); expect(view.audio.stop).toHaveBeenCalled();
  });
  it('opens Russian word examples with keyboard dismissal, focus trapping and audio cancellation', async () => {
    const view = setup('ru');
    const letter = screen.getByRole('button', { name: 'А — Арбуз' }); letter.focus(); await click(letter);
    expect(view.audio.word).toHaveBeenLastCalledWith('А', 'Арбуз');
    const dialog = screen.getByRole('dialog'); const first = dialog.querySelector('button')!; expect(first).toHaveFocus();
    fireEvent.keyDown(first, { key: 'Tab', shiftKey: true }); expect(screen.getByRole('button', { name: 'Закрыть ❌' })).toHaveFocus();
    await click(screen.getByRole('button', { name: 'Аист' })); expect(view.audio.word).toHaveBeenLastCalledWith('А', 'Аист');
    fireEvent.keyDown(dialog, { key: 'Escape' }); expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); expect(letter).toHaveFocus();
    expect(view.audio.stop).toHaveBeenCalled(); view.cleanup();
  });
});
