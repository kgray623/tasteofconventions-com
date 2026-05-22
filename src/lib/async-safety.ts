export function withTimeout<T>(
  work: PromiseLike<T>,
  timeoutMs = 10_000,
  message = "This is taking too long. Please try again.",
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(message)), timeoutMs);
    Promise.resolve(work)
      .then(resolve, reject)
      .finally(() => window.clearTimeout(timer));
  });
}

export function getErrorMessage(error: unknown, fallback = "Something went wrong. Please try again.") {
  return error instanceof Error && error.message ? error.message : fallback;
}