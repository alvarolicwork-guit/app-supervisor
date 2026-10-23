import { APPLY, commitInBatches, db, logResult } from './lib/admin.mjs';

const updates = [];
const details = [];

const jefeSnapshot = await db.collection('servicios_jefe_operativo').get();
for (const doc of jefeSnapshot.docs) {
    const value = doc.data().apertura?.novedadesFormacion?.personalFormo;
    if (typeof value === 'number' && Number.isNaN(value)) {
        updates.push({
            ref: doc.ref,
            data: { 'apertura.novedadesFormacion.personalFormo': 0 },
        });
        details.push(`jefe ${doc.id}`);
    }
}

const supervisorSnapshot = await db.collection('servicios_supervisor').get();
for (const doc of supervisorSnapshot.docs) {
    const extras = doc.data().serviciosExtraordinarios;
    if (!Array.isArray(extras)) continue;

    let changed = false;
    const normalizados = extras.map((extra) => {
        const value = extra?.apertura?.novedadesFormacion?.personalFormo;
        if (typeof value === 'number' && Number.isNaN(value)) {
            changed = true;
            return {
                ...extra,
                apertura: {
                    ...extra.apertura,
                    novedadesFormacion: {
                        ...extra.apertura?.novedadesFormacion,
                        personalFormo: 0,
                    },
                },
            };
        }
        return extra;
    });

    if (changed) {
        updates.push({ ref: doc.ref, data: { serviciosExtraordinarios: normalizados } });
        details.push(`supervisor ${doc.id}`);
    }
}

await commitInBatches(updates);
logResult('documentos con personalFormo inválido', updates.length, details);
if (!APPLY && updates.length > 0) {
    console.log('Ejecuta con --apply para escribir los cambios.');
}
