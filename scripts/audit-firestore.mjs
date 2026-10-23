import { auth, db } from './lib/admin.mjs';

function toDate(value) {
    if (!value) return null;
    if (typeof value.toDate === 'function') return value.toDate();
    if (value instanceof Date) return value;
    return null;
}

const authUsers = [];
let pageToken;
do {
    const page = await auth.listUsers(1000, pageToken);
    authUsers.push(...page.users);
    pageToken = page.pageToken;
} while (pageToken);

const profiles = await db.collection('users').get();
const profileUids = new Set(profiles.docs.map((doc) => doc.id));
const authUids = new Set(authUsers.map((user) => user.uid));

const sinPerfil = authUsers.filter((user) => !profileUids.has(user.uid));
const sinAuth = [...profileUids].filter((uid) => !authUids.has(uid));

console.log(`Usuarios Auth: ${authUsers.length}`);
console.log(`Perfiles Firestore: ${profiles.size}`);
console.log(`Cuentas Auth sin perfil: ${sinPerfil.length}`);
for (const user of sinPerfil) console.log(`  - ${user.uid} ${user.email ?? ''}`);
console.log(`Perfiles sin cuenta Auth: ${sinAuth.length}`);
for (const uid of sinAuth) console.log(`  - ${uid}`);

const abiertos = new Map();
for (const [collection, uidField, tipo] of [
    ['servicios_supervisor', 'uidSupervisor', 'supervisor'],
    ['servicios_jefe_operativo', 'uidJefe', 'jefe'],
]) {
    const snapshot = await db.collection(collection).where('estado', '==', 'abierto').get();
    for (const doc of snapshot.docs) {
        const uid = doc.data()[uidField];
        if (!uid) continue;
        if (!abiertos.has(uid)) abiertos.set(uid, []);
        abiertos.get(uid).push(`${tipo}:${doc.id}`);
    }
}

const duplicados = [...abiertos.entries()].filter(([, servicios]) => servicios.length > 1);
console.log(`Usuarios con más de un servicio abierto: ${duplicados.length}`);
for (const [uid, servicios] of duplicados) console.log(`  - ${uid}: ${servicios.join(', ')}`);

const cerrados = await db.collection('servicios_supervisor').where('estado', '==', 'cerrado').get();
const incompletos = cerrados.docs.filter((doc) => {
    const cierre = doc.data().cierre;
    return !cierre || !toDate(cierre.fechaHora) || !cierre.entregaServicio;
});
console.log(`Servicios de supervisor cerrados con cierre incompleto: ${incompletos.length}`);
for (const doc of incompletos) console.log(`  - ${doc.id}`);
