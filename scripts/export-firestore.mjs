import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { db } from './lib/admin.mjs';

const COLLECTIONS = [
    'users',
    'users_archivados',
    'servicios_supervisor',
    'servicios_jefe_operativo',
    'servicios_activos',
    'servicios_supervisor_archivados',
    'servicios_jefe_operativo_archivados',
    'auditoria',
];

function serialize(value) {
    if (value && typeof value.toDate === 'function') {
        return { __type: 'timestamp', iso: value.toDate().toISOString() };
    }
    if (Array.isArray(value)) return value.map(serialize);
    if (value && typeof value === 'object') {
        return Object.fromEntries(
            Object.entries(value).map(([key, nested]) => [key, serialize(nested)])
        );
    }
    return value;
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const outputDir = resolve(process.cwd(), 'backups', stamp);
mkdirSync(outputDir, { recursive: true });

console.log(`Backup local en: ${outputDir}`);

for (const collectionName of COLLECTIONS) {
    const snapshot = await db.collection(collectionName).get();
    const documents = snapshot.docs.map((document) => ({
        id: document.id,
        data: serialize(document.data()),
    }));

    writeFileSync(
        resolve(outputDir, `${collectionName}.json`),
        JSON.stringify(documents, null, 2),
        'utf8'
    );

    console.log(`  ${collectionName}: ${documents.length} documento(s)`);
}

console.log('Backup completado. No se modificó Firestore.');
