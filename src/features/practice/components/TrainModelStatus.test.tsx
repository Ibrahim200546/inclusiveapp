import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTrainModel } from '../train/model';
import type { ModelWorker } from '../train/modelTransport';
import { TrainModelStatus } from './TrainModelStatus';

afterEach(() => vi.useRealTimers());
describe('model preparation indicator', () => {
  it('translates loading and failure, retries, dismisses readiness and cleans its timer', async () => {
    vi.useFakeTimers(); let request = 0;
    const worker: ModelWorker = { onmessage: null, onerror: null, terminate: vi.fn(), postMessage: value => { request = value.id!; } };
    const model = createTrainModel({ create: () => worker, fallback: vi.fn() });
    const view = render(<TrainModelStatus model={model} locale="ru" />);
    await act(async () => { await Promise.resolve(); });
    expect(screen.getByRole('status')).toHaveTextContent('Подготовка голоса');
    await act(async () => { worker.onmessage!({ data: { type: 'download', progress: 30 } }); });
    expect(screen.getByRole('progressbar')).toHaveAttribute('value', '30');
    view.rerender(<TrainModelStatus model={model} locale="kk" />); expect(screen.getByRole('status')).toHaveTextContent('Дыбыс дайындалуда');
    await act(async () => { worker.onmessage!({ data: { id: request, error: 'Invalid model' } }); });
    expect(screen.getByRole('button', { name: 'Қайта жүктеу' })).toBeVisible();
    await act(async () => { fireEvent.click(screen.getByRole('button')); });
    await act(async () => { worker.onmessage!({ data: { id: request, ready: true } }); });
    expect(screen.getByRole('status')).toHaveTextContent('✓ Дыбыс дайын');
    await act(async () => { await vi.advanceTimersByTimeAsync(3500); });
    expect(document.getElementById('trainModelStatus')).not.toBeVisible();
    view.rerender(<TrainModelStatus model={model} locale="ru" />); expect(screen.getByRole('status')).toHaveTextContent('✓ Голос готов');
    view.unmount(); model.dispose(); expect(vi.getTimerCount()).toBe(0); expect(document.getElementById('trainModelStatus')).toBeNull();
  });
});
