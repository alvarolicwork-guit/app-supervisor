import { Timestamp } from 'firebase-admin/firestore';
import { APPLY, db } from './lib/admin.mjs';

const abiertos = new Map();

async function collect(collection, tipo, uidField) {
    const snapshot = await db.collection(collection).where('estado', '==', 'abierto').get();
    for (const doc of snapshot.docs) {
        const uid = doc.data()[uidField];
        if (!uid) continue;
        const key = `${uid}|${tipo}`;
        if (!abiertos.has(key)) abiertos.set(key, []);
        abiertos.get(key).push({ uid, tipo, id: doc.id });
    }
}

await collect('servicios_supervisor', 'supervisor', 'uidSupervisor');
await collect('servicios_jefe_operativo', 'jefe', 'uidJefe');

let created = 0;
const conflicts = [];
const details = [];

for (const [key, servicios] of abiertos) {
    if (servicios.length !== 1) {
        conflicts.push(`${key}: ${servicios.length} servicios abiertos del mismo tipo (${servicios.map((s) => s.id).join(', ')})`);
        continue;
    }

    const servicio = servicios[0];
    const uid = servicio.uid;
    const lockId = `${uid}_${servicio.tipo}`;
    const lockRef = db.doc(`servicios_activos/${lockId}`);
    const legacyRef = db.doc(`servicios_activos/${uid}`);
    const lockSnapshot = await lockRef.get();
    const legacySnapshot = await legacyRef.get();

    if (lockSnapshot.exists) {
        if (lockSnapshot.data().servicioId !== servicio.id) {
            conflicts.push(`${lockId}: el bloqueo apunta a ${lockSnapshot.data().servicioId}, servicio abierto ${servicio.id}`);
            continue;
        }
        if (legacySnapshot.exists) {
            details.push(`${lockId}: eliminar bloqueo legacy`);
            if (APPLY) await legacyRef.delete();
        }
        continue;
    }

    details.push(`${lockId} -> ${servicio.tipo} ${servicio.id}`);
    if (APPLY) {
        await lockRef.set({
            uid,
            tipo: servicio.tipo,
            servicioId: servicio.id,
            createdAt: legacySnapshot.exists
                ? legacySnapshot.data().createdAt ?? Timestamp.now()
                : Timestamp.now(),
        });
        if (legacySnapshot.exists) await legacyRef.delete();
        created += 1;
    }
}

console.log(`${APPLY ? 'APLICADO' : 'DRY-RUN'} bloqueos a crear: ${APPLY ? created : details.length}`);
for (const detail of details) console.log(`  - ${detail}`);
if (conflicts.length > 0) {
    console.log('Conflictos que requieren revisión manual:');
    for (const conflict of conflicts) console.log(`  - ${conflict}`);
}
if (!APPLY && details.length > 0) {
    console.log('Ejecuta con --apply para crear los bloqueos.');
}
