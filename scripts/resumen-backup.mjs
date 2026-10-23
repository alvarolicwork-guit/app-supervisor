import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const folder = process.argv[2];
if (!folder) {
    console.error('Uso: node scripts/resumen-backup.mjs backups/<carpeta>');
    process.exit(1);
}

function load(name) {
    try {
        return JSON.parse(readFileSync(resolve(folder, `${name}.json`), 'utf8'));
    } catch {
        return [];
    }
}

function dateOf(value) {
    if (value && value.__type === 'timestamp') return new Date(value.iso);
    return null;
}

function esFormoInvalido(value) {
    return value === null || (typeof value === 'number' && Number.isNaN(value));
}

const supervisor = load('servicios_supervisor');
const jefe = load('servicios_jefe_operativo');
const locks = load('servicios_activos');
const users = load('users');
const audit = load('auditoria');

function resumenServicios(nombre, docs, uidField) {
    const abiertos = docs.filter((d) => d.data.estado === 'abierto');
    const cerrados = docs.filter((d) => d.data.estado === 'cerrado');
    const sinAuditoria = docs.filter((d) => !d.data.updatedAt || !d.data.updatedBy);
    const porUid = new Map();
    for (const doc of abiertos) {
        const uid = doc.data[uidField] || 'sin-uid';
        porUid.set(uid, (porUid.get(uid) || 0) + 1);
    }
    const duplicados = [...porUid.entries()].filter(([, count]) => count > 1);

    console.log(`\n${nombre}`);
    console.log(`  total: ${docs.length} | abiertos: ${abiertos.length} | cerrados: ${cerrados.length}`);
    console.log(`  sin updatedAt/updatedBy: ${sinAuditoria.length}`);
    console.log(`  usuarios con mas de un abierto: ${duplicados.length}`);
    for (const [uid, count] of duplicados) console.log(`    - ${uid}: ${count}`);
    return { docs, abiertos, cerrados, sinAuditoria };
}

console.log(`Backup: ${folder}`);
console.log(`Usuarios: ${users.length} | Bloqueos activos: ${locks.length} | Auditoria: ${audit.length}`);

const sup = resumenServicios('Servicios de supervisor', supervisor, 'uidSupervisor');
const jef = resumenServicios('Servicios de Jefe Operativo', jefe, 'uidJefe');

const expiresIncorrectos = sup.cerrados.filter((doc) => {
    const cierre = dateOf(doc.data.cierre?.fechaHora);
    const expires = dateOf(doc.data.expiresAt);
    if (!cierre) return false;
    if (!expires) return true;
    const esperado = new Date(cierre.getTime() + 9 * 24 * 60 * 60 * 1000);
    return Math.abs(expires.getTime() - esperado.getTime()) > 1000;
});
console.log(`\nSupervisor cerrados con expiresAt incorrecto o ausente: ${expiresIncorrectos.length}`);

const cierresIncompletosSup = sup.cerrados.filter(
    (doc) => !doc.data.cierre || !doc.data.cierre.entregaServicio || !dateOf(doc.data.cierre.fechaHora)
);
const cierresIncompletosJefe = jef.cerrados.filter(
    (doc) => !doc.data.cierre || !dateOf(doc.data.cierre.fechaCierre)
);
console.log(`Cierres incompletos: supervisor ${cierresIncompletosSup.length}, jefe ${cierresIncompletosJefe.length}`);

const formoJefe = jef.docs.filter((doc) => esFormoInvalido(doc.data.apertura?.novedadesFormacion?.personalFormo));
const formoSupervisor = sup.docs.filter((doc) =>
    (doc.data.serviciosExtraordinarios || []).some((extra) =>
        esFormoInvalido(extra?.apertura?.novedadesFormacion?.personalFormo)
    )
);
console.log(`personalFormo invalido: jefe ${formoJefe.length}, servicios extra de supervisor ${formoSupervisor.length}`);

const abiertosSinLock = [...sup.abiertos, ...jef.abiertos].filter((doc) => {
    const uid = doc.data.uidSupervisor || doc.data.uidJefe;
    return uid && !locks.some((lock) => lock.id === uid);
});
console.log(`Servicios abiertos sin bloqueo: ${abiertosSinLock.length}`);
