import { db } from '@/lib/firebase';
import { collection, addDoc, updateDoc, doc, getDocs, query, where, orderBy, serverTimestamp, Timestamp, deleteDoc } from 'firebase/firestore';

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
    };

    createdAt: Date;
    expiresAt: Date;
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
    expiresAt.setDate(expiresAt.getDate() + 7); // Expira en 7 días

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
    };

    const docRef = await addDoc(collection(db, 'servicios_supervisor'), {
        ...servicio,
        apertura: {
            ...servicio.apertura,
            fechaHora: Timestamp.fromDate(servicio.apertura.fechaHora),
        },
        createdAt: serverTimestamp(),
        expiresAt: Timestamp.fromDate(expiresAt),
    });

    return docRef.id;
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
    const data = doc.data();

    return {
        id: doc.id,
        ...data,
        apertura: {
            ...data.apertura,
            fechaHora: data.apertura.fechaHora.toDate(),
        },
        cierre: data.cierre ? {
            fechaHora: data.cierre.fechaHora.toDate(),
        } : undefined,
        createdAt: data.createdAt.toDate(),
        expiresAt: data.expiresAt.toDate(),
    } as ServicioSupervisor;
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

    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            apertura: {
                ...data.apertura,
                fechaHora: data.apertura.fechaHora.toDate(),
            },
            cierre: data.cierre ? {
                fechaHora: data.cierre.fechaHora.toDate(),
            } : undefined,
            createdAt: data.createdAt.toDate(),
            expiresAt: data.expiresAt.toDate(),
        } as ServicioSupervisor;
    });
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

    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            apertura: {
                ...data.apertura,
                fechaHora: data.apertura.fechaHora.toDate(),
            },
            cierre: data.cierre ? {
                fechaHora: data.cierre.fechaHora.toDate(),
            } : undefined,
            createdAt: data.createdAt.toDate(),
            expiresAt: data.expiresAt.toDate(),
        } as ServicioSupervisor;
    });
}

/**
 * Cerrar servicio de supervisor
 */
export async function cerrarServicioSupervisor(servicioId: string, datosCierre: {
    entregaServicio: string;
    casosRutinarios: number;
    casosRelevantes: number;
    informeFinal?: string;
}): Promise<void> {
    const docRef = doc(db, 'servicios_supervisor', servicioId);

    await updateDoc(docRef, {
        estado: 'cerrado',
        cierre: {
            fechaHora: serverTimestamp(),
            entregaServicio: datosCierre.entregaServicio,
            casosRutinarios: datosCierre.casosRutinarios,
            casosRelevantes: datosCierre.casosRelevantes,
            informeFinal: datosCierre.informeFinal || ''
        },
    });
}

/**
 * Eliminar servicio permanentemente (Admin)
 */
export async function deleteServicio(servicioId: string): Promise<void> {
    const docRef = doc(db, 'servicios_supervisor', servicioId);
    await deleteDoc(docRef);
}

/**
 * Agregar registro de instalación al servicio activo
 * NOTA: Esta función antes usaba getServicioActivo sin argumentos. 
 * Ahora requeriría pasarle el servicioId directamente desde la UI que ya lo tiene.
 */
export async function agregarControlInstalacion(servicioId: string, registro: any): Promise<void> {
    const docRef = doc(db, 'servicios_supervisor', servicioId);

    // Primero obtenemos el doc actual para hacer append al array
    // (En un entorno real de alta concurrencia usaríamos arrayUnion, pero aquí queremos orden específico tal vez? 
    // arrayUnion no garantiza orden si ya existe, pero para logs nuevos está bien. 
    // Sin embargo, Firestore no tiene arrayUnion simple para objetos complejos si queremos evitar duplicados exactos 
    // comportamiento, pero aquí son registros únicos por timestamp.

    // Mejor leemos, append y update.
    const snap = await import('firebase/firestore').then(m => m.getDoc(docRef));
    if (!snap.exists()) throw new Error("Servicio no encontrado");

    const currentList = snap.data().controlInstalaciones || [];
    const nuevosRegistros = [...currentList, registro];

    await updateDoc(docRef, {
        controlInstalaciones: nuevosRegistros,
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
 * Obtener un servicio específico por ID
 */
export async function getServicioById(id: string): Promise<ServicioSupervisor | null> {
    const docRef = doc(db, 'servicios_supervisor', id);
    const snap = await import('firebase/firestore').then(m => m.getDoc(docRef));

    if (!snap.exists()) return null;

    const data = snap.data();
    return {
        id: snap.id,
        ...data,
        apertura: {
            ...data.apertura,
            fechaHora: data.apertura.fechaHora.toDate(),
        },
        cierre: data.cierre ? {
            fechaHora: data.cierre.fechaHora.toDate(),
        } : undefined,
        createdAt: data.createdAt.toDate(),
        expiresAt: data.expiresAt.toDate(),
    } as ServicioSupervisor;
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
