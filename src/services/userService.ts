import { auth, db, firebaseConfig } from '@/lib/firebase';
import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    collection,
    query,
    where,
    getDocs,
    orderBy,
    runTransaction,
    serverTimestamp,
} from 'firebase/firestore';
import { initializeApp, deleteApp, getApp } from 'firebase/app';
import {
    getAuth,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    signOut,
} from 'firebase/auth';

export type UserRole = 'admin' | 'supervisor';

export interface UserProfile {
    uid: string;
    email: string;
    role: UserRole;
    grado?: string;
    nombreCompleto?: string;
    celular?: string;
    createdAt: Date;
    isActive: boolean;
}

export const userService = {
    /**
     * Obtener perfil de usuario desde Firestore
     */
    async getUserProfile(uid: string): Promise<UserProfile | null> {
        const docRef = doc(db, 'users', uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            return {
                ...data,
                createdAt: data.createdAt?.toDate() || new Date(),
            } as UserProfile;
        }
        return null;
    },

    /**
     * Crear o actualizar perfil de usuario (Solo Admin o First Run)
     */
    async createUserProfile(uid: string, data: Partial<UserProfile>) {
        const docRef = doc(db, 'users', uid);
        await setDoc(docRef, {
            ...data,
            uid,
            createdAt: new Date(),
            isActive: true
        }, { merge: true });
    },

    /**
     * Activar o desactivar un perfil (Solo Admin)
     */
    async setUserActive(uid: string, isActive: boolean): Promise<void> {
        await updateDoc(doc(db, 'users', uid), { isActive });
    },

    /**
     * Actualizar datos editables del perfil (Solo Admin)
     */
    async updateSupervisorProfile(
        uid: string,
        data: { grado?: string; nombreCompleto?: string; celular?: string }
    ): Promise<void> {
        await updateDoc(doc(db, 'users', uid), data);
    },

    /**
     * Enviar correo de restablecimiento al usuario.
     * El enlace llega al correo registrado, no al administrador.
     */
    async sendPasswordReset(email: string): Promise<void> {
        await sendPasswordResetEmail(auth, email);
    },

    /**
     * Listar todos los usuarios (Solo Admin)
     */
    async getUsuarios(): Promise<UserProfile[]> {
        const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                ...data,
                createdAt: data.createdAt?.toDate() || new Date(),
            } as UserProfile;
        });
    },

    /**
     * Listar supervisores (compatibilidad)
     */
    async getSupervisores(): Promise<UserProfile[]> {
        const q = query(
            collection(db, 'users'),
            where('role', '==', 'supervisor'),
            orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                ...data,
                createdAt: data.createdAt?.toDate() || new Date(),
            } as UserProfile;
        });
    },

    /**
     * Crear usuario desde Admin (sin cerrar la sesión actual).
     * El rol se decide explícitamente; por defecto supervisor.
     */
    async createUser(
        email: string,
        password: string,
        datosPerfil: Partial<UserProfile>,
        role: UserRole = 'supervisor'
    ): Promise<void> {
        // 1. Inicializar App secundaria para no perder sesión del Admin
        const SECONDARY_APP_NAME = 'secondaryAuthApp';
        let secondaryApp;

        try {
            secondaryApp = getApp(SECONDARY_APP_NAME);
        } catch {
            secondaryApp = initializeApp(firebaseConfig, SECONDARY_APP_NAME);
        }

        const secondaryAuth = getAuth(secondaryApp);

        try {
            // 2. Crear usuario en Auth
            const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
            const newUser = userCredential.user;

            // 3. Crear perfil en Firestore
            // IMPORTANTE: Escribir en base de datos PRINCIPAL (db importado)
            await this.createUserProfile(newUser.uid, {
                ...datosPerfil,
                email,
                role,
                uid: newUser.uid
            });

            // 4. Cerrar sesión en app secundaria inmediatamente
            await signOut(secondaryAuth);

        } catch (error) {
            console.error("Error creando supervisor:", error);
            throw error;
        } finally {
            // 5. Eliminar app secundaria
            if (secondaryApp) {
                await deleteApp(secondaryApp);
            }
        }
    },

    /**
     * Archiva el perfil de un usuario y lo elimina de users/.
     * No elimina la cuenta de Authentication; para eso existe scripts/delete-user.mjs.
     */
    async archiveUserProfile(uid: string, motivo: string): Promise<void> {
        const actor = auth.currentUser;
        if (!actor) throw new Error('Sesión no válida.');
        if (actor.uid === uid) throw new Error('No puedes archivar tu propio perfil.');

        const motivoLimpio = motivo.trim();
        if (motivoLimpio.length < 3) {
            throw new Error('Indica un motivo de al menos 3 caracteres.');
        }

        const sourceRef = doc(db, 'users', uid);
        const archiveRef = doc(db, 'users_archivados', uid);
        const supervisorLockRef = doc(db, 'servicios_activos', `${uid}_supervisor`);
        const jefeLockRef = doc(db, 'servicios_activos', `${uid}_jefe`);
        const legacyLockRef = doc(db, 'servicios_activos', uid);
        const auditRef = doc(collection(db, 'auditoria'));

        await runTransaction(db, async (transaction) => {
            const sourceSnapshot = await transaction.get(sourceRef);
            if (!sourceSnapshot.exists()) throw new Error('El usuario ya no existe.');

            const archiveSnapshot = await transaction.get(archiveRef);
            if (archiveSnapshot.exists()) {
                throw new Error('Ya existe un perfil archivado con ese identificador.');
            }

            const supervisorLock = await transaction.get(supervisorLockRef);
            const jefeLock = await transaction.get(jefeLockRef);
            const legacyLock = await transaction.get(legacyLockRef);
            if (supervisorLock.exists() || jefeLock.exists() || legacyLock.exists()) {
                throw new Error(
                    'El usuario tiene un servicio activo. Ciérralo antes de archivar el perfil.'
                );
            }

            transaction.set(archiveRef, {
                ...sourceSnapshot.data(),
                archivedAt: serverTimestamp(),
                archivedBy: actor.uid,
                motivo: motivoLimpio,
            });

            transaction.set(auditRef, {
                accion: 'archivar-usuario',
                uid,
                actorUid: actor.uid,
                motivo: motivoLimpio,
                creadoEn: serverTimestamp(),
            });

            transaction.delete(sourceRef);
        });
    }
};
