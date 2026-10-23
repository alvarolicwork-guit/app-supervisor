import { Timestamp } from 'firebase-admin/firestore';
import { APPLY, commitInBatches, db, logResult } from './lib/admin.mjs';

const updates = [];
const details = [];

async function collect(collection, uidField) {
    const snapshot = await db.collection(collection).get();
    for (const doc of snapshot.docs) {
        const data = doc.data();
        if (data.updatedAt && data.updatedBy) continue;

        const createdAt = data.createdAt?.toDate?.() ?? new Date();
        updates.push({
            ref: doc.ref,
            data: {
                updatedAt: data.updatedAt ?? Timestamp.fromDate(createdAt),
                updatedBy: data.updatedBy ?? data[uidField] ?? 'migration',
            },
        });
        details.push(`${collection}/${doc.id}`);
    }
}

await collect('servicios_supervisor', 'uidSupervisor');
await collect('servicios_jefe_operativo', 'uidJefe');

await commitInBatches(updates);
logResult('documentos con updatedAt/updatedBy completados', updates.length, details);
if (!APPLY && updates.length > 0) {
    console.log('Ejecuta con --apply para escribir los cambios.');
}
