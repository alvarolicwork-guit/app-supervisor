import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generarInformeTexto } from '../src/utils/reporteSupervisor';
import type { ServicioSupervisor } from '../src/services/servicioSupervisorService';

test('el informe usa el jefe operativo y las novedades reales del cierre', () => {
    const servicio = {
        id: 'svc-1',
        uidSupervisor: 'uid-1',
        estado: 'cerrado',
        apertura: {
            nroMemorandum: 'MEM-1',
            fechaHora: new Date('2026-01-10T08:00:00.000Z'),
            supervisorActual: { grado: 'Tcnl.', nombreCompleto: 'Supervisor Actual' },
            supervisorRelevo: { grado: 'My.', nombreCompleto: 'Supervisor Relevo' },
        },
        controlInstalaciones: [],
        serviciosExtraordinarios: [
            {
                id: 'extra-1',
                estado: 'cerrado',
                apertura: {
                    nroPlanOperaciones: '1576/2025',
                    tipoServicio: 'OPERATIVO',
                    personalContemplado: 10,
                    motosContempladas: 2,
                    vehiculosContemplados: 1,
                    supervisorGeneral: 'Tcnl. Supervisor',
                    jefeOperativo: 'Tcnl. Juan Perez',
                    lugarFormacion: 'Patio',
                    horaFormacion: '10:00',
                    horaInstalacion: '10:15',
                    fechaApertura: new Date('2026-01-10T10:00:00.000Z'),
                    novedadesFormacion: {
                        personalFormo: 10,
                        personalFalto: { cantidad: 0, lista: [] },
                        personalPermiso: { cantidad: 0, lista: [] },
                        observacionesUniforme: [],
                    },
                },
                cierre: {
                    fechaCierre: new Date('2026-01-10T20:00:00.000Z'),
                    personalFaltoServicio: [],
                    novedades: {
                        tipo: 'con',
                        casos: [
                            {
                                id: 'c1',
                                tipo: 'Robo',
                                hora: '11:00',
                                lugar: 'Mercado',
                                encargado: 'Sgto. Encargado',
                                detalle: 'Se recuperó el objeto.',
                            },
                        ],
                        observaciones: 'Sin novedad adicional.',
                    },
                },
            },
        ],
        cierre: {
            fechaHora: new Date('2026-01-11T08:00:00.000Z'),
            entregaServicio: 'Sgto. Entrega',
            casosRutinarios: 1,
            casosRelevantes: 1,
            informeFinal: 'INFORME',
        },
        createdAt: new Date('2026-01-10T08:00:00.000Z'),
        expiresAt: new Date('2026-01-20T08:00:00.000Z'),
    } as unknown as ServicioSupervisor;

    const informe = generarInformeTexto(servicio, {
        entregaServicio: 'Sgto. Entrega',
        casosRutinarios: 1,
        casosRelevantes: 1,
    });

    assert.ok(informe.includes('Tcnl. Juan Perez'));
    assert.ok(!informe.includes('undefined undefined'));
    assert.ok(informe.includes('Robo'));
    assert.ok(informe.includes('Se recuperó el objeto.'));
    assert.ok(informe.includes('Observaciones: Sin novedad adicional.'));
});
