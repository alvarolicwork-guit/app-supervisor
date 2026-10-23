import { resolve } from 'node:path';
import dotenv from 'dotenv';
import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const projectId =
    process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

if (!projectId) {
    console.error('Falta FIREBASE_PROJECT_ID o NEXT_PUBLIC_FIREBASE_PROJECT_ID.');
    process.exit(1);
}

const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();
if (!serviceAccountRaw && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error(
        'Define FIREBASE_SERVICE_ACCOUNT (JSON o base64) o GOOGLE_APPLICATION_CREDENTIALS.'
    );
    process.exit(1);
}

function buildCredential() {
    if (!serviceAccountRaw) return applicationDefault();

    const json = serviceAccountRaw.startsWith('{')
        ? serviceAccountRaw
        : Buffer.from(serviceAccountRaw, 'base64').toString('utf8');

    return cert(JSON.parse(json));
}

const app = getApps()[0] ?? initializeApp({ credential: buildCredential(), projectId });

export const db = getFirestore(app);
export const auth = getAuth(app);
export const APPLY = process.argv.includes('--apply');

export function logResult(label, count, details = []) {
    console.log(`${APPLY ? 'APLICADO' : 'DRY-RUN'} ${label}: ${count}`);
    for (const detail of details) console.log(`  - ${detail}`);
}

export async function commitInBatches(updates) {
    if (!APPLY || updates.length === 0) return;

    for (let index = 0; index < updates.length; index += 400) {
        const batch = db.batch();
        for (const update of updates.slice(index, index + 400)) {
            batch.update(update.ref, update.data);
        }
        await batch.commit();
    }
}
