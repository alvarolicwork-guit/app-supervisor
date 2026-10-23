import { AuthError } from './serverAuth';

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 20;
const MAX_BUCKETS = 1_000;

interface Bucket {
    windowStart: number;
    count: number;
}

// Límite por proceso. En un despliegue de una sola instancia (VPS/local) es
// suficiente; si se escala horizontalmente, sustituir por un contador en
// Firestore o por App Check. No se usa memoria como garantía de seguridad.
const buckets = new Map<string, Bucket>();

export async function enforceRateLimit(uid: string, action: string): Promise<void> {
    const key = `${uid}:${action}`;
    const now = Date.now();
    const current = buckets.get(key);

    if (current && now - current.windowStart < WINDOW_MS) {
        if (current.count >= MAX_REQUESTS_PER_WINDOW) {
            throw new AuthError(
                'Demasiadas solicitudes en poco tiempo. Espera un minuto e intenta de nuevo.',
                429
            );
        }
        current.count += 1;
    } else {
        buckets.set(key, { windowStart: now, count: 1 });
    }

    if (buckets.size > MAX_BUCKETS) {
        for (const [bucketKey, bucket] of buckets) {
            if (now - bucket.windowStart >= WINDOW_MS) {
                buckets.delete(bucketKey);
            }
        }
    }
}
