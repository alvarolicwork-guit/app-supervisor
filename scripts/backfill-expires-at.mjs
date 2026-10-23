import { Timestamp } from 'firebase-admin/firestore';
import { APPLY, commitInBatches, db, logResult } from './lib/admin.mjs';

const RETENCION_DIAS = 9;
const updates = [];
const details = [];

function toDate(value) {
    if (!value) return null;
    if (typeof value.toDate === 'function') return value.toDate();
    if (value instanceof Date) return value;
    return null;
}

const snapshot = await db
    .collection('servicios_supervisor')
    .where('estado', '==', 'cerrado')
    .get();

for (const doc of snapshot.docs) {
    const data = doc.data();
    const cierre = toDate(data.cierre?.fechaHora);
    if (!cierre) continue;

    const esperado = new Date(cierre.getTime() + RETENCION_DIAS * 24 * 60 * 60 * 1000);
    const actual = toDate(data.expiresAt);
    if (actual && Math.abs(actual.getTime() - esperado.getTime()) < 1000) continue;

    updates.push({ ref: doc.ref, data: { expiresAt: Timestamp.fromDate(esperado) } });
    details.push(`${doc.id}: ${actual?.toISOString() ?? 'sin expiresAt'} -> ${esperado.toISOString()}`);
}

await commitInBatches(updates);
logResult('servicios cerrados con expiresAt corregido', updates.length, details);
if (!APPLY && updates.length > 0) {
    console.log('Ejecuta con --apply para escribir los cambios.');
}
