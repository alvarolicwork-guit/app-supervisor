import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularNovedadesPersonal } from '../src/utils/resumen';

test('suma faltas, abandonos, arrestos y permisos de todas las unidades', () => {
    const registros = [
        {
            personal: {
                detalles: {
                    faltantes: ['Sgto. Juan Perez'],
                    abandono: ['Cabo Maria Lopez'],
                    arrestados: ['Sgto. Pedro Mamani'],
                    permisos: [],
                },
            },
        },
        {
            personal: {
                detalles: {
                    faltantes: [],
                    abandono: ['Agente Jose Quispe'],
                    arrestados: [],
                    permisos: ['Sgto. Ana Rojas'],
                },
            },
        },
    ];

    assert.deepEqual(calcularNovedadesPersonal(registros), {
        faltas: 1,
        abandonos: 2,
        arrestos: 1,
        permisos: 1,
    });
});

test('tolera registros sin detalle de personal', () => {
    assert.deepEqual(calcularNovedadesPersonal([{}, { personal: {} }]), {
        faltas: 0,
        abandonos: 0,
        arrestos: 0,
        permisos: 0,
    });
});
