import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    CASOS_RUTINA_DEFECTO,
    lineasCasosRutina,
    normalizarCasosRutina,
    totalCasosRutina,
} from '../src/utils/casosRutina';

test('normaliza negativos y valores faltantes a cero', () => {
    const casos = normalizarCasosRutina({
        decsInstalados: 3,
        infraccionesTransito: -1,
        delitosAtendidos: 2,
    });

    assert.equal(casos.decsInstalados, 3);
    assert.equal(casos.infraccionesTransito, 0);
    assert.equal(casos.delitosAtendidos, 2);
    assert.equal(casos.violenciaFamiliar, 0);
});

test('omite las categorías en cero de los reportes', () => {
    const lineas = lineasCasosRutina({
        ...CASOS_RUTINA_DEFECTO,
        decsInstalados: 4,
        auxilioPersonas: 2,
    });

    assert.equal(lineas.length, 2);
    assert.ok(lineas.some((linea) => linea.includes('DECs instalados')));
    assert.ok(lineas.some((linea) => linea.includes('Auxilio a personas')));
});

test('suma el total de casos de rutina', () => {
    assert.equal(
        totalCasosRutina({
            ...CASOS_RUTINA_DEFECTO,
            decsInstalados: 1,
            infraccionesLey259: 2,
            violenciaFamiliar: 3,
        }),
        6
    );
});
