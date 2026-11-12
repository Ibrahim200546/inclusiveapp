import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MainGradeMenu } from './MainGradeMenu';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('React grade menu', () => {
  it('keeps collapsed grades out of keyboard navigation and opens with the keyboard', () => {
    const navigate = vi.fn();
    const { container } = render(<MainGradeMenu locale="kk" active onNavigate={navigate} />);
    const center = screen.getByRole('button', { name: 'Сыныпты таңдаңыз' });
    const items = Array.from(container.querySelectorAll<HTMLElement>('.radial-item'));
    expect(items).toHaveLength(4);
    items.forEach(item => expect(item).toHaveAttribute('tabindex', '-1'));
    fireEvent.click(items[0]);
    expect(navigate).not.toHaveBeenCalled();
    fireEvent.keyDown(center, { key: ' ' });
    expect(center).toHaveAttribute('aria-expanded', 'true');
    items.forEach(item => expect(item).toHaveAttribute('tabindex', '0'));
    fireEvent.keyDown(items[0], { key: 'Enter' });
    expect(navigate).toHaveBeenCalledWith('grade0Menu');
  });

  it('retains its open state through language and screen changes and routes every grade', () => {
    const navigate = vi.fn();
    const { rerender } = render(<MainGradeMenu locale="kk" active onNavigate={navigate} />);
    fireEvent.click(screen.getByRole('button', { name: 'Сыныпты таңдаңыз' }));
    rerender(<MainGradeMenu locale="ru" active onNavigate={navigate} />);
    const center = screen.getByRole('button', { name: 'Выберите класс' });
    expect(center).toHaveAttribute('aria-expanded', 'true');
    for (const name of ['🐣 0-1 Подготовка', '🚗 2 2 класс', '🎵 3 3 класс', '🎤 4 4 класс']) {
      fireEvent.click(screen.getByRole('button', { name }));
    }
    expect(navigate.mock.calls.flat()).toEqual(['grade0Menu', 'grade2Menu', 'grade3Menu', 'grade4Menu']);
    rerender(<MainGradeMenu locale="ru" active={false} onNavigate={navigate} />);
    expect(center).toHaveAttribute('tabindex', '-1');
    expect(screen.queryByRole('button', { name: '🚗 2 2 класс' })).toBeNull();
    rerender(<MainGradeMenu locale="ru" active onNavigate={navigate} />);
    expect(center).toHaveAttribute('aria-expanded', 'true');
  });

  it('queues a close requested during opening and restores temporary styles', async () => {
    const pending: { finish: () => void; cancel: ReturnType<typeof vi.fn> }[] = [];
    const originalAnimate = HTMLElement.prototype.animate;
    HTMLElement.prototype.animate = vi.fn(() => {
      let finish!: () => void;
      const finished = new Promise<void>(resolve => { finish = resolve; });
      const cancel = vi.fn(finish);
      pending.push({ finish, cancel });
      return { finished, cancel } as unknown as Animation;
    });
    try {
      const { container } = render(<MainGradeMenu locale="ru" active onNavigate={vi.fn()} />);
      const center = screen.getByRole('button', { name: 'Выберите класс' });
      fireEvent.click(center);
      fireEvent.click(center);
      expect(pending).toHaveLength(4);
      await act(async () => { pending.slice(0, 4).forEach(animation => animation.finish()); });
      expect(pending).toHaveLength(8);
      await act(async () => { pending.slice(4).forEach(animation => animation.finish()); });
      expect(center).toHaveAttribute('aria-expanded', 'false');
      expect(container.querySelector('#mainRadialMenu')).not.toHaveClass('active');
      for (const item of container.querySelectorAll<HTMLElement>('.radial-item')) {
        expect(item.style.getPropertyValue('pointer-events')).toBe('');
        expect(item.style.getPropertyValue('transform')).toBe('');
      }
    } finally {
      HTMLElement.prototype.animate = originalAnimate;
    }
  });

  it('cancels an in-flight animation when the screen leaves', () => {
    const originalAnimate = HTMLElement.prototype.animate;
    const cancels: ReturnType<typeof vi.fn>[] = [];
    HTMLElement.prototype.animate = vi.fn(() => {
      let finish!: () => void;
      const finished = new Promise<void>(resolve => { finish = resolve; });
      const cancel = vi.fn(finish); cancels.push(cancel);
      return { finished, cancel } as unknown as Animation;
    });
    try {
      const { rerender } = render(<MainGradeMenu locale="ru" active onNavigate={vi.fn()} />);
      fireEvent.click(screen.getByRole('button', { name: 'Выберите класс' }));
      rerender(<MainGradeMenu locale="ru" active={false} onNavigate={vi.fn()} />);
      expect(cancels).toHaveLength(4);
      cancels.forEach(cancel => expect(cancel).toHaveBeenCalledOnce());
      expect(screen.getByRole('button', { name: 'Выберите класс' })).toHaveAttribute('tabindex', '-1');
    } finally {
      HTMLElement.prototype.animate = originalAnimate;
    }
  });
});
