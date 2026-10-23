import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    normalizarServicioExtra,
    normalizarServicioSupervisor,
    toDateSafe,
} from '../src/services/normalizers';

function timestamp(iso: string) {
    return { toDate: () => new Date(iso) };
}

test('normalizarServicioSupervisor conserva el cierre completo', () => {
    const servicio = normalizarServicioSupervisor('svc-1', {
        uidSupervisor: 'uid-1',
        estado: 'cerrado',
        apertura: {
            nroMemorandum: 'MEM-1',
            fechaHora: timestamp('2026-01-10T08:00:00.000Z'),
            supervisorActual: { grado: 'Tcnl.', nombreCompleto: 'Actual' },
            supervisorRelevo: { grado: 'My.', nombreCompleto: 'Relevo' },
        },
        controlInstalaciones: [{ unidad: 'FELCC' }],
        serviciosExtraordinarios: [],
        cierre: {
            fechaHora: timestamp('2026-01-11T08:00:00.000Z'),
            entregaServicio: 'Sgto. Entrega',
            casosRutinarios: 4,
            casosRelevantes: 2,
            informeFinal: 'INFORME COMPLETO',
        },
        createdAt: timestamp('2026-01-10T08:00:00.000Z'),
        expiresAt: timestamp('2026-01-20T08:00:00.000Z'),
    });

    assert.equal(servicio.cierre?.informeFinal, 'INFORME COMPLETO');
    assert.equal(servicio.cierre?.casosRutinarios, 4);
    assert.equal(servicio.cierre?.casosRelevantes, 2);
    assert.equal(servicio.cierre?.entregaServicio, 'Sgto. Entrega');
    assert.ok(servicio.cierre?.fechaHora instanceof Date);
    assert.ok(servicio.apertura.fechaHora instanceof Date);
    assert.equal(servicio.apertura.nroMemorandum, 'MEM-1');
});

test('normalizarServicioSupervisor tolera createdAt nulo y datos faltantes', () => {
    const servicio = normalizarServicioSupervisor('svc-2', {
        uidSupervisor: 'uid-1',
        estado: 'abierto',
        apertura: { nroMemorandum: 'MEM-2', fechaHora: timestamp('2026-02-01T08:00:00.000Z') },
        createdAt: null,
        expiresAt: null,
    });

    assert.equal(servicio.estado, 'abierto');
    assert.ok(servicio.createdAt instanceof Date);
    assert.ok(servicio.expiresAt instanceof Date);
    assert.deepEqual(servicio.controlInstalaciones, []);
    assert.deepEqual(servicio.serviciosExtraordinarios, []);
    assert.equal(servicio.cierre, undefined);
});

test('normalizarServicioExtra convierte fechas de Firestore y conserva el cierre', () => {
    const extra = normalizarServicioExtra({
        id: 'extra-1',
        estado: 'cerrado',
        apertura: {
            nroPlanOperaciones: '1576/2025',
            tipoServicio: 'OPERATIVO',
            fechaApertura: timestamp('2026-03-01T10:00:00.000Z'),
            novedadesFormacion: {
                personalFormo: 12,
                personalFalto: { cantidad: 1, lista: [{ gradoNombre: 'Sgto. Falta' }] },
                personalPermiso: { cantidad: 0, lista: [] },
                observacionesUniforme: [],
            },
        },
        cierre: {
            fechaCierre: timestamp('2026-03-01T20:00:00.000Z'),
            personalFaltoServicio: [],
            novedades: {
                tipo: 'con',
                casos: [{ id: 'c1', tipo: 'Robo', hora: '11:00', lugar: 'X', encargado: 'Y', detalle: 'D' }],
            },
        },
    });

    if (!extra) throw new Error('El servicio extraordinario no se normalizó.');

    assert.ok(extra.apertura.fechaApertura instanceof Date);
    assert.ok(extra.cierre?.fechaCierre instanceof Date);
    assert.equal(extra.apertura.novedadesFormacion.personalFormo, 12);
    assert.equal(extra.cierre?.novedades.casos?.length, 1);
});

test('toDateSafe devuelve el fallback ante valores inválidos', () => {
    const fallback = new Date('2026-01-01T00:00:00.000Z');
    assert.equal(toDateSafe(null, fallback).toISOString(), fallback.toISOString());
    assert.equal(toDateSafe('no-es-fecha', fallback).toISOString(), fallback.toISOString());
});
