import { Timestamp } from 'firebase-admin/firestore';
import { db } from './lib/admin.mjs';

const uid = process.env.USER_UID;
const adminUid = process.env.ADMIN_UID || 'system';
const motivo = process.env.MOTIVO || 'Cierre administrativo de servicio activo';
const confirm = process.argv.includes('--confirm');

if (!uid) {
    console.error('Define USER_UID.');
    process.exit(1);
}

if (!confirm) {
    console.log('Dry-run: agrega --confirm para cerrar el servicio y liberar el bloqueo.');
    process.exit(0);
}

const now = Timestamp.now();
const expiresAt = Timestamp.fromMillis(now.toMillis() + 9 * 24 * 60 * 60 * 1000);
const batch = db.batch();
let cerrados = 0;

for (const [collection, uidField] of [
    ['servicios_supervisor', 'uidSupervisor'],
    ['servicios_jefe_operativo', 'uidJefe'],
]) {
    const snapshot = await db.collection(collection).where(uidField, '==', uid).get();
    for (const document of snapshot.docs) {
        if (document.data().estado !== 'abierto') continue;

        batch.update(document.ref, {
            estado: 'cerrado',
            cierre: {
                fechaHora: now,
                entregaServicio: 'Cierre administrativo',
                casosRutinarios: 0,
                casosRelevantes: 0,
                informeFinal: `Cierre administrativo: ${motivo}`,
                ajusteTotales: false,
                justificacionAjuste: motivo,
            },
            expiresAt,
            updatedAt: now,
            updatedBy: adminUid,
        });

        batch.set(db.collection('auditoria').doc(), {
            accion: 'cierre-administrativo',
            coleccion: collection,
            servicioId: document.id,
            uid,
            actorUid: adminUid,
            motivo,
            creadoEn: now,
        });

        cerrados += 1;
    }
}

batch.delete(db.doc(`servicios_activos/${uid}_supervisor`));
batch.delete(db.doc(`servicios_activos/${uid}_jefe`));
batch.delete(db.doc(`servicios_activos/${uid}`));
await batch.commit();

console.log(`Servicios cerrados: ${cerrados}. Bloqueos liberados para ${uid}.`);
