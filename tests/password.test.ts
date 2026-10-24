import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generarPasswordSegura, validarPasswordSegura } from '../src/utils/password';

test('genera contraseñas de la longitud pedida y con todas las categorías', () => {
    const password = generarPasswordSegura(16);
    assert.equal(password.length, 16);
    assert.deepEqual(validarPasswordSegura(password), []);
});

test('rechaza contraseñas débiles', () => {
    assert.ok(validarPasswordSegura('corta').length > 0);
    assert.ok(validarPasswordSegura('sinmayusculas123!').length > 0);
    assert.ok(validarPasswordSegura('SINMINUSCULAS123!').length > 0);
});
