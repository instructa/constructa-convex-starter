export function useThrottle<T extends (...args: any[]) => void>(fn: T, ms: number): T {
  let last = 0;
  let queued: any[] | null = null;
  let raf = 0;

  return ((...args: any[]) => {
    const now = performance.now();
    if (now - last >= ms) {
      last = now;
      fn(...args);
      return;
    }

    queued = args;
    if (!raf) {
      raf = requestAnimationFrame(() => {
        raf = 0;
        if (queued) {
          last = performance.now();
          fn(...queued);
          queued = null;
        }
      });
    }
  }) as T;
}
