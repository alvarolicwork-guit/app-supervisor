import { readFile } from 'node:fs/promises';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
} from 'firebase/firestore';

const projectId = 'registro-de-supervisor-rules-test';

const nowTs = Timestamp.fromDate(new Date());
const laterTs = Timestamp.fromDate(new Date(Date.now() + 60_000));

const adminUid = 'admin_1';
const supervisorUid = 'supervisor_1';
const otherSupervisorUid = 'supervisor_2';

let failed = 0;

async function check(name, fn) {
  try {
    await fn();
    console.log(`PASS: ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL: ${name}`);
    console.error(error instanceof Error ? error.message : String(error));
  }
}

const rules = await readFile('firestore.rules', 'utf8');

const testEnv = await initializeTestEnvironment({
  projectId,
  firestore: {
    rules,
  },
});

await testEnv.withSecurityRulesDisabled(async (context) => {
  const db = context.firestore();

  await setDoc(doc(db, 'users', adminUid), {
    uid: adminUid,
    email: 'admin@sistema.com',
    role: 'admin',
    isActive: true,
    createdAt: nowTs,
  });

  await setDoc(doc(db, 'users', supervisorUid), {
    uid: supervisorUid,
    email: 'supervisor@sistema.com',
    role: 'supervisor',
    isActive: true,
    createdAt: nowTs,
  });

  await setDoc(doc(db, 'users', otherSupervisorUid), {
    uid: otherSupervisorUid,
    email: 'otro@sistema.com',
    role: 'supervisor',
    isActive: true,
    createdAt: nowTs,
  });

  await setDoc(doc(db, 'servicios_supervisor', 'svc_own'), {
    uidSupervisor: supervisorUid,
    estado: 'abierto',
    apertura: {
      nroMemorandum: 'MEM-001',
      fechaHora: nowTs,
      supervisorActual: { grado: 'Sgto.', nombreCompleto: 'Supervisor Uno' },
      supervisorRelevo: { grado: 'Sgto.', nombreCompleto: 'Supervisor Relevo' },
    },
    controlInstalaciones: [],
    serviciosExtraordinarios: [],
    createdAt: nowTs,
    expiresAt: laterTs,
    updatedAt: nowTs,
    updatedBy: supervisorUid,
  });

  await setDoc(doc(db, 'servicios_jefe_operativo', 'jefe_own'), {
    uidJefe: supervisorUid,
    estado: 'abierto',
    apertura: {
      nroPlanOperaciones: 'PLAN-001',
      tipoServicio: 'OPERATIVO',
      fechaApertura: nowTs,
      novedadesFormacion: {
        personalFormo: 10,
        personalFalto: { cantidad: 1, lista: [{ gradoNombre: 'Sgto. Falta' }] },
        personalPermiso: { cantidad: 0, lista: [] },
        observacionesUniforme: [],
      },
    },
    createdAt: nowTs,
    updatedAt: nowTs,
    updatedBy: supervisorUid,
  });

  await setDoc(doc(db, 'servicios_supervisor', 'svc_closed'), {
    uidSupervisor: supervisorUid,
    estado: 'cerrado',
    apertura: {
      nroMemorandum: 'MEM-CERRADO',
      fechaHora: nowTs,
      supervisorActual: { grado: 'Sgto.', nombreCompleto: 'Supervisor Uno' },
      supervisorRelevo: { grado: 'Sgto.', nombreCompleto: 'Supervisor Relevo' },
    },
    controlInstalaciones: [],
    serviciosExtraordinarios: [],
    createdAt: nowTs,
    expiresAt: laterTs,
    updatedAt: nowTs,
    updatedBy: supervisorUid,
    cierre: {
      fechaHora: nowTs,
      entregaServicio: 'Sgto. Relevo',
      casosRutinarios: 1,
      casosRelevantes: 0,
      informeFinal: 'Informe cerrado',
    },
  });
});

const adminDb = testEnv.authenticatedContext(adminUid).firestore();
const supervisorDb = testEnv.authenticatedContext(supervisorUid).firestore();
const otherSupervisorDb = testEnv.authenticatedContext(otherSupervisorUid).firestore();
const unauthDb = testEnv.unauthenticatedContext().firestore();

await check('Admin can read any user profile', async () => {
  await assertSucceeds(getDoc(doc(adminDb, 'users', supervisorUid)));
});

await check('Unauthenticated user cannot read user profile', async () => {
  await assertFails(getDoc(doc(unauthDb, 'users', supervisorUid)));
});

await check('Supervisor can read own servicio_supervisor', async () => {
  await assertSucceeds(getDoc(doc(supervisorDb, 'servicios_supervisor', 'svc_own')));
});

await check('Other supervisor cannot read foreign servicio_supervisor', async () => {
  await assertFails(getDoc(doc(otherSupervisorDb, 'servicios_supervisor', 'svc_own')));
});

await check('Supervisor can create own servicio_supervisor with valid shape', async () => {
  await assertSucceeds(
    setDoc(doc(supervisorDb, 'servicios_supervisor', 'svc_new'), {
      uidSupervisor: supervisorUid,
      estado: 'abierto',
      apertura: {
        nroMemorandum: 'MEM-002',
        fechaHora: nowTs,
        supervisorActual: { grado: 'Sgto.', nombreCompleto: 'Supervisor Uno' },
        supervisorRelevo: { grado: 'Sgto.', nombreCompleto: 'Supervisor Relevo' },
      },
      controlInstalaciones: [],
      serviciosExtraordinarios: [],
      createdAt: nowTs,
      expiresAt: laterTs,
      updatedAt: nowTs,
      updatedBy: supervisorUid,
    })
  );
});

await check('Supervisor cannot create servicio_supervisor for another uid', async () => {
  await assertFails(
    setDoc(doc(supervisorDb, 'servicios_supervisor', 'svc_hijack'), {
      uidSupervisor: otherSupervisorUid,
      estado: 'abierto',
      apertura: {
        nroMemorandum: 'MEM-003',
      },
      controlInstalaciones: [],
      serviciosExtraordinarios: [],
      createdAt: nowTs,
      expiresAt: laterTs,
      updatedAt: nowTs,
      updatedBy: supervisorUid,
    })
  );
});

await check('Supervisor can update controlInstalaciones preserving immutable fields', async () => {
  await assertSucceeds(
    updateDoc(doc(supervisorDb, 'servicios_supervisor', 'svc_own'), {
      controlInstalaciones: [{ unidad: 'Alpha', fechaRegistro: nowTs }],
      serviciosExtraordinarios: [],
      apertura: {
        nroMemorandum: 'MEM-001',
        fechaHora: nowTs,
        supervisorActual: { grado: 'Sgto.', nombreCompleto: 'Supervisor Uno' },
        supervisorRelevo: { grado: 'Sgto.', nombreCompleto: 'Supervisor Relevo' },
      },
      uidSupervisor: supervisorUid,
      createdAt: nowTs,
      expiresAt: laterTs,
      estado: 'abierto',
      updatedAt: nowTs,
      updatedBy: supervisorUid,
    })
  );
});

await check('Supervisor can close own open service', async () => {
  await assertSucceeds(
    updateDoc(doc(supervisorDb, 'servicios_supervisor', 'svc_own'), {
      estado: 'cerrado',
      cierre: {
        fechaHora: nowTs,
        entregaServicio: 'Sgto. Relevo',
        casosRutinarios: 2,
        casosRelevantes: 0,
        informeFinal: 'Informe',
      },
      expiresAt: laterTs,
      updatedAt: nowTs,
      updatedBy: supervisorUid,
    })
  );
});

await check('Supervisor cannot reopen a closed service', async () => {
  await assertFails(
    updateDoc(doc(supervisorDb, 'servicios_supervisor', 'svc_closed'), {
      estado: 'abierto',
      updatedAt: nowTs,
      updatedBy: supervisorUid,
    })
  );
});

await check('Jefe Operativo can register a late arrival', async () => {
  await assertSucceeds(
    updateDoc(doc(supervisorDb, 'servicios_jefe_operativo', 'jefe_own'), {
      'apertura.novedadesFormacion.personalFalto.lista': [
        { gradoNombre: 'Sgto. Falta', horaIncorporacion: '08:30' },
      ],
      updatedAt: nowTs,
      updatedBy: supervisorUid,
    })
  );
});

await check('Jefe Operativo cannot change the plan identity', async () => {
  await assertFails(
    updateDoc(doc(supervisorDb, 'servicios_jefe_operativo', 'jefe_own'), {
      'apertura.nroPlanOperaciones': 'PLAN-ALTERADO',
      updatedAt: nowTs,
      updatedBy: supervisorUid,
    })
  );
});

await check('Supervisor can create own active service lock', async () => {
  await assertSucceeds(
    setDoc(doc(supervisorDb, 'servicios_activos', `${supervisorUid}_supervisor`), {
      uid: supervisorUid,
      tipo: 'supervisor',
      servicioId: 'svc_own',
      createdAt: nowTs,
    })
  );
});

await check('Supervisor cannot create a foreign active service lock', async () => {
  await assertFails(
    setDoc(doc(otherSupervisorDb, 'servicios_activos', `${supervisorUid}_supervisor`), {
      uid: supervisorUid,
      tipo: 'supervisor',
      servicioId: 'svc_own',
      createdAt: nowTs,
    })
  );
});

await check('Admin can delete servicio_supervisor', async () => {
  await assertSucceeds(deleteDoc(doc(adminDb, 'servicios_supervisor', 'svc_own')));
});

await testEnv.cleanup();

if (failed > 0) {
  console.error(`\nVerification finished with ${failed} failing check(s).`);
  process.exit(1);
}

console.log('\nVerification finished successfully. All checks passed.');
