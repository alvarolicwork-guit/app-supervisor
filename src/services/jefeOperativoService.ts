import { auth, db } from '@/lib/firebase';
import { collection, doc, getDocs, query, where, orderBy, serverTimestamp, Timestamp, getDoc, runTransaction, deleteDoc } from 'firebase/firestore';
import { ServicioJefeOperativo } from '@/types/jefeOperativo';
import { AperturaServicioExtra, CierreServicioExtra } from '@/types/servicioExtraordinario';
import { withFirestoreRetry } from '@/lib/firestoreRetry';

function toDateSafe(value: unknown, fallback?: Date): Date {
    if (value instanceof Date) return value;
    if (value && typeof value === 'object' && 'toDate' in (value as Record<string, unknown>)) {
        try {
            return (value as { toDate: () => Date }).toDate();
        } catch {
            return fallback ?? new Date();
        }
    }
    if (typeof value === 'string' || typeof value === 'number') {
        const parsed = new Date(value);
        if (!Number.isNaN(parsed.getTime())) return parsed;
    }
    return fallback ?? new Date();
}

function normalizarServicioJefe(docId: string, data: Record<string, any>): ServicioJefeOperativo {
    const aperturaRaw = data.apertura || {};
    const novedadesRaw = aperturaRaw.novedadesFormacion || {};

    return {
        id: docId,
        uidJefe: data.uidJefe || '',
        estado: data.estado === 'cerrado' ? 'cerrado' : 'abierto',
        apertura: {
            nroPlanOperaciones: aperturaRaw.nroPlanOperaciones || '',
            tipoServicio: aperturaRaw.tipoServicio || '',
            personalContemplado: Number(aperturaRaw.personalContemplado || 0),
            motosContempladas: Number(aperturaRaw.motosContempladas || 0),
            vehiculosContemplados: Number(aperturaRaw.vehiculosContemplados || 0),
            supervisorGeneral: aperturaRaw.supervisorGeneral || '',
            jefeOperativo: aperturaRaw.jefeOperativo || '',
            lugarFormacion: aperturaRaw.lugarFormacion || '',
            horaFormacion: aperturaRaw.horaFormacion || '',
            horaInstalacion: aperturaRaw.horaInstalacion || '',
            tareas: aperturaRaw.tareas || '',
            fechaApertura: toDateSafe(aperturaRaw.fechaApertura, toDateSafe(data.createdAt)),
            novedadesFormacion: {
                personalFormo: Number(novedadesRaw.personalFormo || 0),
                personalFalto: {
                    cantidad: Number(novedadesRaw.personalFalto?.cantidad || 0),
                    lista: Array.isArray(novedadesRaw.personalFalto?.lista) ? novedadesRaw.personalFalto.lista : [],
                },
                personalPermiso: {
                    cantidad: Number(novedadesRaw.personalPermiso?.cantidad || 0),
                    lista: Array.isArray(novedadesRaw.personalPermiso?.lista) ? novedadesRaw.personalPermiso.lista : [],
                },
                observacionesUniforme: Array.isArray(novedadesRaw.observacionesUniforme) ? novedadesRaw.observacionesUniforme : [],
            },
        },
        cierre: data.cierre ? {
            ...data.cierre,
            fechaCierre: toDateSafe(data.cierre.fechaCierre, toDateSafe(data.updatedAt)),
            personalFaltoServicio: Array.isArray(data.cierre.personalFaltoServicio) ? data.cierre.personalFaltoServicio : [],
            personalIncorporadoTarde: Array.isArray(data.cierre.personalIncorporadoTarde) ? data.cierre.personalIncorporadoTarde : [],
            tareasEjecutadas: data.cierre.tareasEjecutadas || '',
            reporteWhatsappFinal: data.cierre.reporteWhatsappFinal || '',
            informeInstitucionalFinal: data.cierre.informeInstitucionalFinal || '',
            generatedAt: data.cierre.generatedAt ? toDateSafe(data.cierre.generatedAt, toDateSafe(data.updatedAt)) : undefined,
            novedades: {
                tipo: data.cierre.novedades?.tipo === 'con' ? 'con' : 'sin',
                casos: Array.isArray(data.cierre.novedades?.casos) ? data.cierre.novedades.casos : [],
                observaciones: data.cierre.novedades?.observaciones || '',
            },
        } : undefined,
        createdAt: toDateSafe(data.createdAt),
        updatedAt: toDateSafe(data.updatedAt, toDateSafe(data.createdAt)),
    };
}

/**
 * Abrir un nuevo servicio de Jefe Operativo
 */
export async function abrirServicioJefeOperativo(
    uid: string,
    aperturaData: AperturaServicioExtra
): Promise<string> {

    const servicio: Omit<ServicioJefeOperativo, 'id'> = {
        uidJefe: uid,
        estado: 'abierto',
        apertura: aperturaData,
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    const lockRef = doc(db, 'servicios_activos', `${uid}_jefe`);
    const supervisorLockRef = doc(db, 'servicios_activos', `${uid}_supervisor`);
    const legacyLockRef = doc(db, 'servicios_activos', uid);
    const servicioRef = doc(collection(db, 'servicios_jefe_operativo'));

    await runTransaction(db, async (transaction) => {
        const jefeLock = await transaction.get(lockRef);
        const supervisorLock = await transaction.get(supervisorLockRef);
        const legacyLock = await transaction.get(legacyLockRef);

        if (supervisorLock.exists()) {
            throw new Error(
                'Ya tienes un turno de supervisor activo. Ciérralo antes de abrir un servicio de Jefe Operativo.'
            );
        }
        if (jefeLock.exists()) {
            throw new Error(
                'Ya tienes un servicio de Jefe Operativo activo. Ciérralo antes de abrir otro.'
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
                fechaApertura: Timestamp.fromDate(servicio.apertura.fechaApertura),
            },
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            updatedBy: uid,
        });

        transaction.set(lockRef, {
            uid,
            tipo: 'jefe',
            servicioId: servicioRef.id,
            createdAt: serverTimestamp(),
        });
    });

    return servicioRef.id;
}

/**
 * Obtener el servicio activo de Jefe Operativo para el usuario actual
 */
export async function getServicioJefeOperativoActivo(uid: string): Promise<ServicioJefeOperativo | null> {
    if (!uid) return null;

    const q = query(
        collection(db, 'servicios_jefe_operativo'),
        where('estado', '==', 'abierto'),
        where('uidJefe', '==', uid),
        orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) return null;

    const doc = snapshot.docs[0];
    const data = doc.data();

    return normalizarServicioJefe(doc.id, data);
}

/**
 * Obtener todos los servicios cerrados del Jefe Operativo
 */
export async function getHistorialJefeOperativo(uid: string): Promise<ServicioJefeOperativo[]> {
    if (!uid) return [];

    const q = query(
        collection(db, 'servicios_jefe_operativo'),
        where('uidJefe', '==', uid),
        orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => normalizarServicioJefe(doc.id, doc.data() as Record<string, any>));
}

/**
 * Obtener TODOS los servicios de Jefe Operativo (Vista Admin)
 */
export async function getAllServiciosJefeOperativoAdmin(): Promise<ServicioJefeOperativo[]> {
    const q = query(
        collection(db, 'servicios_jefe_operativo'),
        orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => normalizarServicioJefe(doc.id, doc.data() as Record<string, any>));
}

/**
 * Obtener un servicio específico por ID
 */
export async function getServicioJefeOperativoById(id: string): Promise<ServicioJefeOperativo | null> {
    const docRef = doc(db, 'servicios_jefe_operativo', id);
    const snap = await getDoc(docRef);

    if (!snap.exists()) return null;

    const data = snap.data() as Record<string, any>;
    return normalizarServicioJefe(snap.id, data);
}

/**
 * Cerrar servicio de Jefe Operativo
 */
export async function cerrarServicioJefeOperativo(servicioId: string, cierreData: CierreServicioExtra): Promise<void> {
    const docRef = doc(db, 'servicios_jefe_operativo', servicioId);
    const expiresAt = new Date(cierreData.fechaCierre.getTime() + 9 * 24 * 60 * 60 * 1000);
    const uid = auth.currentUser?.uid ?? '';

    await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(docRef);
        if (!snapshot.exists()) {
            throw new Error('Servicio no encontrado.');
        }

        const servicio = snapshot.data() as { estado?: string; uidJefe?: string };
        if (servicio.estado === 'cerrado') {
            throw new Error('El servicio ya está cerrado.');
        }

        const lockRef = servicio.uidJefe
            ? doc(db, 'servicios_activos', `${servicio.uidJefe}_jefe`)
            : null;
        const lockSnapshot = lockRef ? await transaction.get(lockRef) : null;

        transaction.update(docRef, {
            estado: 'cerrado',
            cierre: {
                ...cierreData,
                fechaCierre: Timestamp.fromDate(cierreData.fechaCierre),
                generatedAt: serverTimestamp(),
            },
            updatedAt: serverTimestamp(),
            updatedBy: uid,
            expiresAt: Timestamp.fromDate(expiresAt),
        });

        if (lockRef && lockSnapshot?.exists() && lockSnapshot.data().servicioId === servicioId) {
            transaction.delete(lockRef);
        }
    });
}

/**
 * Registrar la incorporación de un funcionario que faltó a la formación
 */
export async function registrarIncorporacionJefeOperativo(
    servicioId: string,
    gradoNombre: string,
    horaIncorporacion: string
): Promise<void> {
    const docRef = doc(db, 'servicios_jefe_operativo', servicioId);

    await withFirestoreRetry(async () => {
        await runTransaction(db, async (tx) => {
            const snap = await tx.get(docRef);
            if (!snap.exists()) throw new Error('Servicio no encontrado');

            const data = snap.data();
            if (data.estado !== 'abierto') {
                throw new Error('El servicio está cerrado y no admite modificaciones.');
            }

            const listaFaltos = data.apertura?.novedadesFormacion?.personalFalto?.lista || [];

            const nuevaLista = listaFaltos.map((p: any) => {
                if (p.gradoNombre === gradoNombre) {
                    return { ...p, horaIncorporacion };
                }
                return p;
            });

            tx.update(docRef, {
                'apertura.novedadesFormacion.personalFalto.lista': nuevaLista,
                updatedAt: serverTimestamp(),
                updatedBy: auth.currentUser?.uid ?? '',
            });
        });
    });
}

/**
 * Fallback manual (Spark): elimina servicios de Jefe Operativo cerrados expirados.
 */
export async function cleanupExpiredJefeOperativoServicios(): Promise<number> {
    const ahora = Timestamp.now();

    const q = query(
        collection(db, 'servicios_jefe_operativo'),
        where('estado', '==', 'cerrado'),
        where('expiresAt', '<', ahora)
    );

    const snapshot = await getDocs(q);
    const deletePromises = snapshot.docs.map((docSnap) => deleteDoc(docSnap.ref));
    await Promise.all(deletePromises);

    return deletePromises.length;
}
