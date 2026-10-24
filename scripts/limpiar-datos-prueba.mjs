import { APPLY, auth, db } from './lib/admin.mjs';

const KEEP_ADMIN_EMAIL = process.env.KEEP_ADMIN_EMAIL || 'alvarlicquin@gmail.com';

const COLECCIONES_OPERATIVAS = [
    'users_archivados',
    'servicios_supervisor',
    'servicios_jefe_operativo',
    'servicios_supervisor_archivados',
    'servicios_jefe_operativo_archivados',
    'servicios_activos',
    'registros_unidades',
    'auditoria',
];

const perfiles = await db.collection('users').get();
const admin = perfiles.docs.find((doc) => doc.data().email === KEEP_ADMIN_EMAIL);

if (!admin) {
    console.error(`No existe el administrador ${KEEP_ADMIN_EMAIL}. Limpieza cancelada.`);
    process.exit(1);
}

const adminData = admin.data();
if (adminData.role !== 'admin' || adminData.isActive !== true) {
    console.error(`La cuenta ${KEEP_ADMIN_EMAIL} no es un administrador activo. Limpieza cancelada.`);
    process.exit(1);
}

const adminUid = admin.id;
console.log(`Administrador conservado: ${KEEP_ADMIN_EMAIL} (${adminUid})`);
console.log(`${APPLY ? 'APLICADO' : 'DRY-RUN'} limpieza de datos de desarrollo`);

for (const nombre of COLECCIONES_OPERATIVAS) {
    const snapshot = await db.collection(nombre).get();
    console.log(`  ${nombre}: ${snapshot.size} documento(s) a eliminar`);
}

const perfilesAEliminar = perfiles.docs.filter((doc) => doc.id !== adminUid);
console.log(`  users: ${perfilesAEliminar.length} perfil(es) a eliminar`);

const authUsers = await auth.listUsers();
const authAEliminar = authUsers.users.filter((user) => user.uid !== adminUid);
console.log(`  Authentication: ${authAEliminar.length} cuenta(s) a eliminar`);

if (!APPLY) {
    console.log('Ejecuta con --apply para eliminar los datos.');
    process.exit(0);
}

for (const nombre of COLECCIONES_OPERATIVAS) {
    await db.recursiveDelete(db.collection(nombre));
}

for (const perfil of perfilesAEliminar) {
    await db.recursiveDelete(perfil.ref);
}

for (const user of authAEliminar) {
    await auth.deleteUser(user.uid);
}

console.log('Limpieza completada.');
