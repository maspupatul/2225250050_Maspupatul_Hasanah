import { describe, expect, it, vi } from 'vitest';
import { createPrefetcher } from './problemPrefetch';

describe('createPrefetcher', () => {
  it('hands over the problem loaded ahead without a second request', async () => {
    const fetchProblem = vi.fn(async (i: number, guided: boolean) => `soal-${i}-${guided}`);
    const p = createPrefetcher(fetchProblem);
    p.prefetch(1, true);
    p.prefetch(1, true); // asking twice still loads once
    expect(await p.take(1, true)).toBe('soal-1-true');
    expect(fetchProblem).toHaveBeenCalledTimes(1);
  });

  it('fetches anew for another index or after the guided setting changed', async () => {
    const fetchProblem = vi.fn(async (i: number, guided: boolean) => `soal-${i}-${guided}`);
    const p = createPrefetcher(fetchProblem);
    p.prefetch(1, true);
    expect(await p.take(1, false)).toBe('soal-1-false');
    p.prefetch(2, true);
    expect(await p.take(0, true)).toBe('soal-0-true');
    expect(fetchProblem).toHaveBeenCalledTimes(4);
  });

  it('a prefetched problem is used once only', async () => {
    const fetchProblem = vi.fn(async (i: number) => `soal-${i}`);
    const p = createPrefetcher(fetchProblem);
    p.prefetch(1, true);
    await p.take(1, true);
    await p.take(1, true); // e.g. "Coba lagi" after an error: a fresh request
    expect(fetchProblem).toHaveBeenCalledTimes(2);
  });

  it('retries when the prefetch failed (e.g. the network dropped)', async () => {
    const fetchProblem = vi
      .fn<(i: number, guided: boolean) => Promise<string>>()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce('soal-1');
    const p = createPrefetcher(fetchProblem);
    p.prefetch(1, true);
    expect(await p.take(1, true)).toBe('soal-1');
  });
});
