import { auth, db } from '@/lib/firebase';
import { collection, doc, getDocs, query, where, orderBy, serverTimestamp, Timestamp, deleteDoc, runTransaction, getDoc } from 'firebase/firestore';
import { withFirestoreRetry } from '@/lib/firestoreRetry';
import { normalizarServicioSupervisor } from './normalizers';

const RETENCION_DIAS = 9;

// Tipos
export interface SupervisorInfo {
    grado: string;
    nombreCompleto: string;
}

export interface ServicioSupervisor {
    id?: string;
    uidSupervisor: string; // ID del usuario autenticado
    estado: 'abierto' | 'cerrado';

    apertura: {
        nroMemorandum: string;
        fechaHora: Date;
        supervisorRelevo: SupervisorInfo;
        supervisorActual: SupervisorInfo;
    };

    controlInstalaciones: any[];
    serviciosExtraordinarios: any[];

    cierre?: {
        fechaHora: Date;
        entregaServicio: string; // Grado y nombre completo
        casosRutinarios: number;
        casosRelevantes: number;
        informeFinal?: string;
        ajusteTotales?: boolean;
        justificacionAjuste?: string;
        tipoCierre?: 'MANUAL' | 'AUTOMATICO';
        motivoCierre?: string;
    };

    createdAt: Date;
    expiresAt: Date;
    alertaCierreEn?: Date;
    cierreProgramadoEn?: Date;
}

/**
 * Abrir un nuevo servicio de supervisor
 */
export async function abrirServicioSupervisor(
    uid: string,
    supervisorActual: SupervisorInfo,
    data: {
        nroMemorandum: string;
        fechaHora: Date;
        supervisorRelevo: SupervisorInfo;
    }
): Promise<string> {

    const expiresAt = new Date(data.fechaHora);
    expiresAt.setDate(expiresAt.getDate() + 7); // Retención posterior al cierre
    const alertaCierreEn = new Date(data.fechaHora.getTime() + 25 * 60 * 60 * 1000);
    const cierreProgramadoEn = new Date(data.fechaHora.getTime() + 26 * 60 * 60 * 1000);

    const servicio: Omit<ServicioSupervisor, 'id'> = {
        uidSupervisor: uid,
        estado: 'abierto',
        apertura: {
            ...data,
            supervisorActual,
        },
        controlInstalaciones: [],
        serviciosExtraordinarios: [],
        createdAt: data.fechaHora,
        expiresAt,
        alertaCierreEn,
        cierreProgramadoEn,
    };

    const lockRef = doc(db, 'servicios_activos', `${uid}_supervisor`);
    const jefeLockRef = doc(db, 'servicios_activos', `${uid}_jefe`);
    const legacyLockRef = doc(db, 'servicios_activos', uid);
    const servicioRef = doc(collection(db, 'servicios_supervisor'));

    await runTransaction(db, async (transaction) => {
        const supervisorLock = await transaction.get(lockRef);
        const jefeLock = await transaction.get(jefeLockRef);
        const legacyLock = await transaction.get(legacyLockRef);

        if (jefeLock.exists()) {
            throw new Error(
                'Ya tienes un servicio de Jefe Operativo activo. Ciérralo antes de abrir un turno de supervisor.'
            );
        }
        if (supervisorLock.exists()) {
            throw new Error(
                'Ya tienes un turno de supervisor activo. Ciérralo antes de abrir otro.'
            );
        }
        if (legacyLock.exists()) {
            throw new Error(
                'Ya tienes un servicio activo. Ciérralo antes de abrir otro.'
            );
        }

        transaction.set(servicioRef, {
            ...servicio,
            apertura: {
                ...servicio.apertura,
                fechaHora: Timestamp.fromDate(servicio.apertura.fechaHora),
            },
            createdAt: serverTimestamp(),
            expiresAt: Timestamp.fromDate(expiresAt),
            alertaCierreEn: Timestamp.fromDate(alertaCierreEn),
            cierreProgramadoEn: Timestamp.fromDate(cierreProgramadoEn),
            updatedAt: serverTimestamp(),
            updatedBy: uid,
        });

        transaction.set(lockRef, {
            uid,
            tipo: 'supervisor',
            servicioId: servicioRef.id,
            createdAt: serverTimestamp(),
        });
    });

    return servicioRef.id;
}

/**
 * Obtener servicio activo del supervisor actual
 */
export async function getServicioActivo(uid: string): Promise<ServicioSupervisor | null> {
    if (!uid) return null;

    const q = query(
        collection(db, 'servicios_supervisor'),
        where('estado', '==', 'abierto'),
        where('uidSupervisor', '==', uid),
        orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) return null;

    const doc = snapshot.docs[0];
    return normalizarServicioSupervisor(doc.id, doc.data());
}

/**
 * Obtener todos los servicios del supervisor (últimos 7 días)
 */
export async function getServiciosSupervisor(uid: string): Promise<ServicioSupervisor[]> {
    if (!uid) return [];

    const q = query(
        collection(db, 'servicios_supervisor'),
        where('uidSupervisor', '==', uid), // Filtrar por UID seguro
        orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map((docSnap) =>
        normalizarServicioSupervisor(docSnap.id, docSnap.data())
    );
}

/**
 * Obtener TODOS los servicios (Vista Admin)
 */
export async function getAllServiciosAdmin(): Promise<ServicioSupervisor[]> {
    const q = query(
        collection(db, 'servicios_supervisor'),
        orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map((docSnap) =>
        normalizarServicioSupervisor(docSnap.id, docSnap.data())
    );
}

/**
 * Cerrar servicio de supervisor
 */
export async function cerrarServicioSupervisor(servicioId: string, datosCierre: {
    entregaServicio: string;
    casosRutinarios: number;
    casosRelevantes: number;
    informeFinal?: string;
    ajusteTotales?: boolean;
    justificacionAjuste?: string;
}): Promise<void> {
    const docRef = doc(db, 'servicios_supervisor', servicioId);
    const uid = auth.currentUser?.uid ?? '';
    const fechaCierre = new Date();
    const expiresAt = new Date(fechaCierre.getTime() + RETENCION_DIAS * 24 * 60 * 60 * 1000);

    await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(docRef);
        if (!snapshot.exists()) {
            throw new Error('Servicio no encontrado.');
        }

        const servicio = snapshot.data() as { estado?: string; uidSupervisor?: string };
        if (servicio.estado === 'cerrado') {
            throw new Error('El servicio ya está cerrado.');
        }

        const lockRef = servicio.uidSupervisor
            ? doc(db, 'servicios_activos', `${servicio.uidSupervisor}_supervisor`)
            : null;
        const lockSnapshot = lockRef ? await transaction.get(lockRef) : null;

        transaction.update(docRef, {
            estado: 'cerrado',
            cierre: {
                fechaHora: Timestamp.fromDate(fechaCierre),
                entregaServicio: datosCierre.entregaServicio,
                casosRutinarios: datosCierre.casosRutinarios,
                casosRelevantes: datosCierre.casosRelevantes,
                informeFinal: datosCierre.informeFinal || '',
                ajusteTotales: Boolean(datosCierre.ajusteTotales),
                justificacionAjuste: datosCierre.justificacionAjuste || '',
                tipoCierre: 'MANUAL',
            },
            expiresAt: Timestamp.fromDate(expiresAt),
            updatedAt: serverTimestamp(),
            updatedBy: uid,
        });

        if (lockRef && lockSnapshot?.exists() && lockSnapshot.data().servicioId === servicioId) {
            transaction.delete(lockRef);
        }
    });
}

/**
 * Agregar registro de instalación al servicio activo
 * NOTA: Esta función antes usaba getServicioActivo sin argumentos. 
 * Ahora requeriría pasarle el servicioId directamente desde la UI que ya lo tiene.
 */
export async function agregarControlInstalacion(servicioId: string, registro: any): Promise<void> {
    const docRef = doc(db, 'servicios_supervisor', servicioId);

    await withFirestoreRetry(async () => {
        await runTransaction(db, async (tx) => {
            const snap = await tx.get(docRef);
            if (!snap.exists()) throw new Error('Servicio no encontrado');

            if (snap.data().estado !== 'abierto') {
                throw new Error('El servicio está cerrado y no admite nuevos registros.');
            }

            const currentList = snap.data().controlInstalaciones || [];
            const nuevosRegistros = [...currentList, registro];

            tx.update(docRef, {
                controlInstalaciones: nuevosRegistros,
                updatedAt: serverTimestamp(),
                updatedBy: auth.currentUser?.uid ?? '',
            });
        });
    });
}

/**
 * Limpiar servicios expirados
 */
export async function limpiarServiciosExpirados(): Promise<void> {
    const ahora = new Date();
    const q = query(
        collection(db, 'servicios_supervisor'),
        where('expiresAt', '<', Timestamp.fromDate(ahora))
    );
    const snapshot = await getDocs(q);
    const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
    console.log(`✅ ${deletePromises.length} servicios expirados eliminados`);
}

/**
 * Fallback manual (Spark): elimina servicios cerrados expirados y devuelve total.
 */
export async function cleanupExpiredSupervisorServicios(): Promise<number> {
    const ahora = Timestamp.now();
    const q = query(
        collection(db, 'servicios_supervisor'),
        where('estado', '==', 'cerrado'),
        where('expiresAt', '<', ahora)
    );

    const snapshot = await getDocs(q);
    const deletePromises = snapshot.docs.map((docSnap) => deleteDoc(docSnap.ref));
    await Promise.all(deletePromises);

    return deletePromises.length;
}

/**
 * Obtener un servicio específico por ID
 */
export async function getServicioById(id: string): Promise<ServicioSupervisor | null> {
    const docRef = doc(db, 'servicios_supervisor', id);
    const snap = await getDoc(docRef);

    if (!snap.exists()) return null;

    return normalizarServicioSupervisor(snap.id, snap.data());
}

/**
 * Obtener supervisor actual (localStorage)
 */
export function getSupervisorActual(): SupervisorInfo | null {
    if (typeof window === 'undefined') return null;
    const data = localStorage.getItem('supervisor_actual');
    return data ? JSON.parse(data) : null;
}

/**
 * Guardar supervisor actual (localStorage)
 */
export function setSupervisorActual(supervisor: SupervisorInfo): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('supervisor_actual', JSON.stringify(supervisor));
}
