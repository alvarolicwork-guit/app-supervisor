import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizarNombre } from '../src/utils/text';

test('normaliza grados y nombres en minúsculas', () => {
    assert.equal(normalizarNombre('sgto. JUAN perez'), 'Sgto. Juan Perez');
    assert.equal(normalizarNombre('cap. alvaro hans licona quintanilla'), 'Cap. Alvaro Hans Licona Quintanilla');
});

test('conserva acrónimos institucionales', () => {
    assert.equal(normalizarNombre('tcnl. DEAP alberto suarez'), 'Tcnl. DEAP Alberto Suarez');
    assert.equal(normalizarNombre('my. FELCC maria perez'), 'My. FELCC Maria Perez');
});

test('respeta partículas y nombres compuestos', () => {
    assert.equal(normalizarNombre('maria de la cruz'), 'Maria de la Cruz');
    assert.equal(normalizarNombre('juan-perez mamani'), 'Juan-Perez Mamani');
});

test('mantiene N.N. y recorta espacios', () => {
    assert.equal(normalizarNombre('  N.N.   '), 'N.N.');
});
