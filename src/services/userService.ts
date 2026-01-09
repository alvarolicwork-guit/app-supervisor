import { db, auth, firebaseConfig } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { initializeApp, deleteApp, getApp, getApps } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';

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
     * Listar todos los usuarios supervisores (Solo Admin)
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
     * Crear nuevo usuario SUPERVISOR desde Admin (sin cerrar sesión actual)
     */
    async createSupervisorUser(email: string, password: string, datosPerfil: Partial<UserProfile>): Promise<void> {
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
                role: 'supervisor',
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
    }
};
