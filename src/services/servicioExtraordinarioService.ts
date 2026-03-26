import { db } from '@/lib/firebase';
import { doc, updateDoc, arrayUnion, Timestamp, runTransaction } from 'firebase/firestore';
import { ServicioExtraordinario, AperturaServicioExtra, CierreServicioExtra } from '@/types/servicioExtraordinario';
import { withFirestoreRetry } from '@/lib/firestoreRetry';

/**
 * Agregar un nuevo servicio extraordinario al servicio supervisor activo
 */
export async function agregarServicioExtraordinario(
    servicioSupervisorId: string,
    apertura: AperturaServicioExtra
): Promise<string> {
    const nuevoServicio: ServicioExtraordinario = {
        id: `sextra_${Date.now()}`,
        estado: 'abierto',
        apertura: {
            ...apertura,
            fechaApertura: apertura.fechaApertura
        }
    };

    const docRef = doc(db, 'servicios_supervisor', servicioSupervisorId);

    await updateDoc(docRef, {
        serviciosExtraordinarios: arrayUnion({
            ...nuevoServicio,
            apertura: {
                ...nuevoServicio.apertura,
                fechaApertura: Timestamp.fromDate(nuevoServicio.apertura.fechaApertura)
            }
        })
    });

    return nuevoServicio.id;
}

/**
 * Cerrar un servicio extraordinario específico
 */
export async function cerrarServicioExtraordinario(
    servicioSupervisorId: string,
    servicioExtraId: string,
    cierre: CierreServicioExtra
): Promise<void> {
    const docRef = doc(db, 'servicios_supervisor', servicioSupervisorId);

    await withFirestoreRetry(async () => {
        await runTransaction(db, async (tx) => {
            const snap = await tx.get(docRef);
            if (!snap.exists()) {
                throw new Error('Servicio supervisor no encontrado');
            }

            const servicio = snap.data();
            const serviciosActualizados = (servicio.serviciosExtraordinarios || []).map((s: ServicioExtraordinario) => {
                if (s.id === servicioExtraId) {
                    return {
                        ...s,
                        estado: 'cerrado' as const,
                        cierre: {
                            ...cierre,
                            fechaCierre: Timestamp.fromDate(cierre.fechaCierre)
                        }
                    };
                }
                return s;
            });

            tx.update(docRef, {
                serviciosExtraordinarios: serviciosActualizados
            });
        });
    });
}
