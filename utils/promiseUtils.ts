/**
 * Wraps a promise with a timeout.
 * @param promise The promise to wrap.
 * @param ms The timeout in milliseconds.
 * @param timeoutError The error to throw on timeout.
 * @returns A promise that resolves with the original promise or rejects on timeout.
 */
export const promiseWithTimeout = <T,>(
  promise: Promise<T>,
  ms: number,
  timeoutError = new Error('Promise timed out')
): Promise<T> => {
  // Create a promise that rejects in <ms> milliseconds
  const timeout = new Promise<never>((_, reject) => {
    const id = setTimeout(() => {
      clearTimeout(id);
      reject(timeoutError);
    }, ms);
  });

  // Returns a race between our timeout and the passed in promise
  return Promise.race<T>([promise, timeout]);
};
