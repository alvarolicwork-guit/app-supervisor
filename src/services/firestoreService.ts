import { db, auth } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';

// Interfaz para tipar los datos que vienen del formulario
interface DatosUnidad {
    unidad: string;
    fechaHoraControl: string; // Nueva fecha manual/automática
    personal: {
        cantidad: number;
        estado: 'sin' | 'con';
        detalles: {
            faltantes: string[];
            abandono: string[];
            arrestados: string[];
            permisos: string[];
        }
    };
    servicio: {
        rutina: number;
        relevantes: any[];
    };
}

export async function guardarRegistroUnidad(data: DatosUnidad, supervisorInfo: { id: string, nombre: string } | null) {
    try {
        // Asegurar autenticación (Anónima si no hay usuario)
        if (!auth.currentUser) {
            try {
                await signInAnonymously(auth);
            } catch (authError: any) {
                console.error("Error Auth Anónimo:", authError);
                if (authError.code === 'auth/admin-restricted-operation' || authError.code === 'auth/operation-not-allowed') {
                    throw new Error('⚠️ Debes habilitar "Anónimo" en Firebase Console -> Authentication -> Sign-in method.');
                }
                throw authError; // Otros errores de red o config
            }
        }

        const docRef = await addDoc(collection(db, "registros_unidades"), {
            ...data,
            fechaRegistro: serverTimestamp(), // Marca de tiempo del servidor
            supervisor: supervisorInfo || { id: 'anonimo', nombre: 'No Identificado' },
            deviceInfo: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
        });
        console.log("Documento escrito con ID: ", docRef.id);
        return docRef.id;
    } catch (e) {
        console.error("Error al guardar en Firestore: ", e);
        throw e;
    }
}
