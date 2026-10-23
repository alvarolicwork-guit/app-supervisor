import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import dotenv from 'dotenv';
import { applicationDefault, getApps, initializeApp as initializeAdminApp } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import {
    doc,
    collection,
    getFirestore,
    runTransaction,
    serverTimestamp,
    Timestamp,
} from 'firebase/firestore';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
if (!projectId || !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error('Faltan FIREBASE_PROJECT_ID o GOOGLE_APPLICATION_CREDENTIALS.');
    process.exit(1);
}

const adminApp = getApps()[0] ?? initializeAdminApp({
    credential: applicationDefault(),
    projectId,
});
const adminAuth = getAdminAuth(adminApp);
const adminDb = getAdminFirestore(adminApp);

const email = `audit-supervisor-${randomUUID()}@example.com`;
const password = `Test-${randomUUID()}`;
let uid;
let serviceId;
let jefeServiceId;

const clientApp = initializeApp(
    {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    },
    'e2e-supervisor-create'
);

try {
    const user = await adminAuth.createUser({ email, password });
    uid = user.uid;

    await adminDb.doc(`users/${uid}`).set({
        uid,
        email,
        role: 'supervisor',
        grado: 'Test',
        nombreCompleto: 'Supervisor de prueba',
        isActive: true,
        createdAt: FieldValue.serverTimestamp(),
    });

    // Simula el caso real: el usuario ya tiene un servicio de Jefe Operativo activo
    // y ahora intenta abrir un turno de supervisor. Debe recibir un mensaje claro.
    const jefeRef = adminDb.collection('servicios_jefe_operativo').doc();
    jefeServiceId = jefeRef.id;
    await jefeRef.set({
        uidJefe: uid,
        estado: 'abierto',
        apertura: {
            nroPlanOperaciones: `TEST-JEFE-${Date.now()}`,
            tipoServicio: 'Prueba',
            fechaApertura: new Date(),
        },
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: uid,
    });
    await adminDb.doc(`servicios_activos/${uid}_jefe`).set({
        uid,
        tipo: 'jefe',
        servicioId: jefeRef.id,
        createdAt: FieldValue.serverTimestamp(),
    });

    const clientAuth = getAuth(clientApp);
    const credential = await signInWithEmailAndPassword(clientAuth, email, password);
    const clientDb = getFirestore(clientApp);
    const lockRef = doc(clientDb, 'servicios_activos', `${credential.user.uid}_supervisor`);
    const jefeLockRef = doc(clientDb, 'servicios_activos', `${credential.user.uid}_jefe`);
    const legacyLockRef = doc(clientDb, 'servicios_activos', credential.user.uid);
    const serviceRef = doc(collection(clientDb, 'servicios_supervisor'));
    const ahora = new Date();
    const expiresAt = new Date(ahora.getTime() + 7 * 24 * 60 * 60 * 1000);

    let bloqueado = false;
    try {
        await runTransaction(clientDb, async (transaction) => {
            const lock = await transaction.get(lockRef);
            const jefeLock = await transaction.get(jefeLockRef);
            const legacyLock = await transaction.get(legacyLockRef);

            if (jefeLock.exists()) {
                throw new Error(
                    'Ya tienes un servicio de Jefe Operativo activo. Ciérralo antes de abrir un turno de supervisor.'
                );
            }
            if (lock.exists() || legacyLock.exists()) {
                throw new Error('Ya tienes un servicio activo. Ciérralo antes de abrir otro.');
            }

            transaction.set(serviceRef, {
                uidSupervisor: credential.user.uid,
                estado: 'abierto',
                apertura: {
                    nroMemorandum: `TEST-${Date.now()}`,
                    fechaHora: Timestamp.fromDate(ahora),
                    supervisorActual: { grado: 'Test', nombreCompleto: 'Supervisor de prueba' },
                    supervisorRelevo: { grado: 'Test', nombreCompleto: 'Relevo de prueba' },
                },
                controlInstalaciones: [],
                serviciosExtraordinarios: [],
                createdAt: serverTimestamp(),
                expiresAt: Timestamp.fromDate(expiresAt),
                updatedAt: serverTimestamp(),
                updatedBy: credential.user.uid,
            });

            transaction.set(lockRef, {
                uid: credential.user.uid,
                tipo: 'supervisor',
                servicioId: serviceRef.id,
                createdAt: serverTimestamp(),
            });
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!message.includes('Jefe Operativo')) throw error;
        bloqueado = true;
        console.log(`OK: se bloqueó con el mensaje esperado: ${message}`);
    }

    if (!bloqueado) {
        throw new Error('Se esperaba que el servicio se bloqueara por tener un Jefe Operativo activo.');
    }
} catch (error) {
    console.error('FALLO:', error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
} finally {
    if (serviceId) {
        await adminDb.doc(`servicios_supervisor/${serviceId}`).delete().catch(() => undefined);
    }
    if (jefeServiceId) {
        await adminDb.doc(`servicios_jefe_operativo/${jefeServiceId}`).delete().catch(() => undefined);
    }
    if (uid) {
        await adminDb.doc(`servicios_activos/${uid}_supervisor`).delete().catch(() => undefined);
        await adminDb.doc(`servicios_activos/${uid}_jefe`).delete().catch(() => undefined);
        await adminDb.doc(`users/${uid}`).delete().catch(() => undefined);
        await adminAuth.deleteUser(uid).catch(() => undefined);
    }
    console.log('Limpieza completada.');
}
