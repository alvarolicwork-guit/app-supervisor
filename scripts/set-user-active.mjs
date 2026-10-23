import { auth, db } from './lib/admin.mjs';

const uid = process.env.USER_UID;
const active = process.env.USER_ACTIVE === 'true';

if (!uid) {
    console.error('Define USER_UID.');
    process.exit(1);
}

const profile = await db.doc(`users/${uid}`).get();
if (!profile.exists) {
    console.error('El perfil no existe en Firestore.');
    process.exit(1);
}

await auth.updateUser(uid, { disabled: !active });
await db.doc(`users/${uid}`).update({ isActive: active });

console.log(`Usuario ${uid} ${active ? 'activado' : 'desactivado'} en Auth y Firestore.`);
