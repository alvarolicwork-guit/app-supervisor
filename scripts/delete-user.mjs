import { Timestamp } from 'firebase-admin/firestore';
import { auth, db } from './lib/admin.mjs';

const uid = process.env.USER_UID;
const email = process.env.USER_EMAIL;
const confirm = process.argv.includes('--confirm');

if (!uid && !email) {
    console.error('Define USER_UID o USER_EMAIL.');
    process.exit(1);
}

if (!confirm) {
    console.log('Dry-run: agrega --confirm para archivar el perfil y eliminar la cuenta de Auth.');
    process.exit(0);
}

const user = uid ? await auth.getUser(uid) : await auth.getUserByEmail(email);
const profileRef = db.doc(`users/${user.uid}`);
const profile = await profileRef.get();

if (profile.exists) {
    await db.doc(`users_archivados/${user.uid}`).set({
        ...profile.data(),
        archivedAt: Timestamp.now(),
        archivedBy: 'script',
    });
    await profileRef.delete();
}

await auth.deleteUser(user.uid);
console.log(`Cuenta ${user.uid} eliminada; perfil archivado si existía.`);
