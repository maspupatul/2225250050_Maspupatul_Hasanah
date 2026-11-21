/**
 * Loads the next problem while the student works on the current one, so "Soal berikutnya"
 * shows it right away instead of an empty card. Only one problem ahead. A prefetched problem
 * is used only for the same index and the same guided setting; otherwise it is fetched anew.
 */
export type ProblemFetch<T> = (index: number, guided: boolean) => Promise<T>;

export function createPrefetcher<T>(fetchProblem: ProblemFetch<T>) {
  let ahead: { index: number; guided: boolean; promise: Promise<T> } | null = null;

  return {
    prefetch(index: number, guided: boolean): void {
      if (ahead && ahead.index === index && ahead.guided === guided) return;
      const promise = fetchProblem(index, guided);
      promise.catch(() => undefined); // a failed prefetch is retried by take()
      ahead = { index, guided, promise };
    },

    take(index: number, guided: boolean): Promise<T> {
      const hit = ahead && ahead.index === index && ahead.guided === guided ? ahead.promise : null;
      ahead = null;
      return hit ? hit.catch(() => fetchProblem(index, guided)) : fetchProblem(index, guided);
    },
  };
}
