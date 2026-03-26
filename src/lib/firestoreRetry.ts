import { FirebaseError } from 'firebase/app';

function isRetryableFirestoreConflict(error: unknown): boolean {
  if (!(error instanceof FirebaseError)) return false;

  const msg = error.message.toLowerCase();
  return (
    error.code === 'aborted' ||
    error.code === 'failed-precondition' ||
    msg.includes('required base version') ||
    msg.includes('transaction')
  );
}

export async function withFirestoreRetry<T>(operation: () => Promise<T>, retries = 3): Promise<T> {
  let attempt = 0;

  while (attempt <= retries) {
    try {
      return await operation();
    } catch (error) {
      if (!isRetryableFirestoreConflict(error) || attempt === retries) {
        throw error;
      }

      const backoff = 120 * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, backoff));
      attempt += 1;
    }
  }

  throw new Error('No se pudo completar la operacion por conflicto de version en Firestore.');
}
