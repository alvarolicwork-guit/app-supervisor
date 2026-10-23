import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { APPLY, db } from './lib/admin.mjs';

const HORA_MS = 60 * 60 * 1000;
const ALERTA_HORAS = 25;
const CIERRE_HORAS = 26;
const RETENCION_DIAS = 9;

function toDate(value) {
    if (!value) return null;
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
    if (typeof value.toDate === 'function') {
        const date = value.toDate();
        return Number.isNaN(date.getTime()) ? null : date;
    }
    if (typeof value === 'string' || typeof value === 'number') {
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? null : date;
    }
    return null;
}

function totales(controlInstalaciones) {
    return (Array.isArray(controlInstalaciones) ? controlInstalaciones : []).reduce(
        (acc, registro) => {
            acc.rutinarios += Number(registro?.servicio?.rutina || 0);
            acc.relevantes += Array.isArray(registro?.servicio?.relevantes)
                ? registro.servicio.relevantes.length
                : 0;
            return acc;
        },
        { rutinarios: 0, relevantes: 0 }
    );
}

async function main() {
    const ahora = new Date();
    const snapshot = await db
        .collection('servicios_supervisor')
        .where('estado', '==', 'abierto')
        .get();

    const candidatos = [];

    for (const doc of snapshot.docs) {
        const data = doc.data();
        const inicio =
            toDate(data.apertura?.fechaHora) ||
            toDate(data.createdAt) ||
            null;
        if (!inicio) continue;

        const cierreProgramado =
            toDate(data.cierreProgramadoEn) ||
            new Date(inicio.getTime() + CIERRE_HORAS * HORA_MS);

        if (ahora >= cierreProgramado) {
            candidatos.push({ doc, data, inicio, cierreProgramado });
        }
    }

    console.log(
        `${APPLY ? 'APLICADO' : 'DRY-RUN'} servicios vencidos a cerrar: ${candidatos.length}`
    );

    for (const { doc, data, inicio, cierreProgramado } of candidatos) {
        const alertaCierre =
            toDate(data.alertaCierreEn) ||
            new Date(inicio.getTime() + ALERTA_HORAS * HORA_MS);
        const { rutinarios, relevantes } = totales(data.controlInstalaciones);
        const uid = data.uidSupervisor;

        console.log(
            `  - ${doc.id} | inicio ${inicio.toISOString()} | cierre ${cierreProgramado.toISOString()}`
        );

        if (!APPLY) continue;

        await db.runTransaction(async (transaction) => {
            const fresh = await transaction.get(doc.ref);
            if (!fresh.exists) return;
            if (fresh.data().estado !== 'abierto') return;

            const lockRef = uid
                ? db.doc(`servicios_activos/${uid}_supervisor`)
                : null;
            const lockSnapshot = lockRef ? await transaction.get(lockRef) : null;

            const fechaCierre = new Date();
            const expiresAt = new Date(
                fechaCierre.getTime() + RETENCION_DIAS * 24 * HORA_MS
            );

            transaction.update(doc.ref, {
                estado: 'cerrado',
                cierre: {
                    fechaHora: Timestamp.fromDate(fechaCierre),
                    entregaServicio: 'CIERRE AUTOMÁTICO POR VENCIMIENTO DE 26 HORAS',
                    casosRutinarios: rutinarios,
                    casosRelevantes: relevantes,
                    informeFinal:
                        'Servicio cerrado automáticamente al cumplir 26 horas desde su apertura. ' +
                        'No se recibió el cierre manual dentro del plazo de gracia.',
                    ajusteTotales: false,
                    justificacionAjuste: '',
                    tipoCierre: 'AUTOMATICO',
                    motivoCierre:
                        'Vencimiento del plazo de 24 horas más una hora de gracia y una hora adicional de alerta.',
                },
                alertaCierreEn: Timestamp.fromDate(alertaCierre),
                cierreProgramadoEn: Timestamp.fromDate(cierreProgramado),
                expiresAt: Timestamp.fromDate(expiresAt),
                updatedAt: FieldValue.serverTimestamp(),
                updatedBy: 'sistema',
            });

            if (
                lockRef &&
                lockSnapshot?.exists &&
                lockSnapshot.data().servicioId === doc.id
            ) {
                transaction.delete(lockRef);
            }
        });
    }

    if (!APPLY && candidatos.length > 0) {
        console.log('Ejecuta con --apply para cerrar los servicios.');
    }
}

main().catch((error) => {
    console.error('Error al cerrar servicios vencidos:', error);
    process.exitCode = 1;
});
