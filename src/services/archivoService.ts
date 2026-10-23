import { auth, db } from '@/lib/firebase';
import { collection, doc, runTransaction, serverTimestamp } from 'firebase/firestore';

export type TipoServicioArchivable = 'supervisor' | 'jefe';

const COLECCIONES = {
    supervisor: {
        origen: 'servicios_supervisor',
        archivo: 'servicios_supervisor_archivados',
    },
    jefe: {
        origen: 'servicios_jefe_operativo',
        archivo: 'servicios_jefe_operativo_archivados',
    },
} as const;

/**
 * Archiva un servicio cerrado: copia el documento a la colección de archivo,
 * registra la acción en auditoría y elimina el original en la misma transacción.
 */
export async function archivarServicio(
    tipo: TipoServicioArchivable,
    servicioId: string,
    motivo: string
): Promise<void> {
    const user = auth.currentUser;
    if (!user) {
        throw new Error('Sesión no válida. Vuelve a iniciar sesión.');
    }

    const motivoLimpio = motivo.trim();
    if (motivoLimpio.length < 3) {
        throw new Error('Indica un motivo de archivado de al menos 3 caracteres.');
    }

    const { origen, archivo } = COLECCIONES[tipo];
    const sourceRef = doc(db, origen, servicioId);
    const archiveRef = doc(db, archivo, servicioId);
    const auditRef = doc(collection(db, 'auditoria'));

    await runTransaction(db, async (transaction) => {
        const sourceSnapshot = await transaction.get(sourceRef);
        if (!sourceSnapshot.exists()) {
            throw new Error('El servicio ya no existe.');
        }

        const data = sourceSnapshot.data();
        if (data.estado !== 'cerrado') {
            throw new Error('Solo se pueden archivar servicios cerrados.');
        }

        const archiveSnapshot = await transaction.get(archiveRef);
        if (archiveSnapshot.exists()) {
            throw new Error('Ya existe un registro archivado con ese identificador.');
        }

        transaction.set(archiveRef, {
            ...data,
            archivedAt: serverTimestamp(),
            archivedBy: user.uid,
            motivo: motivoLimpio,
            originalCollection: origen,
        });

        transaction.set(auditRef, {
            accion: 'archivar',
            tipo,
            servicioId,
            actorUid: user.uid,
            motivo: motivoLimpio,
            creadoEn: serverTimestamp(),
        });

        transaction.delete(sourceRef);
    });
}
