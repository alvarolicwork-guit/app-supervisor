/**
 * Crea el primer administrador de la aplicación usando Firebase Admin SDK.
 *
 * Requisitos:
 *   - GOOGLE_APPLICATION_CREDENTIALS apuntando a una cuenta de servicio con
 *     permisos de Firebase Auth y Firestore.
 *   - Variables ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NOMBRE y ADMIN_GRADO.
 *
 * Uso:
 *   $env:GOOGLE_APPLICATION_CREDENTIALS="C:\ruta\cuenta-servicio.json"
 *   $env:ADMIN_EMAIL="admin@ejemplo.com"
 *   $env:ADMIN_PASSWORD="una-clave-segura"
 *   $env:ADMIN_NOMBRE="Nombre Completo"
 *   $env:ADMIN_GRADO="Tcnl."
 *   node scripts/create-admin.mjs
 *
 * No imprime la contraseña ni el contenido de la cuenta de servicio.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import dotenv from 'dotenv';
import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const projectId =
  process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

const email = process.env.ADMIN_EMAIL?.trim();
const password = process.env.ADMIN_PASSWORD;
const nombreCompleto = process.env.ADMIN_NOMBRE?.trim();
const grado = process.env.ADMIN_GRADO?.trim() || 'Admin';
const force = process.argv.includes('--force');

function fail(message) {
  console.error(`Error: ${message}`);
  process.exitCode = 1;
}

if (!projectId) {
  fail('Falta FIREBASE_PROJECT_ID o NEXT_PUBLIC_FIREBASE_PROJECT_ID.');
} else if (!email || !password || !nombreCompleto) {
  fail('Define ADMIN_EMAIL, ADMIN_PASSWORD y ADMIN_NOMBRE.');
} else if (password.length < 6) {
  fail('ADMIN_PASSWORD debe tener al menos 6 caracteres.');
} else if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  fail(
    'Define GOOGLE_APPLICATION_CREDENTIALS con la ruta a la cuenta de servicio (fuera del repositorio).'
  );
} else {
  try {
    // Falla temprano si el archivo de credenciales no es legible.
    readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS);
  } catch {
    fail('No se pudo leer el archivo indicado en GOOGLE_APPLICATION_CREDENTIALS.');
  }
}

if (process.exitCode) {
  process.exit(process.exitCode);
}

const app = initializeApp({
  credential: applicationDefault(),
  projectId,
});

const auth = getAuth(app);
const db = getFirestore(app);

try {
  const existingAdmins = await db
    .collection('users')
    .where('role', '==', 'admin')
    .limit(1)
    .get();

  if (!existingAdmins.empty && !force) {
    fail(
      'Ya existe un administrador. Usa --force solo si estás creando un segundo administrador de forma deliberada.'
    );
    process.exit(process.exitCode ?? 1);
  }

  const user = await auth.createUser({
    email,
    password,
    displayName: nombreCompleto,
    emailVerified: false,
  });

  try {
    await db.doc(`users/${user.uid}`).set({
      uid: user.uid,
      email,
      role: 'admin',
      grado,
      nombreCompleto,
      isActive: true,
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    // Compensación: no dejar una cuenta de Auth sin perfil.
    await auth.deleteUser(user.uid).catch(() => undefined);
    throw error;
  }

  console.log('Administrador creado correctamente.');
  console.log(`UID: ${user.uid}`);
  console.log(`Email: ${email}`);
  console.log('Ahora inicia sesión en la aplicación con esa cuenta.');
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
  process.exit(process.exitCode ?? 1);
}
