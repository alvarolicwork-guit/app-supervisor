import { db } from '@/lib/firebase';
import { doc, updateDoc, arrayUnion, Timestamp } from 'firebase/firestore';
import { ServicioExtraordinario, AperturaServicioExtra, CierreServicioExtra } from '@/types/servicioExtraordinario';
import { getServicioById } from './servicioSupervisorService';

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
    // Obtener servicio actual
    const servicio = await getServicioById(servicioSupervisorId);
    if (!servicio || servicio.id !== servicioSupervisorId) {
        throw new Error('Servicio supervisor no encontrado');
    }

    // Actualizar el servicio extraordinario específico
    const serviciosActualizados = servicio.serviciosExtraordinarios.map((s: ServicioExtraordinario) => {
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

    const docRef = doc(db, 'servicios_supervisor', servicioSupervisorId);

    await updateDoc(docRef, {
        serviciosExtraordinarios: serviciosActualizados
    });
}
